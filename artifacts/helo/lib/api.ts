/**
 * lib/api.ts — Client HTTP du backend Hēlo (BFF).
 *
 * Single source of truth en ligne pour le scan. Le backend orchestre :
 *   1. Cache Supabase (par barcode + trimestre)
 *   2. Lookup table products + OpenFoodFacts/Beauty fallback
 *   3. Matching déterministe sur 5000 ingrédients curés
 *   4. Fallback Claude Haiku si ingrédients inconnus et pas de danger confirmé
 *
 * La clé Anthropic n'est jamais exposée côté client.
 */

import type { Category, MatchResult, Phase, RiskLevel, Verdict } from '@/types';
import type { AlternativeProduct, OriginBadge } from '@/lib/alternatives';
import { getAppUserID } from '@/lib/purchases';

// ─── Config ──────────────────────────────────────────────────────────────────

/**
 * URL de base du backend (sans /scan). Doit pointer vers l'origine qui sert /api.
 *
 *   Dev Replit  : https://<REPLIT_DEV_DOMAIN>
 *   Prod        : https://<custom-domain>
 *
 * Si non défini → on désactive les appels remote (le mobile retombera sur le local).
 */
const API_BASE = process.env.EXPO_PUBLIC_HELO_API_URL?.replace(/\/$/, '') ?? '';

/** Secret partagé app → backend. Requis pour franchir le middleware appSecret. */
const APP_SECRET = process.env.EXPO_PUBLIC_HELO_APP_SECRET ?? '';

export const isBackendConfigured = Boolean(API_BASE && APP_SECRET);

const SCAN_TIMEOUT_MS = 15_000;
/**
 * Timeout plus court pour /alternatives : si le backend met >8s on retombe
 * sur le pipeline local. L'utilisatrice clique "Voir alternatives" puis voit
 * le spinner — au-delà de 8s elle décrocherait de toute façon.
 */
const ALTERNATIVES_TIMEOUT_MS = 8_000;

// ─── Response shape (mirror du contrat OpenAPI) ──────────────────────────────

export interface ScanMatchDto {
  ingredient_name: string;
  matched: boolean;
  matched_ingredient_name: string | null;
  risk_level: RiskLevel;
}

export interface ScanProductInfoDto {
  name: string;
  brand: string | null;
  image_url: string | null;
}

export interface ScanResponseDto {
  status: 'autorise' | 'a_eviter' | 'interdit';
  verdict: Verdict;
  glow_score: number;
  explanation: string;
  source: 'deterministic' | 'ai';
  cached: boolean;
  search_keyword: string | null;
  product: ScanProductInfoDto;
  matches: ScanMatchDto[];
}

/**
 * Task #110 — Metadata partielle remontée par le backend quand un product existe
 * sur OBF/OFF mais sans liste INCI exploitable (composition manquante).
 *
 * Le mobile bascule alors sur le flow Ghost Capture en pré-remplissant le nom +
 * la marque + la photo connus. Bien meilleur UX que "Produit non trouvé" sec.
 */
export interface PartialProductMetadata {
  barcode: string;
  name: string | null;
  brand: string | null;
  image_url: string | null;
  source: string; // 'openfoodfacts' | 'openbeautyfacts' | ...
}

export type ScanError =
  | { kind: 'not_found' }
  | { kind: 'metadata_only'; metadata: PartialProductMetadata; message?: string }
  | { kind: 'no_ingredients' }
  | { kind: 'rate_limited' }
  | { kind: 'unauthorized' }
  | { kind: 'invalid_request'; detail?: string }
  | { kind: 'network' | 'server' | 'unconfigured'; detail?: string };

export interface ScanRemoteResult {
  ok: true;
  data: ScanResponseDto;
}
export interface ScanRemoteError {
  ok: false;
  error: ScanError;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convertit ScanPhase mobile (Phase) vers le format attendu par l'API. */
function phaseToApi(phase: Phase): number | 'breastfeeding' | 'baby' {
  if (phase === 'breastfeeding' || phase === 'baby') return phase;
  return phase; // 1 | 2 | 3
}

/** Convertit un ScanMatchDto reçu du backend vers le MatchResult interne du mobile. */
export function dtoToMatchResult(m: ScanMatchDto): MatchResult {
  return {
    ingredientName: m.ingredient_name,
    matched: m.matched,
    riskLevel: m.risk_level,
    // Note: on ne ré-hydrate pas l'IngredientData complet — le backend a déjà
    // calculé le risk pour la phase, et l'UI ne consomme que riskLevel + names.
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Appelle `POST /api/scan` sur le backend.
 *
 * Renvoie `{ ok: true, data }` en cas de succès, `{ ok: false, error }` sinon.
 * Ne lance jamais — l'appelant choisit le fallback (local matching, message UI, etc.).
 */
export async function scanProductRemote(
  barcode: string,
  phase: Phase,
): Promise<ScanRemoteResult | ScanRemoteError> {
  if (!isBackendConfigured) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-helo-app-secret': APP_SECRET,
      },
      body: JSON.stringify({ barcode, trimester: phaseToApi(phase) }),
      signal: controller.signal,
    });

    if (response.status === 200) {
      const data = (await response.json()) as ScanResponseDto;
      return { ok: true, data };
    }
    if (response.status === 404) {
      // Task #110 — Distingue `product_not_found` (rien du tout) de
      // `product_metadata_only` (nom/marque/photo connus mais pas d'INCI).
      // Le second cas est précieux : on peut afficher "On a trouvé Nutella mais
      // pas sa composition — prends une photo" plutôt qu'un dead-end.
      try {
        const body = (await response.json()) as {
          error?: string;
          partial_metadata?: PartialProductMetadata;
          message?: string;
        };
        if (
          body.error === 'product_metadata_only' &&
          body.partial_metadata &&
          typeof body.partial_metadata.barcode === 'string'
        ) {
          return {
            ok: false,
            error: {
              kind: 'metadata_only',
              metadata: body.partial_metadata,
              message: body.message,
            },
          };
        }
      } catch {
        /* parse fail → fallback below */
      }
      return { ok: false, error: { kind: 'not_found' } };
    }
    if (response.status === 422) return { ok: false, error: { kind: 'no_ingredients' } };
    if (response.status === 401) return { ok: false, error: { kind: 'unauthorized' } };
    if (response.status === 429) return { ok: false, error: { kind: 'rate_limited' } };
    if (response.status === 400) {
      let detail: string | undefined;
      try {
        const body = (await response.json()) as { error?: string };
        detail = body.error;
      } catch {
        /* ignore */
      }
      return { ok: false, error: { kind: 'invalid_request', detail } };
    }
    return {
      ok: false,
      error: { kind: 'server', detail: `HTTP ${response.status}` },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: { kind: 'network', detail: msg } };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── /alternatives ───────────────────────────────────────────────────────────

/**
 * DTO renvoyé par le backend pour `GET /api/alternatives/:barcode`.
 * Forme volontairement alignée avec le type mobile `AlternativeProduct` — le
 * backend fait l'hydratation + scoring + badges pour qu'on n'ait rien à faire
 * côté client (juste un cast de `category`).
 */
export interface AlternativeProductDto {
  id: string;
  name: string;
  brand: string;
  category: string;
  barcode: string | null;
  image_url: string | null;
  description_fr: string | null;
  reason: string | null; // M3
  overall_risk: 'safe' | 'caution';
  price_range: string;
  popularity_count: number;
  origin_badge: OriginBadge;
  // v4 Lot 11 — optional purchase links (affiliate-ready)
  purchase_links?: {
    amazon?: string;
    drive?: string;
    brand?: string;
  };
}

export interface AlternativesRemoteOk {
  ok: true;
  data: AlternativeProduct[];
}
/**
 * Étape 3 — M1 : on étend ScanError avec `premium_required` pour gérer
 * proprement le 403 du bouclier FinOps. L'écran appelant peut alors
 * rediriger vers /paywall plutôt que d'afficher une erreur générique.
 */
export type AlternativesError =
  | ScanError
  | { kind: 'premium_required'; message?: string };

export interface AlternativesRemoteError {
  ok: false;
  error: AlternativesError;
}

/**
 * Convertit le DTO backend → type interne du mobile. Le backend nous garantit
 * déjà le bon format (on l'a designé pour) ; on caste juste `category` qui est
 * `string` côté contrat OpenAPI vs enum strict côté mobile.
 */
const VALID_CATEGORIES: ReadonlySet<Category> = new Set([
  'cosmetic',
  'food',
  'medication',
]);

/** Normalise toute string backend vers l'enum strict Category, fallback cosmetic. */
function coerceCategory(raw: unknown): Category {
  if (typeof raw === 'string' && VALID_CATEGORIES.has(raw as Category)) {
    return raw as Category;
  }
  return 'cosmetic';
}

function dtoToAlternativeProduct(d: AlternativeProductDto): AlternativeProduct {
  return {
    id: d.id,
    name: d.name,
    brand: d.brand,
    category: coerceCategory(d.category),
    barcode: d.barcode,
    image_url: d.image_url,
    description_fr: d.description_fr,
    reason: d.reason ?? null, // M3
    overall_risk: d.overall_risk,
    price_range: d.price_range,
    popularity_count: d.popularity_count,
    origin_badge: d.origin_badge,
    purchase_links: d.purchase_links, // v4 Lot 11 (passthrough)
  };
}

/**
 * Appelle `GET /api/alternatives/:barcode?trimester=X`.
 *
 * Backend-first : l'écran appelle cette fonction en premier, et si elle
 * échoue (réseau, 5xx, timeout, non-configuré), on retombe sur le pipeline
 * local (`getAlternativesByBarcode`). Un tableau vide n'est PAS une erreur
 * — c'est la "trappe de sécurité" (aucun produit 100% safe en base) et
 * l'écran affiche son empty state existant.
 */
export async function fetchAlternativesRemote(
  barcode: string,
  phase: Phase,
  isPremium: boolean,
): Promise<AlternativesRemoteOk | AlternativesRemoteError> {
  if (!isBackendConfigured) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ALTERNATIVES_TIMEOUT_MS);

  try {
    const url = `${API_BASE}/api/alternatives/${encodeURIComponent(
      barcode,
    )}?trimester=${encodeURIComponent(String(phaseToApi(phase)))}`;

    // v4 — Récupère l'App-User-ID RevenueCat pour la validation server-side
    // stricte. Le backend (middleware requirePremium.ts) appelle RC API pour
    // vérifier que `entitlements.helo_premium` est actif. Si null (web, RC
    // pas initialisé, premier launch), le backend retombe sur le header
    // legacy `x-helo-is-premium` qui n'est pas un vrai bouclier.
    const rcUserId = await getAppUserID().catch(() => null);

    const headers: Record<string, string> = {
      'x-helo-app-secret': APP_SECRET,
      // Étape 3 — M1 : signal Premium legacy (fallback si RC pas dispo).
      'x-helo-is-premium': isPremium ? 'true' : 'false',
    };
    if (rcUserId) {
      headers['x-helo-rc-user-id'] = rcUserId;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    if (response.status === 403) {
      let message: string | undefined;
      try {
        const body = (await response.json()) as { message?: string };
        message = body.message;
      } catch {
        /* ignore */
      }
      return { ok: false, error: { kind: 'premium_required', message } };
    }

    if (response.status === 200) {
      const raw = (await response.json()) as unknown;
      // Payload malformé (≠ array) → on traite comme une erreur serveur pour
      // déclencher le fallback local, plutôt que d'afficher un faux empty state.
      if (!Array.isArray(raw)) {
        return { ok: false, error: { kind: 'server', detail: 'malformed_payload' } };
      }
      const data = raw.map((d) => dtoToAlternativeProduct(d as AlternativeProductDto));
      return { ok: true, data };
    }
    if (response.status === 404) return { ok: false, error: { kind: 'not_found' } };
    if (response.status === 401) return { ok: false, error: { kind: 'unauthorized' } };
    if (response.status === 429) return { ok: false, error: { kind: 'rate_limited' } };
    if (response.status === 400) return { ok: false, error: { kind: 'invalid_request' } };
    return {
      ok: false,
      error: { kind: 'server', detail: `HTTP ${response.status}` },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: { kind: 'network', detail: msg } };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── /api/ocr-cleanup ───────────────────────────────────────────────────────
// v4 Lot 10 — Demande au backend (Claude Haiku) de nettoyer un texte OCR
// brut avant de le passer au matcher. Boost coverage immédiat sur les ghost
// captures sans grossir le dico (corrige fautes OCR, accents, mots cassés).
// Fallback gracieux : si le backend rate, on retourne le texte brut tel
// quel — l'app continue de fonctionner avec un OCR moins propre, c'est tout.

const OCR_CLEANUP_TIMEOUT_MS = 6000;

/**
 * Demande à l'API de nettoyer le texte OCR via Claude. Ne throw JAMAIS —
 * en cas d'erreur ou de backend non configuré, renvoie le rawText tel quel.
 * L'appelant n'a donc pas besoin d'else / try-catch.
 */
export async function cleanOcrTextRemote(
  rawText: string,
  locale: 'fr' | 'en' | 'auto' = 'auto',
): Promise<{ cleaned: string; source: 'ai' | 'passthrough' }> {
  if (!isBackendConfigured || !rawText.trim()) {
    return { cleaned: rawText, source: 'passthrough' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OCR_CLEANUP_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/api/ocr-cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-helo-app-secret': APP_SECRET,
      },
      body: JSON.stringify({ rawText, locale }),
      signal: controller.signal,
    });

    if (response.status !== 200) {
      return { cleaned: rawText, source: 'passthrough' };
    }
    const data = (await response.json()) as {
      cleanedIngredients?: string;
      source?: string;
    };
    if (typeof data.cleanedIngredients !== 'string' || !data.cleanedIngredients.trim()) {
      return { cleaned: rawText, source: 'passthrough' };
    }
    return {
      cleaned: data.cleanedIngredients,
      source: data.source === 'ai' ? 'ai' : 'passthrough',
    };
  } catch {
    return { cleaned: rawText, source: 'passthrough' };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Lot 18-10 — Claude Vision direct sur image (LE MOAT) ──────────────────

/**
 * Résultat structuré d'une analyse Claude Vision sur une photo de produit.
 * Schéma garanti par le prompt système côté backend (cf. routes/analyze-ingredients-image.ts).
 */
export interface ClaudeVisionAnalysis {
  product_name: string | null;
  brand: string | null;
  category: 'cosmetic' | 'food' | 'medication' | 'unknown';
  ingredients: string[];
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  notes: string | null;
}

const VISION_TIMEOUT_MS = 20_000; // 20s (Vision est plus lent que pure-text)

/**
 * Envoie une image (base64) à Claude Vision pour analyse structurée.
 * Retourne un objet ClaudeVisionAnalysis OU null si le backend n'est pas
 * configuré / l'appel échoue. L'appelant doit gérer le fallback vers
 * Google Vision OCR + matcher classique.
 *
 * Pas de throw — pattern défensif identique à `cleanOcrTextRemote`.
 *
 * Coût estimé : ~$0.005-0.01 par appel (Claude Haiku Vision).
 * Latence : 2-5s (vision = plus lent que text-only).
 *
 * Usage :
 * ```ts
 * const analysis = await analyzeIngredientsWithClaudeVision(base64, {
 *   locale: 'fr',
 *   phase: 2,
 *   hintCategory: 'cosmetic',
 * });
 * if (analysis && analysis.confidence !== 'low' && analysis.ingredients.length > 0) {
 *   // Utilise l'analyse Claude
 * } else {
 *   // Fallback : Google Vision OCR + matching classique
 * }
 * ```
 */
export async function analyzeIngredientsWithClaudeVision(
  imageBase64: string,
  opts: {
    locale?: 'fr' | 'en' | 'auto';
    phase?: 1 | 2 | 3 | 'breastfeeding';
    hintCategory?: 'cosmetic' | 'food' | 'medication' | 'auto';
    imageMediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
  } = {},
): Promise<ClaudeVisionAnalysis | null> {
  if (!isBackendConfigured || !imageBase64) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/api/analyze-ingredients-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-helo-app-secret': APP_SECRET,
      },
      body: JSON.stringify({
        imageBase64,
        imageMediaType: opts.imageMediaType ?? 'image/jpeg',
        locale: opts.locale ?? 'auto',
        phase: opts.phase,
        hintCategory: opts.hintCategory ?? 'auto',
      }),
      signal: controller.signal,
    });

    if (response.status !== 200) {
      return null;
    }

    const data = (await response.json()) as {
      analysis?: ClaudeVisionAnalysis;
      source?: string;
    };

    if (!data.analysis || !Array.isArray(data.analysis.ingredients)) {
      return null;
    }

    return data.analysis;
  } catch {
    // Timeout, network error, parse error → fallback silencieux
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
