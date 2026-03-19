import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { fetchProductByBarcode, matchIngredients, getVerdict } from '@/lib/openfoodfacts';
import { calculateTrimester, getTrimesterPalette, TrimesterInfo, TrimesterPalette } from '@/lib/trimester';
import type { ScanCache, Trimester } from '@/types';

const LAST_TRIMESTER_KEY = '@helo_last_trimester';
const SHELF_KEY = '@helo_shelf';
const SCAN_CACHE_PREFIX = '@helo_scan_cache_';

interface UseTrimesterReturn extends TrimesterInfo {
  trimesterPalette: TrimesterPalette;
  showTrimesterTransition: boolean;
  changedProductsCount: number;
  dismissTransition: () => void;
}

export function useTrimester(): UseTrimesterReturn {
  const [info, setInfo] = useState<TrimesterInfo>({
    trimester: 2,
    weekOfPregnancy: 20,
    daysUntilDue: 140,
  });
  const [trimesterPalette, setTrimesterPalette] = useState<TrimesterPalette>(
    getTrimesterPalette(2),
  );
  const [showTrimesterTransition, setShowTrimesterTransition] = useState(false);
  const [changedProductsCount, setChangedProductsCount] = useState(0);

  const dismissTransition = useCallback(() => {
    setShowTrimesterTransition(false);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const profileRaw = await AsyncStorage.getItem('user_profile');
        if (!profileRaw) return;

        const profile = JSON.parse(profileRaw);
        if (!profile.dueDate) return;

        const calculated = calculateTrimester(profile.dueDate);
        const palette = getTrimesterPalette(calculated.trimester);

        setInfo(calculated);
        setTrimesterPalette(palette);

        const lastTrimesterRaw = await AsyncStorage.getItem(LAST_TRIMESTER_KEY);
        const lastTrimester = lastTrimesterRaw ? (parseInt(lastTrimesterRaw, 10) as Trimester) : null;

        if (lastTrimester !== null && lastTrimester !== calculated.trimester) {
          await AsyncStorage.setItem(LAST_TRIMESTER_KEY, String(calculated.trimester));
          const changed = await recalculateShelfVerdicts(calculated.trimester);
          setChangedProductsCount(changed);
          setShowTrimesterTransition(true);
        } else if (lastTrimester === null) {
          await AsyncStorage.setItem(LAST_TRIMESTER_KEY, String(calculated.trimester));
        }
      } catch (err) {
        console.warn('[useTrimester] Error:', err);
      }
    };

    run();
  }, []);

  return {
    ...info,
    trimesterPalette,
    showTrimesterTransition,
    changedProductsCount,
    dismissTransition,
  };
}

async function recalculateShelfVerdicts(newTrimester: Trimester): Promise<number> {
  try {
    const shelfRaw = await AsyncStorage.getItem(SHELF_KEY);
    if (!shelfRaw) return 0;

    const shelf: Array<{
      barcode: string;
      productName?: string;
      brand?: string;
      category?: string;
      verdict?: string;
      savedAt?: number;
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
          const matches = await matchIngredients(product.ingredientsList ?? [], newTrimester);
          const verdict = getVerdict(matches);
          cache = { barcode: item.barcode, product, matches, verdict, cachedAt: Date.now() };
          await AsyncStorage.setItem(cacheKey, JSON.stringify(cache));
          const prevVerdict = item.verdict;
          if (verdict.verdict !== prevVerdict) {
            changedCount++;
            const idx = shelf.findIndex((s) => s.barcode === item.barcode);
            if (idx !== -1) shelf[idx] = { ...shelf[idx], verdict: verdict.verdict };
          }
          continue;
        }

        const previousVerdict = cache.verdict?.verdict;

        const newMatches = await matchIngredients(
          cache.product.ingredientsList ?? [],
          newTrimester,
        );
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
          if (idx !== -1) {
            shelf[idx] = { ...shelf[idx], verdict: newVerdict.verdict };
          }
        }
      } catch {
        // Skip this item if processing fails
      }
    }

    await AsyncStorage.setItem(SHELF_KEY, JSON.stringify(shelf));
    return changedCount;
  } catch (err) {
    console.warn('[useTrimester] recalculateShelfVerdicts error:', err);
    return 0;
  }
}
