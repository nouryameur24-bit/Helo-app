import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getLocalIngredients, matchIngredientsLocal } from '@/lib/offline';
import type {
  IngredientData,
  MatchResult,
  Phase,
  ProductData,
  RiskLevel,
  VerdictResult,
} from '@/types';

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const OBF_API_BASE = 'https://world.openbeautyfacts.org/api/v2/product';
const FIELDS = 'product_name,product_name_fr,brands,image_url,image_front_url,ingredients_text_fr,ingredients_text';
const FETCH_TIMEOUT_MS = 8_000;

// ─── 1. Internal helpers ─────────────────────────────────────────────────────

interface OFFProduct {
  product_name?: string;
  product_name_fr?: string;
  brands?: string;
  image_url?: string;
  image_front_url?: string;
  ingredients_text_fr?: string;
  ingredients_text?: string;
}

interface OFFResponse {
  status: number;
  product?: OFFProduct;
}

async function fetchFromAPI(
  base: string,
  barcode: string,
): Promise<OFFResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `${base}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`;
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 404) return null;
    if (!response.ok) return null;
    return (await response.json()) as OFFResponse;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseOFFResponse(
  data: OFFResponse,
  source: ProductData['source'],
): ProductData | null {
  if (data.status === 0 || !data.product) return null;
  const p = data.product;
  const name = p.product_name_fr ?? p.product_name ?? 'Produit inconnu';
  const brand = p.brands ?? '';
  const imageUrl = p.image_front_url ?? p.image_url ?? null;
  const ingredientsRaw = p.ingredients_text_fr ?? p.ingredients_text ?? '';
  const ingredientsList = parseIngredients(ingredientsRaw);
  return { name, brand, imageUrl, ingredientsRaw, ingredientsList, source };
}

// ─── 2. Community submissions fallback ───────────────────────────────────────

async function checkCommunitySubmissions(barcode: string): Promise<ProductData | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('community_submissions')
      .select('product_name, category, metadata')
      .eq('barcode', barcode)
      .eq('status', 'auto_captured')
      .not('metadata->ingredients_raw', 'is', null)
      .maybeSingle();

    if (error || !data) return null;
    const meta = data.metadata as { ingredients_raw?: string; [k: string]: unknown };
    if (!meta?.ingredients_raw) return null;

    const ingredientsList = parseIngredients(meta.ingredients_raw);
    if (ingredientsList.length === 0) return null;

    return {
      name: data.product_name ?? 'Produit communautaire',
      brand: undefined,
      imageUrl: null,
      ingredientsList,
      ingredientsRaw: meta.ingredients_raw,
      source: 'community' as ProductData['source'],
    };
  } catch {
    return null;
  }
}

export async function ghostCaptureSave(params: {
  barcode: string;
  productName: string;
  category: string;
  ocrText: string;
  verdict: VerdictResult;
  trimester: Phase;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('community_submissions').upsert(
      {
        barcode: params.barcode,
        product_name: params.productName,
        category: params.category,
        ingredients_photo_url: null,
        status: 'auto_captured',
        metadata: {
          ingredients_raw: params.ocrText,
          ai_verdict: params.verdict,
          trimester: params.trimester,
        },
      },
      { onConflict: 'barcode', ignoreDuplicates: false },
    );
  } catch {
    // fire-and-forget — silent failure
  }
}

// ─── 3. Fetch product by barcode — cascades OFF → OBF → community ────────────

export async function fetchProductByBarcode(barcode: string): Promise<ProductData | null> {
  // 1st attempt: Open Food Facts (food products)
  const offData = await fetchFromAPI(OFF_API_BASE, barcode);
  if (offData) {
    const product = parseOFFResponse(offData, 'openfoodfacts');
    if (product) return product;
  }

  // 2nd attempt: Open Beauty Facts (cosmetics)
  const obfData = await fetchFromAPI(OBF_API_BASE, barcode);
  if (obfData) {
    const product = parseOFFResponse(obfData, 'openbeautyfacts');
    if (product) return product;
  }

  // 3rd attempt: community auto-captured submissions
  const community = await checkCommunitySubmissions(barcode);
  if (community) return community;

  return null;
}

// ─── 3. Parse ingredients list ───────────────────────────────────────────────

export function parseIngredients(ingredientsText: string): string[] {
  if (!ingredientsText.trim()) return [];

  let text = ingredientsText;

  // Remove content in parentheses (sub-ingredients / percentages)
  text = text.replace(/\([^)]*\)/g, '');

  // Remove percentage patterns like "12%", "12,5%"
  text = text.replace(/\d+[,.]?\d*\s*%/g, '');

  // Remove asterisks (organic markers), stars, daggers
  text = text.replace(/[*†‡§#]/g, '');

  // Split on commas and semicolons
  const raw = text.split(/[,;]/);

  const cleaned = raw
    .map((s) => s.trim().toLowerCase())
    .map((s) => s.replace(/^[\s\-–—:.]+/, '').trim())
    .map((s) => s.replace(/[\s\-–—:.]+$/, '').trim())
    .filter((s) => s.length >= 2)
    .filter((s, i, arr) => arr.indexOf(s) === i);

  return cleaned;
}

// ─── 4. Match ingredients — local DB first, Supabase live as fallback ────────

function getRiskForPhase(ingredient: IngredientData, phase: Phase): RiskLevel {
  switch (phase) {
    case 1: return ingredient.risk_level_t1;
    case 2: return ingredient.risk_level_t2;
    case 3: return ingredient.risk_level_t3;
    case 'breastfeeding': return ingredient.risk_level_breastfeeding ?? ingredient.risk_level_t3;
    case 'baby': return ingredient.risk_level_baby ?? 'no_signal';
  }
}

export async function matchIngredients(
  ingredientsList: string[],
  phase: Phase,
): Promise<MatchResult[]> {
  if (ingredientsList.length === 0) return [];

  // ── 1. Prefer local DB (AsyncStorage) — no network, no Supabase bandwidth ──
  const localIngredients = await getLocalIngredients();
  if (localIngredients.length > 0) {
    return matchIngredientsLocal(ingredientsList, phase);
  }

  // ── 2. Fall back to Supabase live query when local DB not yet populated ─────
  if (!isSupabaseConfigured) {
    return ingredientsList.map((ingredientName) => ({
      ingredientName,
      matched: false,
      riskLevel: 'no_signal' as RiskLevel,
    }));
  }

  const { data: dbIngredients, error } = await supabase
    .from('ingredients')
    .select('*');

  if (error || !dbIngredients) {
    if (__DEV__) console.warn('[Hēlo] Supabase match error:', error?.message);
    return ingredientsList.map((ingredientName) => ({
      ingredientName,
      matched: false,
      riskLevel: 'no_signal' as RiskLevel,
    }));
  }

  // Once fetched from Supabase, persist locally so future scans skip this query
  AsyncStorage.setItem(
    '@helo_ingredients_db',
    JSON.stringify({ ingredients: dbIngredients, downloadedAt: Date.now() }),
  ).catch(() => {});

  return ingredientsList.map((ingredientName): MatchResult => {
    const nameLower = ingredientName.toLowerCase();

    const matched = (dbIngredients as IngredientData[]).find((ing) => {
      if (ing.name.toLowerCase().includes(nameLower)) return true;
      if (ing.name_inci?.toLowerCase().includes(nameLower)) return true;
      if (ing.synonyms?.some((syn) => syn.toLowerCase().includes(nameLower))) return true;
      if (nameLower.includes(ing.name.toLowerCase())) return true;
      return false;
    });

    if (matched) {
      const riskLevel = getRiskForPhase(matched, phase);
      return { ingredientName, matched: true, ingredient: matched, riskLevel };
    }

    return { ingredientName, matched: false, riskLevel: 'no_signal' };
  });
}

// ─── 5. Compute verdict ───────────────────────────────────────────────────────

export function getVerdict(matches: MatchResult[]): VerdictResult {
  const flaggedIngredients = matches.filter(
    (m) => m.riskLevel === 'danger' || m.riskLevel === 'caution',
  );

  const hasDanger = matches.some((m) => m.riskLevel === 'danger');
  const hasCaution = matches.some((m) => m.riskLevel === 'caution');

  const verdict = hasDanger ? 'danger' : hasCaution ? 'caution' : 'safe';
  const noSignalCount = matches.filter((m) => m.riskLevel === 'no_signal').length;
  const safeCount = matches.filter((m) => m.riskLevel === 'safe').length;

  return { verdict, flaggedIngredients, noSignalCount, safeCount };
}
