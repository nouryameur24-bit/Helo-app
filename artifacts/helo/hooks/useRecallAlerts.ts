import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { scheduleNotification } from '@/lib/notifications';
import {
  checkShelfForRecalls,
  fetchRecentRecalls,
  type RecallMatch,
  type RappelConsoRecord,
} from '@/lib/rappelConso';

const LAST_CHECK_KEY = '@helo_recall_last_check';
const ACTIVE_ALERT_KEY = '@helo_recall_active_alert';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day

interface RawShelfItem {
  barcode?: string;
  productName?: string;
  brand?: string;
}

export interface RecallAlertState {
  match: RecallMatch;
  seenAt: number;
}

export function useRecallAlerts(isPremium: boolean) {
  const [activeAlert, setActiveAlert] = useState<RecallAlertState | null>(null);
  const [checking, setChecking] = useState(false);

  const dismiss = useCallback(async () => {
    setActiveAlert(null);
    await AsyncStorage.removeItem(ACTIVE_ALERT_KEY).catch(() => {});
  }, []);

  const removeFromShelf = useCallback(
    async (barcode?: string) => {
      try {
        const raw = (await AsyncStorage.getItem('@helo_shelf')) ?? '[]';
        const shelf: RawShelfItem[] = JSON.parse(raw);
        const updated = shelf.filter((i) => i.barcode !== barcode);
        await AsyncStorage.setItem('@helo_shelf', JSON.stringify(updated));
      } catch {
      }
      await dismiss();
    },
    [dismiss],
  );

  const runCheck = useCallback(async () => {
    if (!isPremium) return;

    try {
      const lastRaw = await AsyncStorage.getItem(LAST_CHECK_KEY);
      const lastCheck = lastRaw ? parseInt(lastRaw, 10) : 0;
      const now = Date.now();

      if (now - lastCheck < CHECK_INTERVAL_MS) {
        // Not yet due — but restore persisted active alert if any
        const persistedRaw = await AsyncStorage.getItem(ACTIVE_ALERT_KEY);
        if (persistedRaw) {
          const persisted: RecallAlertState = JSON.parse(persistedRaw);
          setActiveAlert(persisted);
        }
        return;
      }

      setChecking(true);

      const shelfRaw = (await AsyncStorage.getItem('@helo_shelf')) ?? '[]';
      const shelf: RawShelfItem[] = JSON.parse(shelfRaw);

      if (shelf.length === 0) {
        await AsyncStorage.setItem(LAST_CHECK_KEY, String(now));
        return;
      }

      const recalls = await fetchRecentRecalls();
      const matches = checkShelfForRecalls(shelf, recalls);

      await AsyncStorage.setItem(LAST_CHECK_KEY, String(now));

      if (matches.length > 0) {
        const state: RecallAlertState = { match: matches[0], seenAt: now };
        await AsyncStorage.setItem(ACTIVE_ALERT_KEY, JSON.stringify(state));
        setActiveAlert(state);

        // Push notification
        await scheduleNotification({
          type: 'recall_alert',
          title: '⚠️ Alerte rappel produit',
          body: `${matches[0].recall.libelle} (${matches[0].recall.marque_produit}) — ${matches[0].recall.motif_rappel}`,
          data: { barcode: matches[0].product.barcode ?? '' },
        }).catch(() => {});
      } else {
        await AsyncStorage.removeItem(ACTIVE_ALERT_KEY).catch(() => {});
      }
    } catch {
    } finally {
      setChecking(false);
    }
  }, [isPremium]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  return { activeAlert, checking, dismiss, removeFromShelf, runCheck };
}

// ─── Single-barcode recall check (used on verdict screen) ─────────────────────
export async function fetchRecallForBarcode(
  barcode: string,
): Promise<RappelConsoRecord | null> {
  try {
    const recalls = await fetchRecentRecalls();
    const code = parseInt(barcode, 10);
    if (isNaN(code)) return null;
    return recalls.find((r) => r.gtin === code) ?? null;
  } catch {
    return null;
  }
}
