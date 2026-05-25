/**
 * Lot 17-07 — Catégoriser un ingrédient pour le grouper visuellement.
 *
 * Pourquoi : la section "Aucun signalement connu" (premium) listait jusqu'à
 * 50+ ingrédients en vrac. Aucune hiérarchie visuelle → l'utilisatrice
 * scrollait un mur de texte. Avec ce grouping, elle voit en un coup d'œil :
 * "5 allergènes, 3 additifs, 12 colorants, 30 autres".
 *
 * Heuristiques utilisées (par ordre de priorité) :
 *   1. E-number → Additifs alimentaires (E951, E150d, etc.)
 *   2. Allergène déclaré FR (gluten, lait, oeuf...) → Allergènes
 *   3. Conservateurs (paraben, benzoate, sorbate...) → Conservateurs
 *   4. Colorants (carmin, anthocyane, dioxide de titane...) → Colorants
 *   5. Édulcorants (saccharine, sucralose, sorbitol...) → Édulcorants
 *   6. Parfum / fragrance / alcool dénaturé → Cosmétiques fragrances
 *   7. Sinon → Autres
 *
 * Pattern-based, pas DB-based — ça évite de devoir migrer un schéma juste
 * pour ça. Approximatif mais largement assez bon pour l'usage UI.
 */

export type IngredientCategoryKey =
  | 'allergen'
  | 'additive'
  | 'preservative'
  | 'colorant'
  | 'sweetener'
  | 'fragrance'
  | 'other';

export interface IngredientCategoryInfo {
  key: IngredientCategoryKey;
  label: string;
  emoji: string;
  /** Ordre d'affichage (plus petit = plus haut dans la liste). */
  order: number;
}

const CATEGORIES: Record<IngredientCategoryKey, IngredientCategoryInfo> = {
  allergen:     { key: 'allergen',     label: 'Allergènes potentiels',  emoji: '🥜', order: 1 },
  preservative: { key: 'preservative', label: 'Conservateurs',           emoji: '🛡',  order: 2 },
  additive:     { key: 'additive',     label: 'Additifs alimentaires',   emoji: '🧪', order: 3 },
  sweetener:    { key: 'sweetener',    label: 'Édulcorants',             emoji: '🍬', order: 4 },
  colorant:     { key: 'colorant',     label: 'Colorants',               emoji: '🎨', order: 5 },
  fragrance:    { key: 'fragrance',    label: 'Parfums & cosmétiques',   emoji: '🌸', order: 6 },
  other:        { key: 'other',        label: 'Autres ingrédients',      emoji: '📋', order: 7 },
};

const ALLERGEN_KEYWORDS = [
  'gluten', 'wheat', 'blé', 'froment', 'épeautre', 'seigle', 'orge',
  'lait', 'milk', 'lactose', 'whey', 'casein', 'caséine', 'lactosérum',
  'oeuf', 'œuf', 'egg', 'albumen', 'ovalbumin',
  'soja', 'soy', 'soya', 'soybean',
  'arachide', 'peanut',
  'noisette', 'amande', 'noix', 'cajou', 'pistache', 'hazelnut', 'almond', 'walnut',
  'sésame', 'sesame', 'tahin',
  'poisson', 'fish', 'thon', 'saumon',
  'crustacé', 'shrimp', 'crab', 'crevette',
  'moutarde', 'mustard',
  'céleri', 'celery',
  'sulfite', 'sulphite',
];

const PRESERVATIVE_KEYWORDS = [
  'paraben', 'benzoate', 'sorbate', 'nitrite', 'nitrate',
  'acide sorbique', 'acide benzoïque', 'phenoxyethanol',
  'methylisothiazolinone', 'formaldehyde',
];

const COLORANT_KEYWORDS = [
  'carmin', 'caramel', 'anthocyane', 'curcumine', 'rocou', 'lycopène',
  'chlorophylle', 'tartrazine', 'érythrosine', 'cochenille', 'indigotine',
  'dioxide de titane', 'titanium dioxide',
];

const SWEETENER_KEYWORDS = [
  'aspartame', 'sucralose', 'saccharine', 'acésulfame', 'cyclamate',
  'sorbitol', 'maltitol', 'xylitol', 'érythritol', 'stévia', 'stevia',
  'thaumatine', 'sirop de glucose', 'sirop de maïs',
];

const FRAGRANCE_KEYWORDS = [
  'parfum', 'fragrance', 'aroma', 'perfume',
  'alcohol denat', 'alcool dénaturé', 'sd alcohol',
  'huile essentielle', 'essential oil',
  'sulfate', 'sulphate', 'lauryl sulfate',
];

const E_NUMBER_PATTERN = /^E\d{3,4}[a-z]?$/i;

function containsAny(hay: string, needles: string[]): boolean {
  const lower = hay.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

export function categorizeIngredient(name: string): IngredientCategoryInfo {
  const trimmed = name.trim();
  if (!trimmed) return CATEGORIES.other;

  // 1. E-number → additif
  if (E_NUMBER_PATTERN.test(trimmed)) return CATEGORIES.additive;

  // 2. Allergène (highest priority — safety)
  if (containsAny(trimmed, ALLERGEN_KEYWORDS)) return CATEGORIES.allergen;

  // 3. Conservateur
  if (containsAny(trimmed, PRESERVATIVE_KEYWORDS)) return CATEGORIES.preservative;

  // 4. Édulcorant
  if (containsAny(trimmed, SWEETENER_KEYWORDS)) return CATEGORIES.sweetener;

  // 5. Colorant
  if (containsAny(trimmed, COLORANT_KEYWORDS)) return CATEGORIES.colorant;

  // 6. Fragrance / cosmétique
  if (containsAny(trimmed, FRAGRANCE_KEYWORDS)) return CATEGORIES.fragrance;

  return CATEGORIES.other;
}

/**
 * Groupe une liste d'ingrédients par catégorie. Retourne un Map ordonné
 * par `order` (allergènes d'abord, "autres" à la fin).
 *
 * Usage typique :
 * ```tsx
 * const groups = groupIngredientsByCategory(noSignalList);
 * groups.forEach((items, cat) => render section)
 * ```
 */
export function groupIngredientsByCategory<T extends { ingredientName: string }>(
  items: T[],
): Array<{ category: IngredientCategoryInfo; items: T[] }> {
  const map = new Map<IngredientCategoryKey, T[]>();
  for (const item of items) {
    const cat = categorizeIngredient(item.ingredientName);
    const existing = map.get(cat.key);
    if (existing) existing.push(item);
    else map.set(cat.key, [item]);
  }
  return Array.from(map.entries())
    .map(([key, list]) => ({ category: CATEGORIES[key], items: list }))
    .sort((a, b) => a.category.order - b.category.order);
}
