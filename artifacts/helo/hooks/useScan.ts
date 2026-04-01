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

import {
  cacheProduct,
  enqueueOfflineScan,
  getCachedProduct,
  getLocalIngredients,
  matchIngredientsLocal,
} from '@/lib/offline';
import { PREMIUM_KEY } from '@/lib/purchases';
import type {
  MatchResult,
  Phase,
  ProductData,
  ScanCache,
  VerdictResult,
} from '@/types';

const CACHE_PREFIX = '@helo_scan_cache_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface ScanState {
  loading: boolean;
  product: ProductData | null;
  matches: MatchResult[];
  verdict: VerdictResult | null;
  error: string | null;
  fromCache: boolean;
}

interface UseScanReturn extends ScanState {
  scanBarcode: (barcode: string, phase?: Phase, isOffline?: boolean) => Promise<void>;
  clearResult: () => void;
  setDirectResult: (product: ProductData, matches: MatchResult[], verdict: VerdictResult) => void;
}

async function readCache(barcode: string): Promise<ScanCache | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${barcode}`);
    if (!raw) return null;
    const cache: ScanCache = JSON.parse(raw);
    if (Date.now() - cache.cachedAt > CACHE_TTL_MS) {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${barcode}`);
      return null;
    }
    return cache;
  } catch {
    return null;
  }
}

async function writeCache(barcode: string, data: Omit<ScanCache, 'barcode' | 'cachedAt'>): Promise<void> {
  try {
    const cache: ScanCache = { barcode, cachedAt: Date.now(), ...data };
    await AsyncStorage.setItem(`${CACHE_PREFIX}${barcode}`, JSON.stringify(cache));
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
    fromCache: false,
  });

  const scanBarcode = useCallback(async (barcode: string, phase: Phase = 2, isOffline = false) => {
    setState((s) => ({ ...s, loading: true, error: null, fromCache: false }));

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
        const cached = await readCache(barcode);
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
            fromCache: true,
          });
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
            fromCache: true,
          });
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

      // 1. Check cache first
      const cached = await readCache(barcode);
      if (cached) {
        setState({
          loading: false,
          product: cached.product,
          matches: cached.matches,
          verdict: cached.verdict,
          error: null,
          fromCache: true,
        });
        return;
      }

      // 2. Fetch from Open Food Facts
      const product = await fetchProductByBarcode(barcode);
      if (!product) {
        setState((s) => ({
          ...s,
          loading: false,
          error: 'Produit non trouvé dans la base Open Food Facts. Vous pouvez le soumettre à la communauté.',
        }));
        return;
      }

      // 3. Match ingredients against DB
      const matches = await matchIngredients(product.ingredientsList, phase);

      // 4. Compute verdict
      const verdict = getVerdict(matches);

      // 5. Cache the result
      await writeCache(barcode, { product, matches, verdict });

      // 6. Also store in offline LRU cache
      await cacheProduct(barcode, product, verdict);

      setState({
        loading: false,
        product,
        matches,
        verdict,
        error: null,
        fromCache: false,
      });
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
      fromCache: false,
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
        fromCache: false,
      });
    },
    [],
  );

  return { ...state, scanBarcode, clearResult, setDirectResult };
}
