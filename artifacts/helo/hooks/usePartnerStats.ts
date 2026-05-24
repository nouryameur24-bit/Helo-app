/**
 * usePartnerStats — reactive read of the local partner-scan counter.
 *
 * Mirrors the contract of `useContributions`: reloads on mount AND on
 * screen focus (via expo-router's `useFocusEffect`) so the partner home
 * badge updates the moment Thomas returns from a verdict screen where
 * a fresh scan was completed. AsyncStorage has no native change
 * subscription, so polling-on-focus is the canonical RN pattern.
 *
 * The local count we keep in AsyncStorage is intentionally separate
 * from any server-side aggregate. Reasons:
 *   • Offline partners still see their badge progress immediately.
 *   • Latency-free updates after a scan — no round-trip required.
 *   • The badge UX only needs "fast and felt", not "accurate to the row".
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { getPartnerScanCount, partnerTier, type PartnerTier } from '@/lib/partnerStats';

export type UsePartnerStatsReturn = {
  count: number;
  tier: PartnerTier;
  reload: () => void;
};

export function usePartnerStats(): UsePartnerStatsReturn {
  const [count, setCount] = useState(0);

  const reload = useCallback(() => {
    getPartnerScanCount().then(setCount).catch(() => {
      // Read failure leaves count at 0 — badge falls back to the "primer"
      // empty state, which is the right UX for a brand-new partner anyway.
    });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { count, tier: partnerTier(count), reload };
}
