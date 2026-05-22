import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Category, Trimester } from '@/types';

export interface AlternativeProduct {
  id: string;
  name: string;
  brand: string;
  category: Category;
  barcode: string | null;
  image_url?: string | null;
  description_fr: string | null;
  overall_risk: string;
  price_range: string;
  popularity_count: number;
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

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const PRODUCT_TYPES = [
  // Cosmétiques visage
  'crème visage', 'crème mains', 'crème corps', 'crème solaire', 'crème hydratante',
  'sérum', 'masque visage', 'gommage', 'lotion tonique', 'eau micellaire',
  'huile démaquillante', 'baume lèvres', 'contour des yeux',
  // Cosmétiques corps
  'lait corps', 'lait visage', 'huile végétale', 'beurre karité', 'liniment',
  'eau florale', 'savon', 'gel douche', 'bain moussant',
  // Cheveux
  'shampoing', 'après-shampoing', 'masque cheveux',
  // Hygiène
  'déodorant', 'parfum', 'dentifrice', 'bain de bouche',
  // Maquillage
  'fond de teint', 'mascara', 'rouge à lèvres', 'vernis', 'fard',
  // Alimentation
  'yaourt', 'fromage', 'jambon', 'saumon', 'thon', 'chocolat',
  'biscuit', 'pâte à tartiner', 'jus', 'lait', 'beurre', 'huile',
  'compote', 'céréales', 'pain', 'pizza', 'soupe',
];

export function extractProductKeywords(name: string): string[] {
  const lower = (name ?? '').toLowerCase();
  return PRODUCT_TYPES.filter((type) => lower.includes(type));
}

function toAlternative(p: ProductCandidate): AlternativeProduct {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    barcode: p.barcode,
    image_url: p.image_url ?? null,
    description_fr: null,
    overall_risk: 'safe',
    price_range: '',
    popularity_count: 0,
  };
}

function filterSafeProducts(
  candidates: ProductCandidate[],
  flaggedLower: string[],
): AlternativeProduct[] {
  return candidates
    .filter((c) => {
      const ingredientsLower = (c.ingredients_raw ?? '').toLowerCase();
      if (!ingredientsLower) return false;
      return !flaggedLower.some((flag) => flag && ingredientsLower.includes(flag));
    })
    .map(toAlternative);
}

// ─── HARDCODED FALLBACK ───────────────────────────────────────────────────────
// Curated safe products vetted as grossesse-compatible. Used when Supabase
// returns nothing (offline, sparse category, or unmatched product type).

const HARDCODED_ALTERNATIVES: Record<string, string[]> = {
  // ── Cosmétiques visage
  'crème visage':       ['Avène Hydrance Riche', 'La Roche-Posay Toleriane Sensitive', 'Bioderma Sensibio Riche'],
  'crème hydratante':   ['CeraVe Crème Hydratante', 'Avène Hydrance UV Riche', 'Uriage Eau Thermale Crème'],
  'crème mains':        ['Neutrogena Crème Mains', 'Avène Cicalfate Mains', 'Weleda Crème Mains Skin Food'],
  'crème corps':        ['Mustela Hydra Bébé Lait', 'A-Derma Exomega Crème', 'CeraVe Crème Hydratante Corps'],
  'crème solaire':      ['Avène Solaire SPF50', 'La Roche-Posay Anthelios SPF50', 'Bioderma Photoderm SPF50'],
  'sérum':              ['La Roche-Posay Hyalu B5 Sérum', 'Avène Hydrance Sérum', 'Uriage Hyséac Sérum'],
  'masque visage':      ['Avène Soothing Masque', 'A-Derma Phys-AC Masque', 'Caudalie Vinopure Masque Purifiant'],
  'gommage':            ['Cattier Gommage Doux', 'Mustela Stelaprotect Gommage', 'Weleda Gommage Visage à l\'Iris'],
  'lotion tonique':     ['Avène Eau Thermale Spray', 'Uriage Eau Thermale Spray', 'La Roche-Posay Eau Thermale'],
  'eau micellaire':     ['Bioderma Sensibio H2O', 'La Roche-Posay Eau Micellaire Ultra', 'Avène Eau Micellaire Douceur'],
  'huile démaquillante':['Caudalie Huile Démaquillante', 'Weleda Huile Démaquillante', 'Klorane Huile Démaquillante'],
  'baume lèvres':       ['Avène Cold Cream Baume Lèvres', 'Embryolisse Baume Lèvres', 'Weleda Baume Lèvres'],
  'contour des yeux':   ['Avène Soothing Eye Contour', 'La Roche-Posay Toleriane Yeux', 'Bioderma Sensibio Yeux'],

  // ── Cheveux
  'shampoing':          ['Klorane Shampoing à l\'Avoine', 'Cattier Shampoing Doux', 'Weleda Shampoing au Blé'],
  'après-shampoing':    ['Klorane Après-Shampoing Avoine', 'Cattier Après-Shampoing', 'Weleda Soin Après-Shampoing'],
  'masque cheveux':     ['Klorane Masque Avoine', 'Cattier Masque Cheveux', 'Weleda Masque Capillaire'],

  // ── Hygiène
  'déodorant':          ['Weleda Déodorant Spray Citrus', 'Schmidt\'s Déodorant Natural', 'Lavera Déodorant Bio'],
  'gel douche':         ['Mustela Gel Lavant Doux', 'A-Derma Exomega Gel Émollient', 'Uriage Surgras Liquide'],
  'savon':              ['Weleda Savon Calendula', 'Cattier Savon Surgras', 'Cadum Savon Lait d\'Amande'],
  'bain moussant':      ['Mustela Bain Moussant Bébé', 'Weleda Bain Lavande', 'Klorane Bain Doux'],
  'dentifrice':         ['Sensodyne Soin Complet', 'Elmex Anti-Caries', 'Weleda Dentifrice Salin'],
  'bain de bouche':     ['Listerine Smart Rinse Sans Alcool', 'Elmex Bain de Bouche', 'Meridol Bain de Bouche'],

  // ── Corps & bébé
  'lait corps':         ['Mustela Hydra Bébé Lait', 'Cetaphil Lait Hydratant', 'CeraVe Lait Hydratant'],
  'lait visage':        ['Avène Lait Démaquillant', 'Bioderma Lait Démaquillant', 'La Roche-Posay Lait Démaquillant'],
  'huile végétale':     ['Weleda Huile Vergetures', 'Mustela Huile Prévention Vergetures', 'Galénic Huile Précieuse'],
  'beurre karité':      ['Weleda Beurre de Karité', 'Cattier Beurre de Karité Pur', 'Karethic Beurre de Karité'],
  'liniment':           ['Gilbert Liniment Oléo-Calcaire', 'Mustela Liniment', 'Bioderma ABCDerm Liniment'],
  'eau florale':        ['Melvita Eau Florale Rose', 'Weleda Eau Florale Rose', 'Sanoflore Eau Florale Rose'],

  // ── Maquillage (sans rétinoïdes/parabens)
  'fond de teint':      ['Avène Couvrance Fond de Teint', 'La Roche-Posay Toleriane Fond de Teint', 'Bioderma Sensibio Foundation'],
  'mascara':            ['Avène Couvrance Mascara', 'La Roche-Posay Toleriane Mascara', 'Lavera Mascara Naturel'],
  'rouge à lèvres':     ['Couleur Caramel Rouge à Lèvres Bio', 'Lavera Rouge à Lèvres', 'Avril Rouge à Lèvres Bio'],

  // ── Alimentation (versions safe pour grossesse)
  'yaourt':             ['Danone Activia Nature', 'Yoplait Panier de Yoplait Nature', 'La Laitière Yaourt Nature'],
  'fromage':            ['La Vache qui Rit', 'Babybel Original', 'Kiri Crème de Fromage'],
  'jambon':             ['Herta Jambon Cuit Le Bon Paris', 'Fleury Michon Jambon Supérieur', 'Aoste Jambon Cuit'],
  'saumon':             ['Saumon en boîte Petit Navire', 'Saumon Connetable Naturel', 'Petit Navire Saumon Vapeur'],
  'thon':               ['Petit Navire Thon Albacore Eau', 'Connetable Thon au Naturel', 'Saupiquet Thon Naturel'],
  'chocolat':           ['Lindt Excellence 70%', 'Côte d\'Or Noir Intense', 'Poulain Noir Extra'],
  'biscuit':            ['LU Petit Beurre', 'Bonne Maman Galettes', 'BN Goûter Chocolat'],
  'pâte à tartiner':    ['Bonne Maman Caramel', 'Materne Pomme', 'Nutella (avec modération)'],
  'jus':                ['Innocent Jus 100% Fruits', 'Joker Le Pur Jus', 'Tropicana Pure Premium'],
  'compote':            ['Materne Pomme Nature', 'Pom\'Potes Sans Sucres Ajoutés', 'Andros Compote Pomme'],
  'céréales':           ['Jordans Country Crisp', 'Bjorg Muesli Bio', 'Quaker Oats Flocons Avoine'],
  'soupe':              ['Liebig Soupe Légumes', 'Knorr Soupe Tomate Basilic', 'Royco Minute Soupe'],
};

export function getHardcodedAlternatives(
  productName: string,
  category: string,
): AlternativeProduct[] {
  const lower = (productName ?? '').toLowerCase();
  const cat = (category as Category) ?? 'cosmetic';

  for (const [type, brands] of Object.entries(HARDCODED_ALTERNATIVES)) {
    if (lower.includes(type)) {
      return brands.map((label, idx) => ({
        id: `fallback-${type}-${idx}`,
        name: label,
        brand: label.split(' ')[0],
        category: cat,
        barcode: null,
        image_url: null,
        description_fr: 'Alternative recommandée pendant la grossesse',
        overall_risk: 'safe',
        price_range: '',
        popularity_count: 0,
      }));
    }
  }
  return [];
}

// ─── MAIN: 3-LAYER MATCHING ───────────────────────────────────────────────────

export async function getAlternativesByBarcode(
  barcode: string,
  flaggedIngredientNames: string[],
  _trimester: Trimester,
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

  const flaggedLower = flaggedIngredientNames
    .map((n) => (n ?? '').trim().toLowerCase())
    .filter((n) => n.length >= 3);

  const productKeywords = extractProductKeywords(current.name);
  const safe: AlternativeProduct[] = [];
  const seen = new Set<string>();

  const merge = (incoming: AlternativeProduct[]) => {
    for (const a of incoming) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      safe.push(a);
      if (safe.length >= 3) break;
    }
  };

  // ── LAYER 1: keyword match on name within same category
  if (productKeywords.length > 0) {
    const orFilter = productKeywords.map((kw) => `name.ilike.%${kw}%`).join(',');
    const { data: candidates } = await supabase
      .from('products')
      .select('id, name, brand, category, barcode, image_url, ingredients_raw')
      .eq('category', current.category)
      .neq('id', current.id)
      .not('ingredients_raw', 'is', null)
      .or(orFilter)
      .limit(20);

    merge(filterSafeProducts((candidates ?? []) as ProductCandidate[], flaggedLower));
  }

  // ── LAYER 2: same brand fallback
  if (safe.length < 3 && current.brand) {
    const { data: brandProducts } = await supabase
      .from('products')
      .select('id, name, brand, category, barcode, image_url, ingredients_raw')
      .eq('brand', current.brand)
      .neq('id', current.id)
      .not('ingredients_raw', 'is', null)
      .limit(20);

    merge(filterSafeProducts((brandProducts ?? []) as ProductCandidate[], flaggedLower));
  }

  if (safe.length >= 3) return safe.slice(0, 3);

  // ── LAYER 3: hardcoded curated fallback (text-only)
  const hardcoded = getHardcodedAlternatives(current.name, current.category);
  if (hardcoded.length > 0) {
    merge(hardcoded);
    if (safe.length >= 3) return safe.slice(0, 3);
  }

  // ── Last resort: any product in same category without flagged ingredients
  if (safe.length < 3) {
    const { data: anyCat } = await supabase
      .from('products')
      .select('id, name, brand, category, barcode, image_url, ingredients_raw')
      .eq('category', current.category)
      .neq('id', current.id)
      .not('ingredients_raw', 'is', null)
      .limit(50);

    merge(filterSafeProducts((anyCat ?? []) as ProductCandidate[], flaggedLower));
  }

  return safe.slice(0, 3);
}

// Retained for legacy callers using product_alternatives curated table.
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
      overall_risk: p.overall_risk,
      price_range: row.price_range,
      popularity_count: row.popularity_count,
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
