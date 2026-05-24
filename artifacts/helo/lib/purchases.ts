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

import { Config } from '@/lib/config';
import { STORAGE_KEYS } from '@/lib/storageKeys';

export const PREMIUM_KEY = STORAGE_KEYS.isPremium;

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

// Étape 3 — M2 : grille tarifaire spécifique grossesse.
// L'enveloppe "9 mois" correspond à la durée naturelle du besoin → meilleur
// rapport perçu + paiement unique = friction zéro pour la cible (femme
// enceinte qui veut sécuriser TOUTE sa grossesse sans gérer un abonnement).
export const PLANS: Plan[] = [
  {
    id: 'monthly',
    label: 'Mensuel',
    price: '9,99 €',
    pricePerMonth: '9,99 €/mois',
    badge: null,
    trial: null,
    highlight: false,
  },
  {
    id: 'annual', // RC product mapping conservé : 'annual' = formule trimestrielle ici
    label: 'Trimestriel',
    price: '24,99 €',
    pricePerMonth: '8,33 €/mois',
    badge: 'Populaire',
    trial: null,
    highlight: true,
  },
  {
    id: 'lifetime',
    label: 'Pass Sérénité 9 mois',
    price: '59,99 €',
    pricePerMonth: 'Paiement unique',
    badge: 'Meilleure offre',
    trial: null,
    highlight: false,
  },
];

// ─── Minimal RC type (avoids `any` while keeping lazy-load pattern) ──────────
interface RCPackage {
  product?: { identifier: string };
}
interface RCEntitlements {
  active: Record<string, unknown>;
}
interface RCCustomerInfo {
  entitlements: RCEntitlements;
}
interface RCOfferings {
  current?: { availablePackages?: RCPackage[] };
}
interface RCModule {
  configure(config: { apiKey: string }): void;
  getOfferings(): Promise<RCOfferings>;
  purchasePackage(pkg: RCPackage): Promise<{ customerInfo: RCCustomerInfo }>;
  getCustomerInfo(): Promise<RCCustomerInfo | null>;
  restorePurchases(): Promise<RCCustomerInfo>;
  getAppUserID(): Promise<string>;
}

// ─── RC loader (lazy-loaded to avoid web crash) ───────────────────────────────
let Purchases: RCModule | null = null;

async function getRC() {
  if (Platform.OS === 'web') return null;
  if (Purchases) return Purchases;
  try {
    // Dynamic import to avoid crashing on web
    const mod = await import('react-native-purchases');
    Purchases = mod.default as unknown as RCModule;
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
    const apiKey = Config.revenueCatKey;

    if (!apiKey) {
      if (__DEV__) console.warn('[Hēlo Purchases] No RC API key set — IAP disabled.');
      return;
    }
    RC.configure({ apiKey });
    _initialized = true;
  } catch (e) {
    if (__DEV__) console.warn('[Hēlo Purchases] configure failed:', e);
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
    if (__DEV__) console.warn('[Hēlo Purchases] RC not initialized — cannot purchase.');
    return false;
  }

  try {
    const productId = PRODUCT_IDS[planId];
    const offerings = await RC.getOfferings();
    const pkg = offerings?.current?.availablePackages?.find(
      (p: RCPackage) => p.product?.identifier === productId,
    );

    if (!pkg) {
      if (__DEV__) console.warn('[Hēlo Purchases] Package not found for', productId);
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

// ─── App User ID (RevenueCat) ─────────────────────────────────────────────────
// v4 — Exposé pour permettre au backend de valider le tier Premium côté
// serveur via RC API au lieu du header falsifiable `x-helo-is-premium`.
// Le mobile passe cet ID dans le header `x-helo-rc-user-id` ; le backend
// l'utilise pour query `GET /v1/subscribers/{id}` sur RC API.
let _cachedAppUserId: string | null = null;
export async function getAppUserID(): Promise<string | null> {
  if (_cachedAppUserId) return _cachedAppUserId;
  const RC = await getRC();
  if (!RC || !_initialized) return null;
  try {
    const id = await RC.getAppUserID();
    _cachedAppUserId = id;
    return id;
  } catch {
    return null;
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
