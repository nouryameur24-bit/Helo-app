/**
 * scrapers/_shared/supabase_writer.ts
 *
 * Batched insert vers Supabase products avec dedup par barcode.
 * Utilise service_role pour bypass RLS (RLS sur products empêche INSERT
 * anonymous, mais on a besoin d'insérer en masse ici).
 *
 * Stratégie dedup :
 *   - PostgREST ?on_conflict=barcode + Prefer: resolution=ignore-duplicates
 *   - On NE met PAS à jour les produits existants (préserve quality_score
 *     supérieur des sources curated)
 *   - Si on veut update les existants : changer pour 'merge-duplicates' mais
 *     attention à l'écrasement.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { ScrapedProduct } from './types.js';

interface InsertResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

export class SupabaseWriter {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  /**
   * Insert un batch de produits scrapés. Dedup par barcode.
   * Returns counts inserted/skipped/errors.
   */
  async insertBatch(products: ScrapedProduct[]): Promise<InsertResult> {
    if (products.length === 0) {
      return { inserted: 0, skipped: 0, errors: [] };
    }

    // Validate : barcode required
    const valid = products.filter((p) => p.barcode && p.barcode.length >= 8);
    const invalid = products.length - valid.length;

    if (valid.length === 0) {
      return { inserted: 0, skipped: invalid, errors: ['all_invalid'] };
    }

    const rows = valid.map((p) => ({
      barcode: p.barcode,
      name: p.name,
      brand: p.brand,
      category: p.category,
      ingredients_raw: p.ingredients_raw,
      image_url: p.image_url,
      description_fr: p.description_fr,
      source: p.source,
      intended_use: p.intended_use,
      quality_score: p.quality_score,
      metadata: { ...p.metadata, source_url: p.source_url },
    }));

    const errors: string[] = [];
    let inserted = 0;
    let skipped = invalid;

    // Chunk by 500 pour éviter timeouts PostgREST sur gros batches
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);

      // Upsert avec onConflict barcode + ignoreDuplicates → ne touche pas l'existant
      const { error, count } = await this.client
        .from('products')
        .upsert(chunk, {
          onConflict: 'barcode',
          ignoreDuplicates: true,
          count: 'exact',
        });

      if (error) {
        errors.push(`chunk_${i}: ${error.message}`);
        continue;
      }
      inserted += count ?? 0;
      skipped += chunk.length - (count ?? 0);
    }

    return { inserted, skipped, errors };
  }

  /**
   * Vérifie si un barcode existe déjà (pré-check avant scraping pour éviter
   * de payer Claude pour rien).
   */
  async barcodeExists(barcode: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('products')
      .select('id', { head: true, count: 'exact' })
      .eq('barcode', barcode);
    if (error) return false;
    return (data?.length ?? 0) > 0;
  }

  /**
   * Pour les scrapers qui visitent des URLs en bulk, c'est plus efficace de
   * filter les EAN déjà connus AVANT de fetch les pages.
   */
  async filterUnknownBarcodes(barcodes: string[]): Promise<string[]> {
    if (barcodes.length === 0) return [];
    const { data, error } = await this.client
      .from('products')
      .select('barcode')
      .in('barcode', barcodes);
    if (error || !data) return barcodes;
    const known = new Set(data.map((r) => r.barcode));
    return barcodes.filter((b) => !known.has(b));
  }
}
