import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  IngredientData,
  MatchResult,
  ProductData,
  RiskLevel,
  Trimester,
  VerdictResult,
} from '@/types';

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const FETCH_TIMEOUT_MS = 10_000;

// ─── 1. Fetch product by barcode ────────────────────────────────────────────

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

export async function fetchProductByBarcode(barcode: string): Promise<ProductData | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `${OFF_API_BASE}/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_fr,brands,image_url,image_front_url,ingredients_text_fr,ingredients_text`;
    const response = await fetch(url, { signal: controller.signal });

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`OFF API error: ${response.status}`);

    const data: OFFResponse = await response.json();

    if (data.status === 0 || !data.product) return null;

    const p = data.product;
    const name = p.product_name_fr ?? p.product_name ?? 'Produit inconnu';
    const brand = p.brands ?? '';
    const imageUrl = p.image_front_url ?? p.image_url ?? null;
    const ingredientsRaw = p.ingredients_text_fr ?? p.ingredients_text ?? '';
    const ingredientsList = parseIngredients(ingredientsRaw);

    return { name, brand, imageUrl, ingredientsRaw, ingredientsList };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('La requête a expiré. Vérifiez votre connexion internet.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── 2. Parse ingredients list ───────────────────────────────────────────────

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
    // Remove leading articles and punctuation
    .map((s) => s.replace(/^[\s\-–—:.]+/, '').trim())
    // Remove trailing punctuation
    .map((s) => s.replace(/[\s\-–—:.]+$/, '').trim())
    // Remove empty strings and very short tokens (likely parsing artifacts)
    .filter((s) => s.length >= 2)
    // Deduplicate
    .filter((s, i, arr) => arr.indexOf(s) === i);

  return cleaned;
}

// ─── 3. Match ingredients against Supabase DB ───────────────────────────────

function getRiskForTrimester(ingredient: IngredientData, trimester: Trimester): RiskLevel {
  switch (trimester) {
    case 1: return ingredient.risk_level_t1;
    case 2: return ingredient.risk_level_t2;
    case 3: return ingredient.risk_level_t3;
  }
}

export async function matchIngredients(
  ingredientsList: string[],
  trimester: Trimester,
): Promise<MatchResult[]> {
  if (!isSupabaseConfigured || ingredientsList.length === 0) {
    return ingredientsList.map((ingredientName) => ({
      ingredientName,
      matched: false,
      riskLevel: 'no_signal' as RiskLevel,
    }));
  }

  // Fetch all DB ingredients once — more efficient than N individual queries
  const { data: dbIngredients, error } = await supabase
    .from('ingredients')
    .select('*');

  if (error || !dbIngredients) {
    console.warn('[Hēlo] Supabase match error:', error?.message);
    return ingredientsList.map((ingredientName) => ({
      ingredientName,
      matched: false,
      riskLevel: 'no_signal' as RiskLevel,
    }));
  }

  return ingredientsList.map((ingredientName): MatchResult => {
    const nameLower = ingredientName.toLowerCase();

    const matched = (dbIngredients as IngredientData[]).find((ing) => {
      if (ing.name.toLowerCase().includes(nameLower)) return true;
      if (ing.name_inci?.toLowerCase().includes(nameLower)) return true;
      if (ing.synonyms?.some((syn) => syn.toLowerCase().includes(nameLower))) return true;
      // Also check if DB name is contained in the ingredient string
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

// ─── 4. Compute verdict ──────────────────────────────────────────────────────

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
