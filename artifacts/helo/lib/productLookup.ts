import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getLocalIngredients, matchIngredientsLocal } from '@/lib/offline';
import { logError } from '@/lib/logger';
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
  const label = base.includes('openbeauty') ? 'OBF' : 'OFF';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `${base}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`;
    if (__DEV__) console.warn(`[Hēlo cascade] ${label} → fetching ${url}`);
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 404) {
      if (__DEV__) console.warn(`[Hēlo cascade] ${label} → 404 (not found)`);
      return null;
    }
    if (!response.ok) {
      if (__DEV__) console.warn(`[Hēlo cascade] ${label} → HTTP ${response.status}`);
      return null;
    }
    const json = (await response.json()) as OFFResponse;
    if (__DEV__) console.warn(`[Hēlo cascade] ${label} → status=${json.status}, hasProduct=${!!json.product}`);
    return json;
  } catch (error: unknown) {
    if (__DEV__) {
      const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      console.warn(`[Hēlo cascade] ${label} → fetch error: ${msg}`);
    }
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

// ─── 2a. Local Supabase products table (12k+ curated entries) ───────────────
// Checked FIRST — these are pre-vetted, ingredient-linked products that load
// instantly from our own DB without any third-party API roundtrip.

async function checkLocalProducts(barcode: string): Promise<ProductData | null> {
  if (!isSupabaseConfigured) {
    if (__DEV__) console.warn('[Hēlo cascade] LOCAL → skipped (Supabase not configured)');
    return null;
  }
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('barcode, name, brand, ingredients_raw, image_url')
      .eq('barcode', barcode)
      .maybeSingle();

    if (error) {
      if (__DEV__) console.warn(`[Hēlo cascade] LOCAL → query error: ${error.message}`);
      return null;
    }
    if (!product) {
      if (__DEV__) console.warn(`[Hēlo cascade] LOCAL → not found for ${barcode}`);
      return null;
    }

    const ingredientsRaw = (product.ingredients_raw ?? '').toString().trim();
    if (!ingredientsRaw) {
      if (__DEV__) console.warn(`[Hēlo cascade] LOCAL → found "${product.name}" but ingredients_raw empty, falling through`);
      return null;
    }

    const ingredientsList = parseIngredients(ingredientsRaw);
    if (ingredientsList.length === 0) {
      if (__DEV__) console.warn(`[Hēlo cascade] LOCAL → found but parseIngredients returned [] for ${barcode}`);
      return null;
    }

    if (__DEV__) console.warn(`[Hēlo cascade] LOCAL → ✓ found "${product.name}" (${ingredientsList.length} ingredients)`);
    return {
      name: product.name ?? 'Produit',
      brand: product.brand ?? '',
      imageUrl: product.image_url ?? null,
      ingredientsRaw,
      ingredientsList,
      source: 'helo' as ProductData['source'],
    };
  } catch (err) {
    logError('productLookup.checkLocalProducts', err, { barcode });
    return null;
  }
}

// ─── 2b. Community submissions fallback ──────────────────────────────────────

async function checkCommunitySubmissions(barcode: string): Promise<ProductData | null> {
  if (!isSupabaseConfigured) {
    if (__DEV__) console.warn('[Hēlo cascade] COMMUNITY → skipped (Supabase not configured)');
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('community_submissions')
      .select('name, category, metadata, status')
      .eq('barcode', barcode)
      .in('status', ['auto_captured', 'community_verified'])
      .not('metadata->ingredients_raw', 'is', null)
      .maybeSingle();

    if (error) {
      if (__DEV__) console.warn(`[Hēlo cascade] COMMUNITY → query error: ${error.message}`);
      return null;
    }
    if (!data) {
      if (__DEV__) console.warn(`[Hēlo cascade] COMMUNITY → not found for ${barcode}`);
      return null;
    }
    const meta = data.metadata as { ingredients_raw?: string; [k: string]: unknown };
    if (!meta?.ingredients_raw) {
      if (__DEV__) console.warn(`[Hēlo cascade] COMMUNITY → found but no metadata.ingredients_raw`);
      return null;
    }

    const ingredientsList = parseIngredients(meta.ingredients_raw);
    if (ingredientsList.length === 0) {
      if (__DEV__) console.warn(`[Hēlo cascade] COMMUNITY → parseIngredients returned []`);
      return null;
    }

    if (__DEV__) console.warn(`[Hēlo cascade] COMMUNITY → ✓ found "${data.name}" (${ingredientsList.length} ingredients)`);
    return {
      name: data.name ?? 'Produit communautaire',
      brand: undefined,
      imageUrl: null,
      ingredientsList,
      ingredientsRaw: meta.ingredients_raw,
      source: 'community' as ProductData['source'],
    };
  } catch (e) {
    if (__DEV__) console.warn(`[Hēlo cascade] COMMUNITY → exception: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

// ─── Ghost Capture save — atomic via RPC, fallback to manual upsert ──────────
//
// Uses the `ghost_capture_upsert` Postgres function (see
// supabase/migration-ghost-capture.sql) for an ATOMIC scan_count increment +
// auto-promotion to community_verified at >= 3 scans.
//
// If the RPC is missing (older DB without the migration applied), falls back
// to a best-effort client-side read-then-write. Both paths return false on
// any persistence error so the boolean contract is real.
export async function ghostCaptureSave(params: {
  barcode: string;
  productName: string;
  category: string;
  ocrText: string;
  verdict: VerdictResult;
  trimester: Phase;
}): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const { error: rpcError } = await supabase.rpc('ghost_capture_upsert', {
      p_barcode:      params.barcode,
      p_product_name: params.productName,
      p_category:     params.category,
      p_ocr_text:     params.ocrText,
      p_ai_verdict:   params.verdict as unknown as Record<string, unknown>,
      p_trimester:    String(params.trimester),
    });

    if (!rpcError) return true;

    // RPC missing (PGRST202) or schema mismatch — fall through to client logic
    if (__DEV__) console.warn('[Hēlo] ghost_capture_upsert RPC failed, falling back:', rpcError.message);
  } catch (err) {
    // Network error on RPC — try client-side fallback
    logError('productLookup.ghostCaptureSave.rpc', err, { barcode: params.barcode });
  }

  // ── Client-side fallback (best-effort, non-atomic) ─────────────────────────
  try {
    const { data: existing, error: selectError } = await supabase
      .from('community_submissions')
      .select('id, metadata')
      .eq('barcode', params.barcode)
      .in('status', ['auto_captured', 'community_verified'])
      .maybeSingle();
    if (selectError) return false;

    if (existing) {
      const meta = (existing.metadata ?? {}) as Record<string, unknown>;
      const prevCount = typeof meta.scan_count === 'number' ? meta.scan_count : 1;
      const scanCount = prevCount + 1;
      const newStatus = scanCount >= 3 ? 'community_verified' : 'auto_captured';
      const { error: updateError } = await supabase
        .from('community_submissions')
        .update({
          status: newStatus,
          metadata: {
            ...meta,
            scan_count: scanCount,
            last_scanned: new Date().toISOString(),
          },
        })
        .eq('id', existing.id);
      return !updateError;
    }

    const { error: insertError } = await supabase.from('community_submissions').insert({
      barcode: params.barcode,
      name: params.productName,
      brand: '',
      category: params.category,
      product_photo_url: null,
      ingredients_photo_url: null,
      status: 'auto_captured',
      metadata: {
        ingredients_raw: params.ocrText,
        ai_verdict: params.verdict,
        trimester: params.trimester,
        scan_count: 1,
        first_captured: new Date().toISOString(),
      },
    });
    return !insertError;
  } catch (err) {
    logError('productLookup.ghostCaptureSave.fallback', err, { barcode: params.barcode });
    return false;
  }
}

// ─── 2b. Update Ghost Capture row with user-provided name + brand ────────────
// Called from the verdict screen's contribution card when the user opts in to
// label their ghost-captured product after seeing the verdict. Promotes the
// row to 'community_verified' since a human-curated label is stronger signal
// than the scan_count threshold alone.
export async function updateGhostCaptureNameBrand(params: {
  barcode: string;
  name: string;
  brand: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const name = params.name.trim();
  const brand = params.brand.trim();
  if (!name && !brand) return false;

  try {
    const { data: existing, error: selectError } = await supabase
      .from('community_submissions')
      .select('id, name, brand')
      .eq('barcode', params.barcode)
      .in('status', ['auto_captured', 'community_verified'])
      .maybeSingle();
    if (selectError || !existing) return false;

    const updates: Record<string, unknown> = {
      status: 'community_verified',
    };
    if (name) updates.name = name;
    if (brand) updates.brand = brand;

    const { error: updateError } = await supabase
      .from('community_submissions')
      .update(updates)
      .eq('id', existing.id);
    return !updateError;
  } catch (err) {
    logError('productLookup.updateGhostCaptureNameBrand', err, { barcode: params.barcode });
    return false;
  }
}

// ─── 3. Fetch product by barcode — cascades community → OFF → OBF ────────────
// community_submissions is checked FIRST so ghost-captured products load
// instantly for the next user (no remote API roundtrip needed).

export async function fetchProductByBarcode(barcode: string): Promise<ProductData | null> {
  if (__DEV__) console.warn(`[Hēlo cascade] === START barcode=${barcode} ===`);

  // 1st attempt: local Supabase products table (curated, pre-vetted, ~12k entries)
  const local = await checkLocalProducts(barcode);
  if (local) return local;

  // 2nd attempt: community submissions (auto_captured + community_verified)
  const community = await checkCommunitySubmissions(barcode);
  if (community) return community;

  // 3rd attempt: Open Food Facts (food products)
  const offData = await fetchFromAPI(OFF_API_BASE, barcode);
  if (offData) {
    const product = parseOFFResponse(offData, 'openfoodfacts');
    if (product && product.ingredientsList.length > 0) {
      if (__DEV__) console.warn(`[Hēlo cascade] OFF → ✓ parsed "${product.name}" (${product.ingredientsList.length} ingredients)`);
      return product;
    }
    if (__DEV__) console.warn(`[Hēlo cascade] OFF → response received but parseOFFResponse returned ${product ? 'empty ingredients' : 'null'}`);
  }

  // 4th attempt: Open Beauty Facts (cosmetics)
  const obfData = await fetchFromAPI(OBF_API_BASE, barcode);
  if (obfData) {
    const product = parseOFFResponse(obfData, 'openbeautyfacts');
    if (product && product.ingredientsList.length > 0) {
      if (__DEV__) console.warn(`[Hēlo cascade] OBF → ✓ parsed "${product.name}" (${product.ingredientsList.length} ingredients)`);
      return product;
    }
    if (__DEV__) console.warn(`[Hēlo cascade] OBF → response received but parseOFFResponse returned ${product ? 'empty ingredients' : 'null'}`);
  }

  if (__DEV__) console.warn(`[Hēlo cascade] === FAIL: nothing found for ${barcode} → Ghost Capture ===`);
  return null;
}

// ─── 3. Parse ingredients list ───────────────────────────────────────────────

// Patterns that look like nutritional values, not ingredients
// Matches strings that look like nutrition-table labels rather than actual ingredients.
// Note: must NOT include single tokens like "sodium" or "sel" because those are
// also valid INCI prefixes ("Sodium benzoate", "Sodium lauryl sulfate", etc.).
const NUTRITION_PATTERNS = /\b(mati[èe]res?\s+grasses?|acides?\s+gras\s+satur[ée]s?|fibres?\s+alimentaires?|valeur\s+[ée]nerg[ée]tique|sels?\s+min[ée]raux|dont\s+(?:sucres?|acides?))\b/i;

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseIngredients(ingredientsText: string): string[] {
  if (!ingredientsText.trim()) return [];

  let text = ingredientsText;

  // Remove content in parentheses (sub-ingredients / percentages)
  text = text.replace(/\([^)]*\)/g, '');
  // Remove orphan stray closing parens left over from malformed inputs
  text = text.replace(/[()]/g, '');

  // Remove percentage patterns like "12%", "12,5%"
  text = text.replace(/\d+[,.]?\d*\s*%/g, '');

  // Remove asterisks (organic markers), stars, daggers
  text = text.replace(/[*†‡§#]/g, '');

  // Split on commas and semicolons
  const raw = text.split(/[,;]/);

  const cleaned = raw
    .map((s) => s.trim())
    .map((s) => s.replace(/^[\s\-–—:.]+/, '').trim())
    .map((s) => s.replace(/[\s\-–—:.]+$/, '').trim())
    .filter((s) => s.length >= 2)
    // Drop anything that contains a "label: number" pattern (e.g. "saturés: 0")
    .filter((s) => !/:\s*\d/.test(s))
    // Drop "dont …" sub-nutritional facts
    .filter((s) => !/^dont\b/i.test(s))
    // Drop pure nutritional labels
    .filter((s) => !NUTRITION_PATTERNS.test(s))
    // Dedup using lowercase form
    .filter((s, i, arr) => arr.findIndex((o) => o.toLowerCase() === s.toLowerCase()) === i)
    // Capitalize first letter for display, downstream matching is case-insensitive
    .map(capitalizeFirst);

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
  ).catch((err) => {
    logError('productLookup.cacheWrite', err);
  });

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
