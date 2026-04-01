/**
 * lib/basket.ts — Panier de scan continu (Mode Mon Panier)
 *
 * AsyncStorage key: @helo_basket
 * Stores the last scan session as a JSON array of BasketItem.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Verdict } from '@/types';

export interface BasketItem {
  barcode: string;
  name: string;
  brand: string;
  verdict: Verdict;
  verdictLabel: string;
  scanId: string;
  scannedAt: number;
}

export interface Basket {
  items: BasketItem[];
  createdAt: string;
}

const BASKET_KEY = '@helo_basket';

export async function saveBasket(items: BasketItem[]): Promise<void> {
  try {
    const basket: Basket = { items, createdAt: new Date().toISOString() };
    await AsyncStorage.setItem(BASKET_KEY, JSON.stringify(basket));
  } catch {
    // AsyncStorage write failure — basket session may not persist
  }
}

export async function loadLatestBasket(): Promise<Basket | null> {
  try {
    const raw = await AsyncStorage.getItem(BASKET_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Basket;
  } catch {
    return null;
  }
}

export async function clearBasket(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BASKET_KEY);
  } catch {
    // Non-critical — basket key will be overwritten on the next session
  }
}

export function verdictLabel(verdict: Verdict): string {
  if (verdict === 'danger') return 'Déconseillé';
  if (verdict === 'caution') return 'Vigilance';
  return 'Sûr';
}
