import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';

import {
  fetchProductByBarcode,
  getVerdict,
  matchIngredients,
} from '@/lib/openfoodfacts';
import type {
  MatchResult,
  ProductData,
  ScanCache,
  Trimester,
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
  scanBarcode: (barcode: string, trimester?: Trimester) => Promise<void>;
  clearResult: () => void;
  setDirectResult: (product: ProductData, matches: MatchResult[], verdict: VerdictResult) => void;
}

async function readCache(barcode: string): Promise<ScanCache | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${barcode}`);
    if (!raw) return null;
    const cache: ScanCache = JSON.parse(raw);
    // Expire stale cache
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

  const scanBarcode = useCallback(async (barcode: string, trimester: Trimester = 2) => {
    setState((s) => ({ ...s, loading: true, error: null, fromCache: false }));

    try {
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
      const matches = await matchIngredients(product.ingredientsList, trimester);

      // 4. Compute verdict
      const verdict = getVerdict(matches);

      // 5. Cache the result
      await writeCache(barcode, { product, matches, verdict });

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
