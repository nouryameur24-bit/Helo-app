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

interface UsePremiumReturn {
  isPremium: boolean;
  isLoading: boolean;
  scanCount: number;
  scansRemaining: number;
  canScan: boolean;
  /** Navigate to paywall if not premium. Returns true if navigation happened. */
  requirePremium: (trigger?: string) => boolean;
  /** Check scan limit for free users. Returns true if they can scan, false → paywall shown. */
  checkScanLimit: () => Promise<boolean>;
  purchase: (planId: PlanId) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
  /**
   * Étape 3 — M2 : bypass dev pour tester le flow Premium sans passer par
   * RevenueCat / l'IAP. Active la clé locale PREMIUM_KEY uniquement.
   * À masquer/retirer pour le build production.
   */
  devActivate: () => Promise<void>;
}

export function usePremium(): UsePremiumReturn {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [scanCount, setScanCount] = useState(0);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [premium, count] = await Promise.all([
        fetchIsPremium(),
        getDailyScanCount(),
      ]);
      setIsPremium(premium);
      setScanCount(count);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fast path: read local cache immediately for instant UI
    AsyncStorage.getItem(PREMIUM_KEY).then((v) => {
      setIsPremium(v === 'true');
      setIsLoading(false);
    });
    getDailyScanCount().then(setScanCount);
    // Then reconcile with RC in background
    refresh();
  }, []);

  // Re-read cache every time the screen gains focus so the DEV toggle in
  // profile (or any other instance that flips PREMIUM_KEY) propagates to all
  // mounted hook instances. Without this each screen kept its initial state
  // until next mount, so scan/paywall would still see the stale value.
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(PREMIUM_KEY).then((v) => {
        setIsPremium(v === 'true');
      });
      getDailyScanCount().then(setScanCount);
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
        setIsPremium(true);
        await AsyncStorage.setItem(PREMIUM_KEY, 'true');
      }
      return success;
    },
    [],
  );

  const devActivate = useCallback(async (): Promise<void> => {
    await AsyncStorage.setItem(PREMIUM_KEY, 'true');
    setIsPremium(true);
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    const success = await restorePurchases();
    if (success) {
      setIsPremium(true);
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
    requirePremium,
    checkScanLimit,
    purchase,
    restore,
    refresh,
    devActivate,
  };
}
