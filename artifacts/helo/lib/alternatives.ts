import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Category, Trimester } from '@/types';

export interface AlternativeProduct {
  id: string;
  name: string;
  brand: string;
  category: Category;
  barcode: string | null;
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

export async function getAlternativesByBarcode(
  barcode: string,
  _category: string,
  _trimester: Trimester,
): Promise<AlternativeProduct[]> {
  if (!isSupabaseConfigured || !barcode) return [];

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, category')
    .eq('barcode', barcode)
    .single();

  if (productError || !product) {
    if (__DEV__) console.warn('[Hēlo] Product lookup error:', productError?.message);
    return [];
  }

  return getAlternatives(product.id, product.category || _category, _trimester);
}

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
    if (altError) console.warn('[Hēlo] getAlternatives error:', altError.message);
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
    }>).map((p) => [p.id, p])
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
