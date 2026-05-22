import { swallow } from '@/lib/swallow';
/**
 * useTrimester — Calcul automatique du trimestre et gestion des transitions.
 *
 * Lit la date terme (dueDate) depuis AsyncStorage et calcule le trimestre courant
 * via calculateTrimester(). Détecte automatiquement les changements de trimestre
 * au lancement de l'app et recalcule les verdicts du placard (recalculateShelfVerdicts).
 *
 * Fonctionnalités :
 *  - Transition de trimestre : showTrimesterTransition + changedProductsCount
 *  - Post-partum : détecte automatiquement et propose le mode allaitement
 *  - Palette de couleurs adaptée à chaque trimestre (trimesterPalette)
 *
 * recalculateShelfVerdicts() est une fonction privée qui itère sur le placard local,
 * re-matche les ingrédients pour le nouveau trimestre et met à jour le cache.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { fetchProductByBarcode, matchIngredients, getVerdict } from '@/lib/productLookup';
import { calculateTrimester, getTrimesterPalette, TrimesterInfo, TrimesterPalette } from '@/lib/trimester';
import { getBreastfeedingMode } from '@/hooks/useBreastfeeding';
import type { ScanCache, Trimester } from '@/types';
import { STORAGE_KEYS, scanCacheKey } from '@/lib/storageKeys';

const LAST_TRIMESTER_KEY = STORAGE_KEYS.lastTrimester;
const SHELF_KEY = STORAGE_KEYS.shelf;
const BF_SUGGESTION_KEY = STORAGE_KEYS.bfSuggestionDismissed;

interface UseTrimesterReturn extends TrimesterInfo {
  trimesterPalette: TrimesterPalette;
  showTrimesterTransition: boolean;
  changedProductsCount: number;
  dismissTransition: () => void;
  shouldSuggestBreastfeeding: boolean;
  dismissBreastfeedingSuggestion: () => void;
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
  const [shouldSuggestBreastfeeding, setShouldSuggestBreastfeeding] = useState(false);

  const dismissTransition = useCallback(() => {
    setShowTrimesterTransition(false);
  }, []);

  const dismissBreastfeedingSuggestion = useCallback(() => {
    setShouldSuggestBreastfeeding(false);
    AsyncStorage.setItem(BF_SUGGESTION_KEY, 'true').catch(swallow);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const profileRaw = await AsyncStorage.getItem(STORAGE_KEYS.profile);
        if (!profileRaw) return;

        const profile = JSON.parse(profileRaw);
        if (!profile.dueDate) return;

        const calculated = calculateTrimester(profile.dueDate);
        const palette = getTrimesterPalette(calculated.trimester);

        setInfo(calculated);
        setTrimesterPalette(palette);

        // Auto-suggest breastfeeding mode if post-partum and not already active
        if (calculated.isPostPartum) {
          const [isBF, alreadyDismissed] = await Promise.all([
            getBreastfeedingMode(),
            AsyncStorage.getItem(BF_SUGGESTION_KEY),
          ]);
          if (!isBF && alreadyDismissed !== 'true') {
            setShouldSuggestBreastfeeding(true);
          }
          return; // don't trigger trimester transition post-partum
        }

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
        if (__DEV__) console.warn('[useTrimester] Error:', err);
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
    shouldSuggestBreastfeeding,
    dismissBreastfeedingSuggestion,
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

      const cacheKey = scanCacheKey(item.barcode);

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
    if (__DEV__) console.warn('[useTrimester] recalculateShelfVerdicts error:', err);
    return 0;
  }
}
