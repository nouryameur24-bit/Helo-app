import { swallow } from '@/lib/swallow';
/**
 * useBabyMode — Mode bébé pour scanner les produits de puériculture.
 *
 * Lorsqu'activé, l'app passe en mode "analyse produit bébé" :
 *  - Filtre les catégories du placard sur BABY_CATEGORIES
 *  - Adapte les seuils de risque aux besoins du nouveau-né (plus stricts)
 *  - Change l'iconographie et les libellés dans l'interface
 *
 * Persistance : AsyncStorage `@helo_baby_mode` ('true' / 'false').
 * BABY_CATEGORIES et BABY_MODE_KEY sont exportés pour usage dans d'autres hooks.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/storageKeys';

export const BABY_MODE_KEY = STORAGE_KEYS.babyMode;

export const BABY_CATEGORIES = [
  'couches',
  'lingettes-bebe',
  'creme-change',
  'lait-bebe',
  'shampoing-bebe',
] as const;

export type BabyCategory = typeof BABY_CATEGORIES[number];

interface UseBabyModeReturn {
  babyMode: boolean;
  enableBabyMode: () => Promise<void>;
  disableBabyMode: () => Promise<void>;
  toggleBabyMode: () => Promise<void>;
}

export function useBabyMode(): UseBabyModeReturn {
  const [babyMode, setBabyMode] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    AsyncStorage.getItem(BABY_MODE_KEY)
      .then((v) => setBabyMode(v === 'true'))
      .catch(swallow);
  }, []);

  const enableBabyMode = useCallback(async () => {
    await AsyncStorage.setItem(BABY_MODE_KEY, 'true');
    setBabyMode(true);
  }, []);

  const disableBabyMode = useCallback(async () => {
    await AsyncStorage.removeItem(BABY_MODE_KEY);
    setBabyMode(false);
  }, []);

  const toggleBabyMode = useCallback(async () => {
    const current = await AsyncStorage.getItem(BABY_MODE_KEY);
    if (current === 'true') {
      await AsyncStorage.removeItem(BABY_MODE_KEY);
      setBabyMode(false);
    } else {
      await AsyncStorage.setItem(BABY_MODE_KEY, 'true');
      setBabyMode(true);
    }
  }, []);

  return { babyMode, enableBabyMode, disableBabyMode, toggleBabyMode };
}

export async function getBabyMode(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(BABY_MODE_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}
