/**
 * useWeeklyBrief — Indicateur de nouveauté du brief hebdomadaire.
 *
 * Compare la semaine de grossesse courante à la dernière semaine lue (AsyncStorage).
 * Retourne `isNew = true` si le brief de la semaine n'a pas encore été consulté,
 * ce qui permet d'afficher un badge de nouveauté sur l'onglet ou la carte.
 *
 * @param currentWeek - Semaine de grossesse actuelle (1-42)
 * @param storageKey  - Clé AsyncStorage personnalisée (optionnel)
 * @returns {{ isNew: boolean, markAsRead: () => Promise<void> }}
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/storageKeys';

const DEFAULT_BRIEF_READ_KEY = STORAGE_KEYS.lastBriefRead;

export function useWeeklyBrief(currentWeek: number, storageKey?: string) {
  const key = storageKey ?? DEFAULT_BRIEF_READ_KEY;
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key).then((val) => {
      const lastRead = val ? parseInt(val, 10) : -1;
      setIsNew(lastRead !== currentWeek);
    });
  }, [currentWeek, key]);

  const markAsRead = async () => {
    await AsyncStorage.setItem(key, String(currentWeek));
    setIsNew(false);
  };

  return { isNew, markAsRead };
}
