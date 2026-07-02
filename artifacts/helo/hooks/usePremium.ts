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
import { STORAGE_KEYS } from '@/lib/storageKeys';
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
    // Erreur transitoire (réseau, RLS) → on renvoie null SANS toucher le cache
    // local : un blip réseau ne doit pas révoquer un bonus valide hors-ligne.
    if (error) return null;
    const raw = data?.bonus_premium_until ?? null;
    const until = raw ? new Date(raw) : null;
    const active = until !== null && until > new Date();
    // Audit #3 — write-through : getEffectivePremium() (useScan offline gate,
    // useOffline download DB) lit ce cache pour honorer le Premium offert via
    // Hēlo Points SANS réseau. Query réussie = source de vérité → on synchronise
    // le cache dans les deux sens (set si actif, clear si absent/expiré).
    if (active && until) {
      await AsyncStorage.setItem(STORAGE_KEYS.bonusPremiumUntil, until.toISOString());
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.bonusPremiumUntil);
    }
    return active ? until : null;
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
