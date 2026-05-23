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

import type { MatchResult, Phase, RiskLevel, Verdict } from '@/types';

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

export type ScanError =
  | { kind: 'not_found' }
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
    if (response.status === 404) return { ok: false, error: { kind: 'not_found' } };
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
