import { swallow } from '@/lib/swallow';
/**
 * useOffline — Détection de la connectivité et synchronisation hors-ligne.
 *
 * Surveille l'état réseau via NetInfo et déclenche automatiquement :
 *  - downloadIngredientsDB() au premier lancement premium (téléchargement de la DB locale)
 *  - syncOfflineScans() à la reconnexion (envoi des scans en file d'attente)
 *
 * Réserve le mode hors-ligne aux utilisateurs Premium.
 * La date de dernière synchronisation est affichée dans l'UI pour transparence.
 *
 * @returns {UseOfflineReturn} isOffline, lastSync, isSyncing, syncNow, downloadProgress
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';

import { downloadIngredientsDB, LAST_SYNC_KEY, syncOfflineScans } from '@/lib/offline';
import { getEffectivePremium } from '@/lib/premiumStatus';

interface UseOfflineReturn {
  isOffline: boolean;
  lastSync: Date | null;
  syncComplete: boolean;
  syncNow: () => Promise<boolean>;
}

export function useOffline(): UseOfflineReturn {
  const [isOffline, setIsOffline] = useState<boolean | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncComplete, setSyncComplete] = useState(false);
  const wasOfflineRef = useRef<boolean | null>(null);

  const syncNow = useCallback(async (): Promise<boolean> => {
    const result = await syncOfflineScans();
    if (result.success) {
      const now = new Date();
      setLastSync(now);
      await AsyncStorage.setItem(LAST_SYNC_KEY, now.toISOString());
      if (result.pushedCount > 0) {
        setSyncComplete(true);
        setTimeout(() => setSyncComplete(false), 3000);
      }
    }

    // Audit #3 fix : PREMIUM_KEY brut ignorait le Premium bonus Hēlo Points →
    // la DB ingrédients locale n'était jamais téléchargée pour ces users.
    getEffectivePremium().then((isPremium) => {
      if (isPremium) {
        downloadIngredientsDB().catch(swallow);
      }
    }).catch(swallow);

    return result.success;
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(LAST_SYNC_KEY).then((raw) => {
      if (raw) setLastSync(new Date(raw));
    });

    // Eagerly resolve current connectivity to avoid first-render online fallback
    NetInfo.fetch().then((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);
      wasOfflineRef.current = offline;
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);

      if (wasOfflineRef.current === true && !offline) {
        syncNow();
      }
      wasOfflineRef.current = offline;
    });

    return () => unsubscribe();
  }, [syncNow]);

  return { isOffline: isOffline ?? false, lastSync, syncComplete, syncNow };
}
