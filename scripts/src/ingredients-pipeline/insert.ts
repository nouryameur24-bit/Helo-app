/**
 * insert.ts — Batch upsert ingredients into Supabase.
 *
 * CRITICAL: Never overwrite manually curated ingredients.
 * Uses ON CONFLICT (name_inci) DO UPDATE only for non-manual entries.
 *
 * Batch size: 50 rows per upsert call.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { CrossRefResult } from './crossref.js';
import { chunk, log, withRetry } from './utils.js';

const BATCH_SIZE = 50;

export interface InsertStats {
  inserted: number;
  skipped: number;
  errors: number;
}

function buildSupabaseClient(): SupabaseClient {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / EXPO_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface IngredientRow {
  name: string;
  name_inci: string;
  category: string;
  risk_level_t1: string;
  risk_level_t2: string;
  risk_level_t3: string;
  risk_level_breastfeeding: string;
  description_fr: string;
  source: string;
  confidence: string;
}

function toRow(entry: CrossRefResult): IngredientRow {
  return {
    name: entry.name,
    name_inci: entry.name_inci,
    category: entry.category,
    risk_level_t1: entry.risk_level_t1,
    risk_level_t2: entry.risk_level_t2,
    risk_level_t3: entry.risk_level_t3,
    risk_level_breastfeeding: entry.risk_level_breastfeeding,
    description_fr: entry.description_fr,
    source: entry.source_raw,
    confidence: entry.confidence,
  };
}

/**
 * Upsert a batch of ingredients into Supabase.
 * Skips entries where source includes 'manual' (manually curated).
 */
export async function insertIngredients(
  entries: CrossRefResult[],
): Promise<InsertStats> {
  log.info(`Insert — preparing ${entries.length} ingredients for upsert…`);
  const client = buildSupabaseClient();

  const stats: InsertStats = { inserted: 0, skipped: 0, errors: 0 };

  // First: get the list of existing manual ingredient INCI names to protect them
  const { data: existingManual, error: fetchError } = await client
    .from('ingredients')
    .select('name_inci, source')
    .like('source', '%manual%');

  if (fetchError) {
    log.warn(`Insert — could not fetch manual ingredients: ${fetchError.message}`);
  }

  const manualINCINames = new Set<string>(
    (existingManual ?? []).map((r: { name_inci: string }) => r.name_inci.toUpperCase().trim()),
  );
  log.info(`Insert — protecting ${manualINCINames.size} manually curated ingredients`);

  // Filter out entries that would overwrite manual entries
  const toInsert: CrossRefResult[] = [];
  for (const entry of entries) {
    if (manualINCINames.has(entry.name_inci.toUpperCase().trim())) {
      stats.skipped++;
    } else {
      toInsert.push(entry);
    }
  }

  log.info(`Insert — ${toInsert.length} entries to upsert, ${stats.skipped} protected`);

  const batches = chunk(toInsert, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const rows = batch.map(toRow);

    try {
      await withRetry(
        async () => {
          const result = await client
            .from('ingredients')
            .upsert(rows, {
              onConflict: 'name_inci',
              ignoreDuplicates: false,
            });
          if (result.error) throw new Error(result.error.message);
        },
        { maxAttempts: 3, label: `batch ${i + 1}/${batches.length}` },
      );
      stats.inserted += batch.length;
      log.info(`Insert — batch ${i + 1}/${batches.length} done (${batch.length} rows)`);
    } catch (err) {
      stats.errors += batch.length;
      log.error(`Insert — batch ${i + 1} failed: ${String(err)}`);
    }
  }

  log.ok(
    `Insert — complete: ${stats.inserted} inserted, ${stats.skipped} skipped (manual), ${stats.errors} errors`,
  );
  return stats;
}

/**
 * Insert pre-loaded product data into the products table.
 */
export async function insertProducts(
  products: Array<{
    barcode: string;
    name: string;
    brand: string;
    ingredients_text_fr: string;
    categories: string;
  }>,
): Promise<InsertStats> {
  log.info(`Insert — pre-loading ${products.length} popular products…`);
  const client = buildSupabaseClient();
  const stats: InsertStats = { inserted: 0, skipped: 0, errors: 0 };

  const batches = chunk(products, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      const { error } = await client
        .from('products')
        .upsert(batch, { onConflict: 'barcode', ignoreDuplicates: true });

      if (error) {
        stats.errors += batch.length;
        log.warn(`Insert products — batch ${i + 1} error: ${error.message}`);
      } else {
        stats.inserted += batch.length;
      }
    } catch (err) {
      stats.errors += batch.length;
      log.error(`Insert products — batch ${i + 1} failed: ${String(err)}`);
    }
  }

  log.ok(`Insert products — ${stats.inserted} inserted, ${stats.errors} errors`);
  return stats;
}
