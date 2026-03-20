import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { IngredientData, MatchResult, ProductData, RiskLevel, Trimester, VerdictResult } from '@/types';

// ─── Storage keys ─────────────────────────────────────────────────────────────

const INGREDIENTS_DB_KEY = '@helo_ingredients_db';
const OFFLINE_CACHE_KEY = '@helo_offline_cache';
const OFFLINE_QUEUE_KEY = '@helo_offline_queue';
const LAST_SYNC_KEY = '@helo_last_sync';

const LRU_MAX = 500;

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface IngredientsStore {
  ingredients: IngredientData[];
  downloadedAt: number;
}

interface LRUCacheEntry {
  barcode: string;
  product: ProductData;
  verdict: VerdictResult;
  cachedAt: number;
}

interface LRUCache {
  order: string[];
  entries: Record<string, LRUCacheEntry>;
}

export interface OfflineQueueEntry {
  barcode: string;
  product: ProductData;
  verdict: VerdictResult;
  trimester: Trimester;
  scannedAt: number;
}

// ─── 1. downloadIngredientsDB ─────────────────────────────────────────────────

export async function downloadIngredientsDB(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { data, error } = await supabase.from('ingredients').select('*');
    if (error || !data) {
      console.warn('[Hēlo offline] Failed to download ingredients DB:', error?.message);
      return false;
    }
    const store: IngredientsStore = {
      ingredients: data as IngredientData[],
      downloadedAt: Date.now(),
    };
    await AsyncStorage.setItem(INGREDIENTS_DB_KEY, JSON.stringify(store));
    return true;
  } catch (err) {
    console.warn('[Hēlo offline] downloadIngredientsDB error:', err);
    return false;
  }
}

// ─── 2. getLocalIngredients ───────────────────────────────────────────────────

export async function getLocalIngredients(): Promise<IngredientData[]> {
  try {
    const raw = await AsyncStorage.getItem(INGREDIENTS_DB_KEY);
    if (!raw) return [];
    const store: IngredientsStore = JSON.parse(raw);
    return store.ingredients ?? [];
  } catch {
    return [];
  }
}

// ─── 3. matchIngredientsLocal ─────────────────────────────────────────────────

function getRiskForTrimester(ingredient: IngredientData, trimester: Trimester): RiskLevel {
  switch (trimester) {
    case 1: return ingredient.risk_level_t1;
    case 2: return ingredient.risk_level_t2;
    case 3: return ingredient.risk_level_t3;
  }
}

export async function matchIngredientsLocal(
  ingredientsList: string[],
  trimester: Trimester,
): Promise<MatchResult[]> {
  const dbIngredients = await getLocalIngredients();

  if (ingredientsList.length === 0) return [];

  return ingredientsList.map((ingredientName): MatchResult => {
    const nameLower = ingredientName.toLowerCase();

    const matched = dbIngredients.find((ing) => {
      if (ing.name.toLowerCase().includes(nameLower)) return true;
      if (ing.name_inci?.toLowerCase().includes(nameLower)) return true;
      if (ing.synonyms?.some((syn) => syn.toLowerCase().includes(nameLower))) return true;
      if (nameLower.includes(ing.name.toLowerCase())) return true;
      return false;
    });

    if (matched) {
      const riskLevel = getRiskForTrimester(matched, trimester);
      return { ingredientName, matched: true, ingredient: matched, riskLevel };
    }

    return { ingredientName, matched: false, riskLevel: 'no_signal' };
  });
}

// ─── 4. cacheProduct (LRU, max 500) ──────────────────────────────────────────

export async function cacheProduct(
  barcode: string,
  product: ProductData,
  verdict: VerdictResult,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
    const cache: LRUCache = raw ? JSON.parse(raw) : { order: [], entries: {} };

    if (cache.order.includes(barcode)) {
      cache.order = cache.order.filter((b) => b !== barcode);
    } else if (cache.order.length >= LRU_MAX) {
      const evicted = cache.order.shift();
      if (evicted) delete cache.entries[evicted];
    }

    cache.order.push(barcode);
    cache.entries[barcode] = { barcode, product, verdict, cachedAt: Date.now() };

    await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn('[Hēlo offline] cacheProduct error:', err);
  }
}

export async function getCachedProduct(
  barcode: string,
): Promise<{ product: ProductData; verdict: VerdictResult } | null> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
    if (!raw) return null;
    const cache: LRUCache = JSON.parse(raw);
    const entry = cache.entries[barcode];
    if (!entry) return null;

    // Update recency: move to tail (most recently used)
    cache.order = cache.order.filter((b) => b !== barcode);
    cache.order.push(barcode);
    await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache));

    return { product: entry.product, verdict: entry.verdict };
  } catch {
    return null;
  }
}

// ─── 5. syncOfflineScans ──────────────────────────────────────────────────────

export async function enqueueOfflineScan(entry: OfflineQueueEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: OfflineQueueEntry[] = raw ? JSON.parse(raw) : [];
    queue.push(entry);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[Hēlo offline] enqueueOfflineScan error:', err);
  }
}

export interface SyncResult {
  success: boolean;
  pushedCount: number;
}

let _isSyncing = false;

export async function syncOfflineScans(): Promise<SyncResult> {
  if (!isSupabaseConfigured) return { success: false, pushedCount: 0 };
  if (_isSyncing) return { success: false, pushedCount: 0 };
  _isSyncing = true;

  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return { success: true, pushedCount: 0 };
    const queue: OfflineQueueEntry[] = JSON.parse(raw);
    if (queue.length === 0) return { success: true, pushedCount: 0 };

    const inserts = queue.map((entry) => ({
      barcode: entry.barcode,
      product_name: entry.product.name,
      verdict: entry.verdict.verdict,
      trimester: entry.trimester,
      scanned_at: new Date(entry.scannedAt).toISOString(),
    }));

    const { error } = await supabase.from('scans').insert(inserts);
    if (error) {
      console.warn('[Hēlo offline] syncOfflineScans error:', error.message);
      return { success: false, pushedCount: 0 };
    }

    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    return { success: true, pushedCount: queue.length };
  } catch (err) {
    console.warn('[Hēlo offline] syncOfflineScans exception:', err);
    return { success: false, pushedCount: 0 };
  } finally {
    _isSyncing = false;
  }
}

export { LAST_SYNC_KEY };
