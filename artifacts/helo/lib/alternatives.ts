import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Category, Trimester } from '@/types';

export type OriginBadge = 'pharmacy' | 'french' | 'bio' | null;

export interface AlternativeProduct {
  id: string;
  name: string;
  brand: string;
  category: Category;
  barcode: string | null;
  image_url: string | null;
  description_fr: string | null;
  /**
   * M3 — Phrase française (≤15 mots) générée par Claude pour justifier la
   * sélection de ce produit comme alternative sûre pour la phase de
   * grossesse de l'utilisatrice. Null pour les caches legacy / suggestions
   * communautaires.
   */
  reason: string | null;
  overall_risk: 'safe' | 'caution';
  price_range: string;
  popularity_count: number;
  origin_badge: OriginBadge;
  /**
   * v4 Lot 11 — Liens d'achat suggérés (affiliate-ready). Tous optionnels.
   * Frontend affiche un bouton par lien présent.
   *   - amazon : lien Amazon FR avec tag affiliate (à câbler avec Amazon Associates)
   *   - drive : lien Carrefour Drive / Monoprix Drive selon dispo
   *   - brand : lien direct du site officiel (sephora.fr, larocheposay.fr…)
   * Format vide pour l'instant côté backend ; sera rempli quand les programmes
   * affiliate seront activés (cf. roadmap monétisation passive).
   */
  purchase_links?: {
    amazon?: string;
    drive?: string;
    brand?: string;
  };
}

export interface FlaggedIngredients {
  danger: string[];
  caution: string[];
}

export interface CommunitySuggestion {
  id: string;
  name: string;
  brand: string;
  category: Category;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface ProductCandidate {
  id: string;
  name: string;
  brand: string;
  category: Category;
  barcode: string | null;
  image_url?: string | null;
  ingredients_raw?: string | null;
}

// ─── KEYWORDS ─────────────────────────────────────────────────────────────────

const PRODUCT_TYPES = [
  // Cosmetics
  'crème visage', 'crème mains', 'crème corps', 'crème solaire',
  'crème nuit', 'crème jour', 'crème anti-âge', 'crème hydratante',
  'crème pieds',
  'lait corps', 'lait visage', 'lait démaquillant', 'lait hydratant',
  'shampoing', 'après-shampoing', 'masque cheveux', 'huile cheveux',
  'gel douche', 'savon', 'pain de toilette', 'déodorant', 'parfum',
  'eau micellaire', 'eau florale', 'lotion tonique', 'tonique',
  'dentifrice', 'bain de bouche', 'fond de teint', 'mascara',
  'rouge à lèvres', 'baume lèvres', 'gloss', 'crayon', 'fard',
  'huile démaquillante', 'sérum', 'masque visage', 'gommage',
  'huile végétale', 'beurre karité', 'liniment', 'cold cream',
  'soin', 'baume',
  // Food
  'yaourt', 'fromage', 'jambon', 'saumon', 'thon', 'chocolat',
  'biscuit', 'pâte à tartiner', 'jus', 'eau', 'lait', 'beurre',
  'huile olive', 'huile colza', 'pâtes', 'riz', 'céréales',
  'soupe', 'compote', 'pain', 'viennoiserie', 'confiture',
  'miel', 'café', 'thé', 'tisane', 'soda', 'limonade',
];

export function extractProductKeywords(name: string): string[] {
  const lower = (name ?? '').toLowerCase();
  return PRODUCT_TYPES.filter((type) => lower.includes(type));
}

// ─── BRAND HEURISTICS ─────────────────────────────────────────────────────────

const PHARMACY_BRANDS = [
  'avène', 'avene', 'la roche-posay', 'roche posay',
  'mustela', 'bioderma', 'uriage', 'a-derma', 'aderma', 'klorane',
  'weleda', 'cattier', 'cetaphil', 'cerave', 'eucerin', 'ducray', 'nuxe',
];

const FRENCH_BRANDS = [
  'caudalie', 'embryolisse', 'lierac', 'sanoflore',
  'melvita', 'galenic', 'phyto', 'rené furterer',
];

function detectBio(name: string, ingredientsLower: string): boolean {
  const nameLower = (name ?? '').toLowerCase();
  // Strict: standalone word "bio" or "biologique" — avoids matching "biotine", "antibiotique".
  return /\bbio\b/.test(nameLower)
    || nameLower.includes('biologique')
    || /\bbio\b/.test(ingredientsLower);
}

// ─── TRIMESTER-SPECIFIC EXCLUSIONS ────────────────────────────────────────────

const TRIMESTER_EXTRA_EXCLUSIONS: Record<Trimester, string[]> = {
  1: ['alcool denat', 'alcohol denat', 'éthanol', 'ethanol', 'caféine', 'caffeine'],
  2: [],
  3: ['ibuprofène', 'ibuprofen', 'aspirine', 'aspirin', 'diclofenac', 'naproxen'],
};

// ─── FILTER & SCORE ───────────────────────────────────────────────────────────

// NOTE v13 — Le backend (routes/alternatives.ts) porte la logique
// faisant autorité : plancher absolu à 80 + gate adaptatif (origine + 10
// si origine < 70). Ce fallback mobile tourne UNIQUEMENT quand le backend
// est injoignable ET pour les utilisatrices premium. On ne réplique pas
// le score gate ici (drift garanti vs backend, parser ingrédients dupliqué).
// La diversification par marque/badge + exclusion danger est suffisante
// vu la rareté du chemin.
function filterAndScore(
  candidates: ProductCandidate[],
  flagged: FlaggedIngredients,
  trimester: Trimester,
  isPremium: boolean,
): AlternativeProduct[] {
  const dangerLower = flagged.danger.map((n) => n.toLowerCase()).filter((n) => n.length >= 3);
  const cautionLower = flagged.caution.map((n) => n.toLowerCase()).filter((n) => n.length >= 3);
  // Trimester-specific exclusions are a Premium benefit (free users get baseline danger exclusion only).
  const extraExclusions = isPremium ? (TRIMESTER_EXTRA_EXCLUSIONS[trimester] ?? []) : [];

  return candidates
    .map((c) => {
      const ingredientsLower = (c.ingredients_raw ?? '').toLowerCase();
      if (!ingredientsLower) return null;

      // HARD EXCLUSION: danger flagged ingredients
      if (dangerLower.some((d) => ingredientsLower.includes(d))) return null;

      // HARD EXCLUSION: trimester-specific risks
      if (extraExclusions.some((e) => ingredientsLower.includes(e))) return null;

      // SOFT PENALTY: caution flagged ingredients
      const cautionCount = cautionLower.filter((ci) => ingredientsLower.includes(ci)).length;

      // QUALITY BONUS — applies to everyone
      const brand = (c.brand ?? '').toLowerCase();
      let bonusScore = 0;
      let originBadge: OriginBadge = null;

      if (PHARMACY_BRANDS.some((b) => brand.includes(b))) {
        bonusScore += 15;
        originBadge = 'pharmacy';
      } else if (FRENCH_BRANDS.some((b) => brand.includes(b))) {
        bonusScore += 8;
        originBadge = 'french';
      }

      if (detectBio(c.name, ingredientsLower)) {
        bonusScore += 5;
        if (!originBadge) originBadge = 'bio';
      }

      const score = 100 - cautionCount * 15 + bonusScore;
      return { product: c, score, cautionCount, originBadge };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.score - a.score)
    .map((x) => ({
      id: x.product.id,
      name: x.product.name,
      brand: x.product.brand,
      category: x.product.category,
      barcode: x.product.barcode,
      image_url: x.product.image_url ?? null,
      description_fr: null,
      reason: null,
      overall_risk: x.cautionCount === 0 ? 'safe' : 'caution',
      price_range: '',
      popularity_count: x.score,
      origin_badge: x.originBadge,
    }));
}

function mergeUnique(a: AlternativeProduct[], b: AlternativeProduct[]): AlternativeProduct[] {
  const seen = new Set(a.map((p) => p.id));
  return [...a, ...b.filter((p) => !seen.has(p.id))];
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export async function getAlternativesByBarcode(
  barcode: string,
  flaggedIngredients: FlaggedIngredients,
  trimester: Trimester,
  isPremium: boolean,
): Promise<AlternativeProduct[]> {
  if (!isSupabaseConfigured || !barcode) return [];

  const { data: current, error: currentError } = await supabase
    .from('products')
    .select('id, name, brand, category, ingredients_raw')
    .eq('barcode', barcode)
    .maybeSingle();

  if (currentError || !current) {
    if (__DEV__ && currentError) console.warn('[Hēlo alternatives] product lookup:', currentError.message);
    return [];
  }

  const limit = isPremium ? 5 : 3;
  const productKeywords = extractProductKeywords(current.name);
  let accumulated: AlternativeProduct[] = [];

  // ── LAYER 0 (Lot 19-E1c) : pre-computed product_alternatives table.
  //    If we have curated entries for this product (matching intended_use),
  //    use them as primary — they're $0, instant, and 100% intended_use
  //    coherent (audit Lot 19-E1b removed all bullshit pairs).
  //    Returns immediately if found ≥ limit.
  const { data: precomputed } = await supabase
    .from('product_alternatives')
    .select('alternative_id, price_range, popularity_count, quality_score')
    .eq('product_id', current.id)
    .order('quality_score', { ascending: false })
    .limit(10);

  if (precomputed && precomputed.length > 0) {
    const altIds = precomputed.map(
      (r: { alternative_id: string }) => r.alternative_id,
    );
    const { data: altProducts } = await supabase
      .from('products')
      .select('id, name, brand, category, barcode, image_url, ingredients_raw, description_fr, intended_use')
      .in('id', altIds)
      .eq('overall_risk', 'safe');

    if (altProducts && altProducts.length > 0) {
      const productMap = new Map(
        (altProducts as Array<{
          id: string; name: string; brand: string; category: Category;
          barcode: string | null; image_url: string | null;
          ingredients_raw: string | null; description_fr: string | null;
        }>).map((p) => [p.id, p]),
      );
      const curatedResults: AlternativeProduct[] = [];
      for (const row of precomputed) {
        const p = productMap.get(row.alternative_id);
        if (!p) continue;
        const brand = (p.brand ?? '').toLowerCase();
        let originBadge: OriginBadge = null;
        if (PHARMACY_BRANDS.some((b) => brand.includes(b))) originBadge = 'pharmacy';
        else if (FRENCH_BRANDS.some((b) => brand.includes(b))) originBadge = 'french';
        else if (detectBio(p.name, (p.ingredients_raw ?? '').toLowerCase())) originBadge = 'bio';

        curatedResults.push({
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: p.category,
          barcode: p.barcode,
          image_url: p.image_url,
          description_fr: p.description_fr,
          reason: null,
          overall_risk: 'safe',
          price_range: row.price_range,
          popularity_count: row.popularity_count,
          origin_badge: originBadge,
        });
      }
      // On a des alternatives curées — c'est notre source la plus fiable,
      // on n'a pas besoin du fuzzy fallback derrière.
      if (curatedResults.length >= limit) return curatedResults.slice(0, limit);
      // Sinon on continue avec les layers fuzzy pour compléter.
      accumulated = curatedResults;
    }
  }

  // ── LAYER 1: keyword match in name within same category
  if (productKeywords.length > 0) {
    const orFilter = productKeywords.map((kw) => `name.ilike.%${kw}%`).join(',');
    const { data: candidates } = await supabase
      .from('products')
      .select('id, name, brand, category, barcode, image_url, ingredients_raw')
      .eq('category', current.category)
      .neq('id', current.id)
      .not('ingredients_raw', 'is', null)
      .or(orFilter)
      .limit(30);

    accumulated = filterAndScore((candidates ?? []) as ProductCandidate[], flaggedIngredients, trimester, isPremium);
    if (accumulated.length >= limit) return accumulated.slice(0, limit);
  }

  // ── LAYER 2: same brand fallback (runs even if Layer 1 yielded no keywords)
  if (current.brand) {
    const { data: brandProducts } = await supabase
      .from('products')
      .select('id, name, brand, category, barcode, image_url, ingredients_raw')
      .eq('brand', current.brand)
      .neq('id', current.id)
      .not('ingredients_raw', 'is', null)
      .limit(20);

    const brandSafe = filterAndScore((brandProducts ?? []) as ProductCandidate[], flaggedIngredients, trimester, isPremium);
    accumulated = mergeUnique(accumulated, brandSafe).sort((a, b) => b.popularity_count - a.popularity_count);
    if (accumulated.length >= limit) return accumulated.slice(0, limit);
  }

  // ── LAYER 3: same category, any safe product
  const { data: anyCat } = await supabase
    .from('products')
    .select('id, name, brand, category, barcode, image_url, ingredients_raw')
    .eq('category', current.category)
    .neq('id', current.id)
    .not('ingredients_raw', 'is', null)
    .limit(50);

  const catSafe = filterAndScore((anyCat ?? []) as ProductCandidate[], flaggedIngredients, trimester, isPremium);
  accumulated = mergeUnique(accumulated, catSafe).sort((a, b) => b.popularity_count - a.popularity_count);
  return accumulated.slice(0, limit);
}

// ─── INGREDIENT EXPLANATIONS (for educational empty state) ────────────────────

export interface IngredientExplanation {
  name: string;
  description: string;
}

export async function getIngredientExplanations(
  names: string[],
): Promise<IngredientExplanation[]> {
  if (!isSupabaseConfigured || names.length === 0) return [];

  const orFilter = names
    .slice(0, 10)
    .map((n) => {
      const safe = n.replace(/[%,()]/g, ' ').trim();
      return `name_inci.ilike.%${safe}%,name.ilike.%${safe}%`;
    })
    .join(',');

  const { data } = await supabase
    .from('ingredients')
    .select('name, name_inci, description_fr')
    .or(orFilter)
    .limit(20);

  const map = new Map<string, string>();
  for (const row of (data ?? []) as Array<{ name: string; name_inci: string; description_fr: string }>) {
    const desc = (row.description_fr ?? '').trim();
    if (!desc) continue;
    if (row.name) map.set(row.name.toLowerCase(), desc);
    if (row.name_inci) map.set(row.name_inci.toLowerCase(), desc);
  }

  return names.map((name) => {
    const lower = name.toLowerCase();
    let description = map.get(lower) ?? '';
    if (!description) {
      for (const [key, value] of map.entries()) {
        if (key.includes(lower) || lower.includes(key)) {
          description = value;
          break;
        }
      }
    }
    return { name, description };
  });
}

// ─── LEGACY (kept for backwards compat) ───────────────────────────────────────

export async function getAlternatives(
  productId: string,
  category: string,
  _trimester: Trimester,
): Promise<AlternativeProduct[]> {
  if (!isSupabaseConfigured) return [];

  const { data: altRows, error: altError } = await supabase
    .from('product_alternatives')
    .select('alternative_id, price_range, popularity_count')
    .eq('product_id', productId)
    .eq('category', category)
    .order('popularity_count', { ascending: false });

  if (altError || !altRows || altRows.length === 0) {
    if (__DEV__ && altError) console.warn('[Hēlo] getAlternatives error:', altError.message);
    return [];
  }

  const altIds = altRows.map((r: { alternative_id: string }) => r.alternative_id);

  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, brand, category, barcode, description_fr, overall_risk')
    .in('id', altIds)
    .eq('overall_risk', 'safe');

  if (prodError || !products) {
    if (__DEV__) console.warn('[Hēlo] getAlternatives products error:', prodError?.message);
    return [];
  }

  const productMap = new Map(
    (products as Array<{
      id: string; name: string; brand: string; category: Category;
      barcode: string | null; description_fr: string | null; overall_risk: string;
    }>).map((p) => [p.id, p]),
  );

  const results: AlternativeProduct[] = [];
  for (const row of altRows) {
    const p = productMap.get(row.alternative_id);
    if (!p) continue;
    results.push({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      barcode: p.barcode,
      image_url: null,
      description_fr: p.description_fr,
      reason: null,
      overall_risk: (p.overall_risk === 'caution' ? 'caution' : 'safe'),
      price_range: row.price_range,
      popularity_count: row.popularity_count,
      origin_badge: null,
    });
    if (results.length >= 5) break;
  }

  return results;
}

export async function submitAlternativeSuggestion(
  name: string,
  brand: string,
  category: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase non configuré' };
  }

  const { error } = await supabase
    .from('community_submissions')
    .insert({ name, brand, category });

  if (error) {
    if (__DEV__) console.warn('[Hēlo] submitAlternativeSuggestion error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
