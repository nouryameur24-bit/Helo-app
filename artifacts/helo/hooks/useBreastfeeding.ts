import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchProductByBarcode, matchIngredients, getVerdict } from '@/lib/productLookup';
import type { ScanCache } from '@/types';

const BREASTFEEDING_KEY = '@helo_breastfeeding_mode';
const SHELF_KEY = '@helo_shelf';
const SCAN_CACHE_PREFIX = '@helo_scan_cache_';

export const BREASTFEEDING_PALETTE = {
  accent: '#D4A0B0',
  accentLight: '#F0D0DC',
  background: '#FFF0F5',
};

interface UseBreastfeedingReturn {
  isBreastfeeding: boolean;
  enableBreastfeeding: () => Promise<{ changedCount: number }>;
  disableBreastfeeding: () => Promise<void>;
  showTransition: boolean;
  changedProductsCount: number;
  dismissTransition: () => void;
}

async function recalculateShelfForBreastfeeding(): Promise<number> {
  try {
    const shelfRaw = await AsyncStorage.getItem(SHELF_KEY);
    if (!shelfRaw) return 0;

    const shelf: Array<{
      barcode: string;
      verdict?: string;
    }> = JSON.parse(shelfRaw);

    if (shelf.length === 0) return 0;
    let changedCount = 0;

    for (const item of shelf) {
      if (!item.barcode) continue;
      const cacheKey = `${SCAN_CACHE_PREFIX}${item.barcode}`;
      try {
        const cacheRaw = await AsyncStorage.getItem(cacheKey);
        let cache: ScanCache | null = cacheRaw ? JSON.parse(cacheRaw) : null;

        if (!cache) {
          const product = await fetchProductByBarcode(item.barcode).catch(() => null);
          if (!product) continue;
          const matches = await matchIngredients(product.ingredientsList, 'breastfeeding');
          const verdict = getVerdict(matches);
          cache = { barcode: item.barcode, product, matches, verdict, cachedAt: Date.now() };
          await AsyncStorage.setItem(cacheKey, JSON.stringify(cache));
          if (verdict.verdict !== (item.verdict ?? 'safe')) {
            changedCount++;
            const idx = shelf.findIndex((s) => s.barcode === item.barcode);
            if (idx !== -1) shelf[idx] = { ...shelf[idx], verdict: verdict.verdict };
          }
          continue;
        }

        const previousVerdict = cache.verdict?.verdict;
        const newMatches = await matchIngredients(cache.product.ingredientsList ?? [], 'breastfeeding');
        const newVerdict = getVerdict(newMatches);

        const updatedCache: ScanCache = {
          ...cache,
          matches: newMatches,
          verdict: newVerdict,
          cachedAt: Date.now(),
        };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedCache));

        if (newVerdict.verdict !== previousVerdict) {
          changedCount++;
          const idx = shelf.findIndex((s) => s.barcode === item.barcode);
          if (idx !== -1) shelf[idx] = { ...shelf[idx], verdict: newVerdict.verdict };
        }
      } catch {
        // skip
      }
    }

    await AsyncStorage.setItem(SHELF_KEY, JSON.stringify(shelf));
    return changedCount;
  } catch (err) {
    console.warn('[useBreastfeeding] recalculateShelf error:', err);
    return 0;
  }
}

export function useBreastfeeding(): UseBreastfeedingReturn {
  const [isBreastfeeding, setIsBreastfeeding] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [changedProductsCount, setChangedProductsCount] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    AsyncStorage.getItem(BREASTFEEDING_KEY)
      .then((v) => setIsBreastfeeding(v === 'true'))
      .catch(() => {});
  }, []);

  const enableBreastfeeding = useCallback(async (): Promise<{ changedCount: number }> => {
    await AsyncStorage.setItem(BREASTFEEDING_KEY, 'true');
    setIsBreastfeeding(true);
    const changedCount = await recalculateShelfForBreastfeeding();
    setChangedProductsCount(changedCount);
    setShowTransition(true);
    return { changedCount };
  }, []);

  const disableBreastfeeding = useCallback(async (): Promise<void> => {
    await AsyncStorage.removeItem(BREASTFEEDING_KEY);
    setIsBreastfeeding(false);
  }, []);

  const dismissTransition = useCallback(() => {
    setShowTransition(false);
  }, []);

  return {
    isBreastfeeding,
    enableBreastfeeding,
    disableBreastfeeding,
    showTransition,
    changedProductsCount,
    dismissTransition,
  };
}

export async function getBreastfeedingMode(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(BREASTFEEDING_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}
