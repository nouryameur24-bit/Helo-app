/**
 * hooks/usePremium.ts
 *
 * Single source of truth for premium status across the app.
 * Reads from AsyncStorage cache first (fast), then reconciles with RC.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import {
  fetchIsPremium,
  PREMIUM_KEY,
  purchasePlan,
  restorePurchases,
  type PlanId,
} from '@/lib/purchases';
import { consumeScanQuota, getDailyScanCount, FREE_SCAN_LIMIT } from '@/lib/scanLimit';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface UsePremiumReturn {
  isPremium: boolean;
  isLoading: boolean;
  scanCount: number;
  scansRemaining: number;
  canScan: boolean;
  /** Hēlo Points Phase 1.5 — Si Premium est offert via redemption, expire à cette date. Null sinon. */
  bonusPremiumUntil: Date | null;
  /** Navigate to paywall if not premium. Returns true if navigation happened. */
  requirePremium: (trigger?: string) => boolean;
  /** Check scan limit for free users. Returns true if they can scan, false → paywall shown. */
  checkScanLimit: () => Promise<boolean>;
  purchase: (planId: PlanId) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Hēlo Points Phase 1.5 — Fetch bonus_premium_until depuis profiles.
 * Si > NOW(), l'user a Premium offert via redemption Hēlo Points.
 */
async function fetchBonusPremiumUntil(): Promise<Date | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('bonus_premium_until')
      .eq('id', session.user.id)  // profiles.id = auth.users.id (pas .user_id)
      .maybeSingle();
    if (error || !data?.bonus_premium_until) return null;
    const until = new Date(data.bonus_premium_until);
    return until > new Date() ? until : null;
  } catch {
    return null;
  }
}

export function usePremium(): UsePremiumReturn {
  const [isPremiumRC, setIsPremiumRC] = useState(false);
  const [bonusPremiumUntil, setBonusPremiumUntil] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scanCount, setScanCount] = useState(0);

  // Premium réel = soit RevenueCat actif, soit bonus Hēlo Points encore valide
  const isPremium = isPremiumRC || (bonusPremiumUntil !== null && bonusPremiumUntil > new Date());

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [premium, count, bonus] = await Promise.all([
        fetchIsPremium(),
        getDailyScanCount(),
        fetchBonusPremiumUntil(),
      ]);
      setIsPremiumRC(premium);
      setScanCount(count);
      setBonusPremiumUntil(bonus);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fast path: read local cache immediately for instant UI
    AsyncStorage.getItem(PREMIUM_KEY).then((v) => {
      setIsPremiumRC(v === 'true');
      setIsLoading(false);
    });
    getDailyScanCount().then(setScanCount);
    // Then reconcile with RC + Supabase bonus in background
    refresh();
  }, []);

  // Re-read cache every time the screen gains focus
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(PREMIUM_KEY).then((v) => {
        setIsPremiumRC(v === 'true');
      });
      getDailyScanCount().then(setScanCount);
      // Refresh bonus premium aussi : si user vient de redeem une récompense,
      // le profile.bonus_premium_until a changé.
      fetchBonusPremiumUntil().then(setBonusPremiumUntil);
    }, []),
  );

  const requirePremium = useCallback(
    (trigger?: string): boolean => {
      if (isPremium) return false;
      router.push({ pathname: '/paywall', params: { trigger: trigger ?? 'feature' } });
      return true;
    },
    [isPremium],
  );

  // Atomically check + consume one scan slot server-side (with offline fallback).
  // Returns true if the scan is allowed (and a slot has been consumed),
  // false if the user hit the cap (paywall is shown).
  const checkScanLimit = useCallback(async (): Promise<boolean> => {
    if (isPremium) return true;
    const { allowed, remaining } = await consumeScanQuota();
    setScanCount(FREE_SCAN_LIMIT - remaining);
    if (!allowed) {
      router.push({ pathname: '/paywall', params: { trigger: 'scan_limit' } });
      return false;
    }
    return true;
  }, [isPremium]);

  const purchase = useCallback(
    async (planId: PlanId): Promise<boolean> => {
      const success = await purchasePlan(planId);
      if (success) {
        setIsPremiumRC(true);
        await AsyncStorage.setItem(PREMIUM_KEY, 'true');
      }
      return success;
    },
    [],
  );

  const restore = useCallback(async (): Promise<boolean> => {
    const success = await restorePurchases();
    if (success) {
      setIsPremiumRC(true);
      await AsyncStorage.setItem(PREMIUM_KEY, 'true');
    }
    return success;
  }, []);

  const scansRemaining = Math.max(0, FREE_SCAN_LIMIT - scanCount);
  const canScan = isPremium || scanCount < FREE_SCAN_LIMIT;

  return {
    isPremium,
    isLoading,
    scanCount,
    scansRemaining,
    canScan,
    bonusPremiumUntil,
    requirePremium,
    checkScanLimit,
    purchase,
    restore,
    refresh,
  };
}
