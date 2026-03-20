/**
 * lib/purchases.ts — RevenueCat wrapper
 *
 * All calls are wrapped in try/catch so the app never crashes if:
 *  - RevenueCat isn't configured yet (missing API key)
 *  - Running on web (native module unavailable)
 *  - Running in Expo Go (native build required for IAP)
 *
 * Replace EXPO_PUBLIC_RC_KEY_IOS / EXPO_PUBLIC_RC_KEY_ANDROID in your
 * environment with your actual RevenueCat API keys.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PREMIUM_KEY = '@helo_is_premium';

// ─── Product / Entitlement IDs ────────────────────────────────────────────────
// These must match what you configure in the RevenueCat dashboard.
export const RC_ENTITLEMENT_ID = 'helo_premium';
export const PRODUCT_IDS = {
  monthly:  'helo_monthly_499',
  annual:   'helo_annual_2999',
  lifetime: 'helo_lifetime_5999',
} as const;

export type PlanId = keyof typeof PRODUCT_IDS;

// ─── Plan metadata (display only) ────────────────────────────────────────────
export interface Plan {
  id: PlanId;
  label: string;
  price: string;
  pricePerMonth: string | null;
  badge: string | null;
  trial: string | null;
  highlight: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'monthly',
    label: 'Mensuel',
    price: '4,99 €',
    pricePerMonth: '4,99 €/mois',
    badge: null,
    trial: null,
    highlight: false,
  },
  {
    id: 'annual',
    label: 'Annuel',
    price: '29,99 €',
    pricePerMonth: '2,49 €/mois',
    badge: 'Populaire',
    trial: '7 jours offerts',
    highlight: true,
  },
  {
    id: 'lifetime',
    label: 'À vie',
    price: '59,99 €',
    pricePerMonth: null,
    badge: 'Meilleure offre',
    trial: null,
    highlight: false,
  },
];

// ─── RC loader (lazy-loaded to avoid web crash) ───────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Purchases: any = null;

async function getRC() {
  if (Platform.OS === 'web') return null;
  if (Purchases) return Purchases;
  try {
    // Dynamic import to avoid crashing on web
    const mod = await import('react-native-purchases');
    Purchases = mod.default;
    return Purchases;
  } catch {
    return null;
  }
}

// ─── Initialize ───────────────────────────────────────────────────────────────
let _initialized = false;

export async function configurePurchases(): Promise<void> {
  if (_initialized || Platform.OS === 'web') return;
  const RC = await getRC();
  if (!RC) return;
  try {
    const apiKey =
      Platform.OS === 'ios'
        ? (process.env.EXPO_PUBLIC_RC_KEY_IOS ?? '')
        : (process.env.EXPO_PUBLIC_RC_KEY_ANDROID ?? '');

    if (!apiKey) {
      console.warn('[Hēlo Purchases] No RC API key set — IAP disabled.');
      return;
    }
    RC.configure({ apiKey });
    _initialized = true;
  } catch (e) {
    console.warn('[Hēlo Purchases] configure failed:', e);
  }
}

// ─── Check current entitlement ────────────────────────────────────────────────
export async function fetchIsPremium(): Promise<boolean> {
  // Fast path: local cache
  const cached = await AsyncStorage.getItem(PREMIUM_KEY);
  if (cached === 'true') return true;

  const RC = await getRC();
  if (!RC || !_initialized) return false;

  try {
    const info = await RC.getCustomerInfo();
    const active = info?.entitlements?.active ?? {};
    const premium = !!active[RC_ENTITLEMENT_ID];
    // Sync to local cache
    await AsyncStorage.setItem(PREMIUM_KEY, premium ? 'true' : 'false');
    return premium;
  } catch {
    return false;
  }
}

// ─── Purchase a plan ─────────────────────────────────────────────────────────
export async function purchasePlan(planId: PlanId): Promise<boolean> {
  const RC = await getRC();
  if (!RC || !_initialized) {
    console.warn('[Hēlo Purchases] RC not initialized — cannot purchase.');
    return false;
  }

  try {
    const productId = PRODUCT_IDS[planId];
    const offerings = await RC.getOfferings();
    const pkg = offerings?.current?.availablePackages?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.product?.identifier === productId,
    );

    if (!pkg) {
      console.warn('[Hēlo Purchases] Package not found for', productId);
      return false;
    }

    const { customerInfo } = await RC.purchasePackage(pkg);
    const active = customerInfo?.entitlements?.active ?? {};
    const premium = !!active[RC_ENTITLEMENT_ID];
    await AsyncStorage.setItem(PREMIUM_KEY, premium ? 'true' : 'false');
    return premium;
  } catch (e: unknown) {
    // PurchasesErrorCode.purchaseCancelledError = 1
    if ((e as { code?: number })?.code === 1) return false; // user cancelled
    throw e;
  }
}

// ─── Restore purchases ────────────────────────────────────────────────────────
export async function restorePurchases(): Promise<boolean> {
  const RC = await getRC();
  if (!RC || !_initialized) return false;

  try {
    const customerInfo = await RC.restorePurchases();
    const active = customerInfo?.entitlements?.active ?? {};
    const premium = !!active[RC_ENTITLEMENT_ID];
    await AsyncStorage.setItem(PREMIUM_KEY, premium ? 'true' : 'false');
    return premium;
  } catch {
    return false;
  }
}
