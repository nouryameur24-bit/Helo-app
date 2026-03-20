import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';

import { downloadIngredientsDB, LAST_SYNC_KEY, syncOfflineScans } from '@/lib/offline';
import { PREMIUM_KEY } from '@/lib/purchases';

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

    AsyncStorage.getItem(PREMIUM_KEY).then((val) => {
      if (val === 'true') {
        downloadIngredientsDB().catch(() => {});
      }
    }).catch(() => {});

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
