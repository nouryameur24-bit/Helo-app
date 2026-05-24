/**
 * useContributions — reactive read of the local Ghost Capture counter.
 *
 * Reloads on mount AND on screen focus (via expo-router's useFocusEffect)
 * so the Profile badge updates the moment the user returns from a verdict
 * screen where a fresh contribution was saved. AsyncStorage has no native
 * change subscription, so polling-on-focus is the canonical RN pattern.
 *
 * The mirror count we keep in AsyncStorage is intentionally a separate
 * source from server-side `useProfileStats` (which queries Supabase
 * `community_submissions`). Reasons:
 *   • Offline mums still see their badge progress.
 *   • Latency-free updates after a save — no round-trip required.
 *   • Server count is authoritative for the stats grid, but the badge
 *     itself only needs "fast and felt", not "accurate to the millisecond".
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { contributionTier, getContributionCount } from '@/lib/contributions';

export function useContributions() {
  const [count, setCount] = useState(0);

  const reload = useCallback(() => {
    getContributionCount().then(setCount).catch(() => {
      // Read failure leaves count at 0 — badge simply renders nothing.
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

  return { count, tier: contributionTier(count), reload };
}
