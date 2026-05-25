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
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { findMatchingRow, matchSafeOverride } from '@/lib/ingredientMatch';

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
      .select('barcode, name, brand, ingredients_raw, image_url, source, pregnancy_risks')
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
    // Lot 19-D1 — On expose les pregnancy_risks pré-calculés Supabase
    // (listeria, toxo, mercure, alcool, caféine, etc.). Permet warnings
    // contextuels instantanés au verdict screen.
    const rawRisks = product.pregnancy_risks as Record<string, unknown> | null | undefined;
    const pregnancyRisks = rawRisks && Object.keys(rawRisks).length > 0
      ? (rawRisks as ProductData['pregnancyRisks'])
      : undefined;
    return {
      name: product.name ?? 'Produit',
      brand: product.brand ?? '',
      imageUrl: product.image_url ?? null,
      ingredientsRaw,
      ingredientsList,
      source: (product.source === 'helo_restaurant'
        ? 'helo_restaurant'
        : 'helo') as ProductData['source'],
      pregnancyRisks,
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
    // Lot 18-06 — Expose scan_count pour le badge "X mamas contribué"
    const scanCount = typeof meta.scan_count === 'number' ? meta.scan_count : undefined;
    return {
      name: data.name ?? 'Produit communautaire',
      brand: undefined,
      imageUrl: null,
      ingredientsList,
      ingredientsRaw: meta.ingredients_raw,
      source: 'community' as ProductData['source'],
      communityContributionCount: scanCount,
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
  /** Lot 18-03 — Optional user_id pour le rate limit per-user dans le
   *  RPC (1 contribution / user / barcode / 24h). Si absent, rate limit
   *  désactivé (l'anon "tous les users" sera trackée). */
  userId?: string | null;
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
      // Lot 18-03 — passé via le RPC pour rate limit
      p_user_id:      params.userId ?? null,
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
      // Lot 18-02 — Threshold 3 → 5 scans pour auto-verify. Cohérent avec
      // la nouvelle version du RPC (cf. migration-lot18-ghost-capture-safety.sql).
      const newStatus = scanCount >= 5 ? 'community_verified' : 'auto_captured';
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

  // 3rd attempt — OFF (food) + OBF (cosmetics) en PARALLÈLE.
  // Lot 17-03 : avant, OFF puis OBF séquentiels = jusqu'à 16s worst case
  // si OFF timeout (8s) puis OBF timeout (8s). Maintenant les 2 fetch sont
  // lancés en même temps via Promise.all — on prend le premier non-null
  // qui a des ingrédients. Latence worst case ÷ 2 (8s max au lieu de 16s).
  // Best case identique (1.5s).
  //
  // Note : on ne `Promise.any()` pas pour pouvoir préférer OFF (food) en
  // priorité quand les deux répondent — la quasi-totalité des scans sont
  // alimentaires, OBF est un fallback.
  const [offData, obfData] = await Promise.all([
    fetchFromAPI(OFF_API_BASE, barcode),
    fetchFromAPI(OBF_API_BASE, barcode),
  ]);

  if (offData) {
    const product = parseOFFResponse(offData, 'openfoodfacts');
    if (product && product.ingredientsList.length > 0) {
      if (__DEV__) console.warn(`[Hēlo cascade] OFF → ✓ parsed "${product.name}" (${product.ingredientsList.length} ingredients)`);
      return product;
    }
    if (__DEV__) console.warn(`[Hēlo cascade] OFF → response received but parseOFFResponse returned ${product ? 'empty ingredients' : 'null'}`);
  }

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

// HOTFIX 2 (post-CHUNK 7) — synchronisé avec
// artifacts/api-server/src/lib/parseIngredients.ts. Toute modification doit
// être appliquée AUX DEUX FICHIERS pour conserver le même verdict mobile/BFF.
function normalizeAllergenCaps(s: string): string {
  return s.replace(/\b([A-ZÀ-Ÿ]{3,})\b/g, (m) => m.toLowerCase());
}

function extractParenthesizedSubItems(text: string): string[] {
  const subs: string[] = [];
  const re = /\(([^()]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    subs.push(m[1]);
  }
  return subs;
}

export function parseIngredients(ingredientsText: string): string[] {
  if (!ingredientsText.trim()) return [];

  // 1) Pré-nettoyage GLOBAL (pourcentages, marqueurs).
  const preCleaned = ingredientsText
    .replace(/\d+[,.]?\d*\s*%/g, '')
    .replace(/[*†‡§#]/g, '');

  // 2) Extraire les sous-ingrédients entre parens APRÈS pré-nettoyage.
  const parenSubItems = extractParenthesizedSubItems(preCleaned);

  // 3) Nettoyer la chaîne principale (supprimer les parens elles-mêmes).
  const text = preCleaned.replace(/\([^)]*\)/g, '').replace(/[()]/g, '');

  // 4) Concat items principaux + sous-items extraits.
  const combined = parenSubItems.length > 0
    ? `${text} ; ${parenSubItems.join(' ; ')}`
    : text;

  const cleaned = combined
    .split(/[,;.\n]+/)
    .map((s) => s.trim())
    .map((s) => s.replace(/^[\s\-–—:.]+/, '').trim())
    // v4 — Retire les préfixes de langue OFF type "en:", "fr:", "en " (cas
    // où OFF renvoie des tags i18n mal stripés dans ingredients_text_fr).
    // DOIT rester aligné avec artifacts/api-server/src/lib/parseIngredients.ts.
    .map((s) => s.replace(/^(en|fr|de|es|it|nl|pt)\s*:?\s+/i, '').trim())
    .map((s) => s.replace(/[\s\-–—:.]+$/, '').trim())
    .map(normalizeAllergenCaps) // SOJA → soja, LAIT → lait
    .filter((s) => s.length >= 2)
    .filter((s) => !/:\s*\d/.test(s))
    .filter((s) => !/^dont\b/i.test(s))
    .filter((s) => !NUTRITION_PATTERNS.test(s))
    .filter((s, i, arr) => arr.findIndex((o) => o.toLowerCase() === s.toLowerCase()) === i)
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

// v4 Lot 12 — Import dynamique pour éviter une dépendance circulaire avec
// preferenceMatcher (qui importe les types depuis @/types).
async function applyPrefsToMatches(matches: MatchResult[]): Promise<MatchResult[]> {
  try {
    const { applyPersonalPreferences } = await import('@/lib/preferenceMatcher');
    const { matches: updated } = await applyPersonalPreferences(matches);
    return updated;
  } catch {
    return matches; // fallback silencieux — si le module fail, on renvoie l'original
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
    const local = await matchIngredientsLocal(ingredientsList, phase);
    return applyPrefsToMatches(local);
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
    STORAGE_KEYS.ingredientsDb,
    JSON.stringify({ ingredients: dbIngredients, downloadedAt: Date.now() }),
  ).catch((err) => {
    logError('productLookup.cacheWrite', err);
  });

  const supabaseMatches: MatchResult[] = ingredientsList.map((ingredientName): MatchResult => {
    // Whitelist d'exceptions safe (vinaigre d'alcool, alcools gras, etc.)
    // — court-circuite la règle d'éviction du dictionnaire.
    if (matchSafeOverride(ingredientName)) {
      return { ingredientName, matched: true, riskLevel: 'safe' };
    }

    const matched = findMatchingRow(
      ingredientName,
      dbIngredients as IngredientData[],
    );

    if (matched) {
      const riskLevel = getRiskForPhase(matched, phase);
      return { ingredientName, matched: true, ingredient: matched, riskLevel };
    }

    return { ingredientName, matched: false, riskLevel: 'no_signal' };
  });
  return applyPrefsToMatches(supabaseMatches);
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
  const totalCount = matches.length;

  // ── Lot 17-01 : transparence sur l'incertitude ─────────────────────────
  // Cas critiques pour une app grossesse :
  //   1. TOUS les ingrédients sont inconnus (0 match déterministe + 0 match AI)
  //      → on ne SAIT pas, on n'a juste pas trouvé de risque. C'est dangereux
  //      d'afficher "safe" comme si on était certains.
  //   2. La majorité sont inconnus (>50%) → fiabilité compromise.
  // L'UI lit ces deux champs pour afficher une bannière jaune appropriée.
  const allIngredientsUnknown = totalCount > 0 && noSignalCount === totalCount;
  const unknownRatio = totalCount > 0 ? noSignalCount / totalCount : 0;

  // ── Lot 17-02 : cross-check allergies déclarées ─────────────────────────
  // Si un ingrédient a été tagué par applyPersonalPreferences avec une
  // allergie ("Arachide", "Lait", etc.), on dédoublonne les labels uniques
  // et on les remonte au VerdictResult. L'UI affichera alors une bannière
  // ROUGE bloquante pour empêcher l'achat involontaire d'un allergène.
  const allergySet = new Set<string>();
  for (const m of matches) {
    if (m.matchedAllergies) {
      for (const allergy of m.matchedAllergies) {
        allergySet.add(allergy);
      }
    }
  }
  const allergyWarnings = allergySet.size > 0 ? Array.from(allergySet) : undefined;

  return {
    verdict,
    flaggedIngredients,
    noSignalCount,
    safeCount,
    totalCount,
    allIngredientsUnknown,
    unknownRatio,
    ...(allergyWarnings ? { allergyWarnings } : {}),
  };
}
