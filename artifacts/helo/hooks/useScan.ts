/**
 * useScan — Hook principal du pipeline de scan de produits.
 *
 * Gère les deux modes de scan (en ligne / hors-ligne) avec une couche de cache
 * à deux niveaux : cache TTL 7 jours (scan récents) + LRU offline (produits déjà vus).
 *
 * Flux en ligne  : barcode → Open Food Facts → matchIngredients() → verdict → cache
 * Flux hors-ligne: barcode → cache TTL → cache LRU → erreur explicite (pas de fallback silencieux)
 *
 * @returns {UseScanReturn} État du scan + actions (scanBarcode, clearResult, setDirectResult)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';

import {
  fetchProductByBarcode,
  getVerdict,
  matchIngredients,
} from '@/lib/productLookup';
import { applyPersonalPreferences } from '@/lib/preferenceMatcher';
import {
  dtoToMatchResult,
  isBackendConfigured,
  scanProductRemote,
  type ScanResponseDto,
} from '@/lib/api';

import {
  cacheProduct,
  enqueueOfflineScan,
  getCachedProduct,
  getLocalIngredients,
  matchIngredientsLocal,
} from '@/lib/offline';
import { PREMIUM_KEY } from '@/lib/purchases';
import { track } from '@/lib/analytics';
import { incrementPartnerScanCount } from '@/lib/partnerStats';
import type {
  MatchResult,
  Phase,
  ProductData,
  ScanCache,
  Verdict,
  VerdictResult,
} from '@/types';
import { scanCacheKey, STORAGE_KEYS } from '@/lib/storageKeys';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Task #110 — État "metadata_only" : le backend connaît le produit (nom/marque
 * via OFF/OBF) mais n'a pas sa liste INCI. Le mobile peut alors afficher un
 * empty state "On a trouvé X mais pas sa composition — prends une photo" avec
 * CTA Ghost Capture pré-rempli.
 */
export interface PartialProductInfo {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  source: string;
  message?: string;
}

interface ScanState {
  loading: boolean;
  product: ProductData | null;
  matches: MatchResult[];
  verdict: VerdictResult | null;
  error: string | null;
  notFound: boolean;
  fromCache: boolean;
  /** Task #110 — Set quand backend retourne `metadata_only` (404 + partial info). */
  partialMetadata: PartialProductInfo | null;
}

interface UseScanReturn extends ScanState {
  scanBarcode: (barcode: string, phase?: Phase, isOffline?: boolean) => Promise<void>;
  clearResult: () => void;
  setDirectResult: (product: ProductData, matches: MatchResult[], verdict: VerdictResult) => void;
}

async function readCache(barcode: string, phase: Phase): Promise<ScanCache | null> {
  try {
    const raw = await AsyncStorage.getItem(scanCacheKey(barcode, phase));
    if (!raw) return null;
    const cache: ScanCache = JSON.parse(raw);
    if (Date.now() - cache.cachedAt > CACHE_TTL_MS) {
      await AsyncStorage.removeItem(scanCacheKey(barcode, phase));
      return null;
    }
    return cache;
  } catch {
    return null;
  }
}

/**
 * Convertit la réponse du backend (POST /api/scan) vers les types internes
 * du mobile (ProductData + MatchResult[] + VerdictResult).
 *
 * Le backend détient désormais l'autorité sur :
 *  - le verdict (status/verdict)
 *  - le score (glow_score, expose via verdict.glowScoreRemote pour l'UI)
 *  - l'explication (déterministe ou IA, exposée via verdict.aiExplanation)
 *  - le breakdown par ingrédient (matches[])
 */
function adaptBackendResponse(
  barcode: string,
  dto: ScanResponseDto,
): { product: ProductData; matches: MatchResult[]; verdict: VerdictResult } {
  const matches: MatchResult[] = dto.matches.map(dtoToMatchResult);

  // ingredientsList reconstruit depuis matches → cohérent avec ce que le backend a parsé.
  const ingredientsList = matches.map((m) => m.ingredientName);

  const product: ProductData = {
    barcode,
    name: dto.product.name,
    brand: dto.product.brand ?? '',
    imageUrl: dto.product.image_url,
    ingredientsList,
    source: 'helo', // marqueur "passé par le backend Hēlo"
  };

  const flaggedIngredients = matches.filter(
    (m) => m.riskLevel === 'danger' || m.riskLevel === 'caution',
  );
  const noSignalCount = matches.filter((m) => m.riskLevel === 'no_signal').length;
  const safeCount = matches.filter((m) => m.riskLevel === 'safe').length;
  const totalCount = matches.length;
  // Lot 17-01 : transparence "composition inconnue" même via backend hybride.
  const allIngredientsUnknown = totalCount > 0 && noSignalCount === totalCount;
  const unknownRatio = totalCount > 0 ? noSignalCount / totalCount : 0;
  const verdict: VerdictResult = {
    verdict: dto.verdict,
    flaggedIngredients,
    noSignalCount,
    safeCount,
    totalCount,
    allIngredientsUnknown,
    unknownRatio,
    aiExplanation: dto.explanation,
    aiSource: dto.source,
    glowScoreRemote: dto.glow_score,
    searchKeyword: dto.search_keyword,
  };

  return { product, matches, verdict };
}

/**
 * Lot 17-02 FIX (audit #1, SAFETY-CRITICAL) — Cross-check allergies sur le
 * chemin backend.
 *
 * Le backend Hēlo ne connaît PAS les allergies de l'utilisatrice (elles sont
 * stockées local-only sur l'appareil). `adaptBackendResponse` construisait donc
 * un verdict SANS `allergyWarnings` → la bannière rouge anaphylaxie (Lot 17-02)
 * ne s'affichait JAMAIS en ligne (= en prod). Elle ne marchait que sur le
 * fallback local hors-réseau. Faux-safe inacceptable pour une app grossesse.
 *
 * Fix : on ré-applique ici les préférences personnelles aux matches backend
 * (bump allergie→danger, régime/cosmétique→caution, tag `matchedAllergies`),
 * on recalcule le verdict via `getVerdict` (qui agrège `allergyWarnings`), et
 * on MERGE en préservant l'autorité backend (glow score, explication IA) tout
 * en escaladant la sévérité si une préférence l'exige.
 *
 * Jamais bloquant : si `applyPersonalPreferences` échoue, on renvoie le verdict
 * backend inchangé (mieux vaut un scan sans bump perso qu'un scan KO).
 */
const VERDICT_SEVERITY: Record<Verdict, number> = { safe: 0, caution: 1, danger: 2 };

async function applyAllergiesToBackendResult(
  matches: MatchResult[],
  backendVerdict: VerdictResult,
): Promise<{ matches: MatchResult[]; verdict: VerdictResult }> {
  try {
    const { matches: prefMatches } = await applyPersonalPreferences(matches);
    const prefVerdict = getVerdict(prefMatches);
    // Si aucune préférence n'a tagué/bumpé → rien ne change, on garde le backend tel quel.
    const noChange =
      !prefVerdict.allergyWarnings &&
      VERDICT_SEVERITY[prefVerdict.verdict] <= VERDICT_SEVERITY[backendVerdict.verdict];
    if (noChange) return { matches, verdict: backendVerdict };

    const finalLabel: Verdict =
      VERDICT_SEVERITY[prefVerdict.verdict] > VERDICT_SEVERITY[backendVerdict.verdict]
        ? prefVerdict.verdict
        : backendVerdict.verdict;

    return {
      matches: prefMatches,
      verdict: {
        ...backendVerdict, // autorité backend : glowScoreRemote, aiExplanation, aiSource, searchKeyword, *Count
        verdict: finalLabel,
        flaggedIngredients: prefVerdict.flaggedIngredients,
        ...(prefVerdict.allergyWarnings
          ? { allergyWarnings: prefVerdict.allergyWarnings }
          : {}),
      },
    };
  } catch {
    return { matches, verdict: backendVerdict };
  }
}

/**
 * Bump the local "héros UX" partner-scan counter if the current user is in
 * partner mode. Read directly from AsyncStorage rather than threading a
 * `role` argument through every `scanBarcode` call site — keeps the public
 * scan API role-agnostic and means future scan entry points get the
 * behaviour for free.
 *
 * Failure modes are all silent on purpose: a counter glitch must never
 * surface as a scan error. Worst case the badge updates one scan late.
 */
async function bumpPartnerCounterIfRelevant(): Promise<void> {
  try {
    const role = await AsyncStorage.getItem(STORAGE_KEYS.userRole);
    if (role !== 'partner') return;
    await incrementPartnerScanCount();
  } catch {
    // Counter glitch is non-critical — never block or surface here.
  }
}

async function writeCache(
  barcode: string,
  phase: Phase,
  data: Omit<ScanCache, 'barcode' | 'cachedAt'>,
): Promise<void> {
  try {
    // Garde-fou : ne pas persister un breakdown vide (legacy cache hit côté
    // backend renvoyant matches:[]). Sinon une recompute locale ultérieure
    // partirait d'un ingredientsList vide et biaiserait safe par défaut.
    if (data.matches.length === 0) return;
    const cache: ScanCache = { barcode, cachedAt: Date.now(), ...data };
    await AsyncStorage.setItem(scanCacheKey(barcode, phase), JSON.stringify(cache));
  } catch {
    // Non-blocking — cache write failure is silent
  }
}

export function useScan(): UseScanReturn {
  const [state, setState] = useState<ScanState>({
    loading: false,
    product: null,
    matches: [],
    verdict: null,
    error: null,
    notFound: false,
    fromCache: false,
    partialMetadata: null,
  });

  const scanBarcode = useCallback(async (barcode: string, phase: Phase = 2, isOffline = false) => {
    setState((s) => ({ ...s, loading: true, error: null, fromCache: false, partialMetadata: null }));
    // Note v4 Lot 11 → wizard PostHog : on émet `scan_started` UNIQUEMENT côté
    // UI (app/(tabs)/scan.tsx) qui a les meilleures metadata (barcode +
    // is_premium + is_offline). Émettre ici causait du double-count.

    try {
      // ── Offline path ──────────────────────────────────────────────────────────
      if (isOffline) {
        const premiumRaw = await AsyncStorage.getItem(PREMIUM_KEY);
        const isPremium = premiumRaw === 'true';

        if (!isPremium) {
          setState((s) => ({
            ...s,
            loading: false,
            error: 'Mode hors-ligne disponible avec Hēlo Premium',
          }));
          return;
        }

        // 1a. Guard: ensure local ingredients DB is available for offline matching
        const localIngredients = await getLocalIngredients();
        const hasLocalDB = localIngredients.length > 0;

        // 1. Check 7-day scan cache first
        const cached = await readCache(barcode, phase);
        if (cached) {
          const matches = hasLocalDB
            ? await matchIngredientsLocal(cached.product.ingredientsList, phase)
            : cached.matches;
          const verdict = getVerdict(matches);
          await enqueueOfflineScan({
            barcode,
            product: cached.product,
            verdict,
            trimester: phase,
            scannedAt: Date.now(),
          });
          setState({
            loading: false,
            product: cached.product,
            matches,
            verdict,
            error: null,
            notFound: false,
            fromCache: true,
            partialMetadata: null,
          });
          track('scan_completed', {
            source: 'offline_cache',
            verdict: verdict.verdict,
            phase,
          }).catch(() => {});
          bumpPartnerCounterIfRelevant();
          return;
        }

        // 2. Check LRU offline product cache
        const lruEntry = await getCachedProduct(barcode);
        if (lruEntry) {
          const { product } = lruEntry;
          if (!hasLocalDB) {
            setState((s) => ({
              ...s,
              loading: false,
              error: 'La base d\'ingrédients locale n\'est pas disponible. Reconnectez-vous pour la télécharger.',
            }));
            return;
          }
          const matches = await matchIngredientsLocal(product.ingredientsList, phase);
          const verdict = getVerdict(matches);
          await enqueueOfflineScan({
            barcode,
            product,
            verdict,
            trimester: phase,
            scannedAt: Date.now(),
          });
          setState({
            loading: false,
            product,
            matches,
            verdict,
            error: null,
            notFound: false,
            fromCache: true,
            partialMetadata: null,
          });
          track('scan_completed', {
            source: 'offline_lru',
            verdict: verdict.verdict,
            phase,
          }).catch(() => {});
          bumpPartnerCounterIfRelevant();
          return;
        }

        // 3. Cannot identify product offline — no barcode lookup without network
        setState((s) => ({
          ...s,
          loading: false,
          error: 'Produit non trouvé dans le cache local. Une connexion internet est nécessaire pour scanner de nouveaux produits.',
        }));
        return;
      }

      // ── Online path ───────────────────────────────────────────────────────────

      // 1. Check 7-day local cache first (instant, no network)
      // Audit fix #4 : un cache legacy avec matches:[] (écrit avant le garde-fou
      // de writeCache) afficherait un faux "safe" SANS bannière d'incertitude
      // (totalCount=0 → allIngredientsUnknown=false). On le traite comme un miss
      // → re-fetch backend qui produira un verdict honnête.
      const cached = await readCache(barcode, phase);
      if (cached && cached.matches.length > 0) {
        setState({
          loading: false,
          product: cached.product,
          matches: cached.matches,
          verdict: cached.verdict,
          error: null,
          notFound: false,
          fromCache: true,
          partialMetadata: null,
        });
        track('scan_completed', {
          source: 'cache',
          verdict: cached.verdict.verdict,
          phase,
        }).catch(() => {});
        bumpPartnerCounterIfRelevant();
        return;
      }

      // 2. Source of truth en ligne = backend Hēlo (déterministe + IA).
      //    Le backend orchestre déjà OFF/OBF, matching, AI et cache Supabase.
      if (isBackendConfigured) {
        const remote = await scanProductRemote(barcode, phase);
        if (remote.ok) {
          const adapted = adaptBackendResponse(barcode, remote.data);
          const { product } = adapted;
          // Lot 17-02 FIX (audit #1) : ré-applique les allergies déclarées
          // (le backend ne les connaît pas) → bannière rouge + bump sévérité.
          const { matches, verdict } = await applyAllergiesToBackendResult(
            adapted.matches,
            adapted.verdict,
          );
          await writeCache(barcode, phase, { product, matches, verdict });
          await cacheProduct(barcode, product, verdict);
          setState({
            loading: false,
            product,
            matches,
            verdict,
            error: null,
            notFound: false,
            fromCache: false,
            partialMetadata: null,
          });
          track('scan_completed', {
            source: 'backend',
            verdict: verdict.verdict,
            phase,
            ai_source: verdict.aiSource,
          }).catch(() => {});
          bumpPartnerCounterIfRelevant();
          return;
        }
        // Erreurs métier "terminales" : pas la peine de retomber sur le local
        // (le local ne saura pas faire mieux et risque d'être inconsistant).
        if (remote.error.kind === 'not_found') {
          setState((s) => ({
            ...s,
            loading: false,
            notFound: true,
            error: 'Produit non trouvé. Vous pouvez le soumettre à la communauté.',
            partialMetadata: null,
          }));
          return;
        }
        // Task #110 — Métadonnées partielles connues (nom/marque/photo) mais
        // pas d'INCI. Mode "Ghost Capture pré-rempli" : on affiche le produit
        // tel quel + CTA "Prends une photo des ingrédients".
        if (remote.error.kind === 'metadata_only') {
          // Capture les champs AVANT le callback setState — TypeScript perd
          // le narrowing du discriminated union dans la closure du setState.
          const meta = remote.error.metadata;
          const partialMessage = remote.error.message;
          setState((s) => ({
            ...s,
            loading: false,
            notFound: false, // pas "introuvable" — on a juste pas la composition
            error: null,
            partialMetadata: {
              barcode: meta.barcode,
              name: meta.name,
              brand: meta.brand,
              imageUrl: meta.image_url,
              source: meta.source,
              message: partialMessage,
            },
          }));
          track('scan_partial_metadata', {
            source: meta.source,
            has_name: Boolean(meta.name),
            has_brand: Boolean(meta.brand),
          }).catch(() => {});
          return;
        }
        if (remote.error.kind === 'rate_limited') {
          setState((s) => ({
            ...s,
            loading: false,
            error: 'Trop de scans rapprochés. Patientez quelques instants.',
          }));
          return;
        }
        if (
          remote.error.kind === 'unauthorized' ||
          remote.error.kind === 'invalid_request' ||
          remote.error.kind === 'no_ingredients'
        ) {
          // Échec de configuration / contrat — pas de fallback silencieux.
          setState((s) => ({
            ...s,
            loading: false,
            error: "Service temporairement indisponible. Réessayez plus tard.",
          }));
          return;
        }
        // network / server / unconfigured → on retombe sur le pipeline local
        // pour préserver l'expérience (best-effort, déterministe uniquement).
      }

      // 3. Fallback : pipeline 100% local (legacy)
      //    Utilisé si backend KO (réseau, 5xx) ou non configuré (preview/CI).
      const product = await fetchProductByBarcode(barcode);
      if (!product) {
        setState((s) => ({
          ...s,
          loading: false,
          notFound: true,
          error: 'Produit non trouvé. Vous pouvez le soumettre à la communauté.',
          partialMetadata: null,
        }));
        return;
      }
      const matches = await matchIngredients(product.ingredientsList, phase);
      const verdict = getVerdict(matches);
      await writeCache(barcode, phase, { product, matches, verdict });
      await cacheProduct(barcode, product, verdict);
      setState({
        loading: false,
        product,
        matches,
        verdict,
        error: null,
        notFound: false,
        fromCache: false,
        partialMetadata: null,
      });
      track('scan_completed', {
        source: 'legacy_local',
        verdict: verdict.verdict,
        phase,
      }).catch(() => {});
      bumpPartnerCounterIfRelevant();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue. Vérifiez votre connexion.';
      setState((s) => ({ ...s, loading: false, error: message }));
    }
  }, []);

  const clearResult = useCallback(() => {
    setState({
      loading: false,
      product: null,
      matches: [],
      verdict: null,
      error: null,
      notFound: false,
      fromCache: false,
      partialMetadata: null,
    });
  }, []);

  const setDirectResult = useCallback(
    (product: ProductData, matches: MatchResult[], verdict: VerdictResult) => {
      setState({
        loading: false,
        product,
        matches,
        verdict,
        error: null,
        notFound: false,
        fromCache: false,
        partialMetadata: null,
      });
    },
    [],
  );

  return { ...state, scanBarcode, clearResult, setDirectResult };
}
