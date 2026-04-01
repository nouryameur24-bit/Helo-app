/**
 * insert.ts — Insertion en lot des ingrédients dans Supabase.
 *
 * Garanties:
 *   - Ne jamais écraser les entrées manuellement curées (source='manual').
 *   - Upsert par name_inci (clé unique).
 *   - Taille des lots: 50 lignes par appel Supabase.
 *   - Retry avec backoff exponentiel (3 tentatives).
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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Variables manquantes: EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY (ou SUPABASE_SERVICE_ROLE_KEY)',
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Colonnes réellement présentes dans la table Supabase `ingredients`
// NOTE: `confidence` est omis car la colonne peut ne pas exister dans le schéma.
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
  };
}

/**
 * Upsert des ingrédients dans Supabase.
 * Protège les entrées dont la source contient 'manual'.
 */
export async function insertIngredients(
  entries: CrossRefResult[],
): Promise<InsertStats> {
  log.info(`Insert — préparation de ${entries.length} ingrédients…`);
  const client = buildSupabaseClient();
  const stats: InsertStats = { inserted: 0, skipped: 0, errors: 0 };

  // Récupérer les entrées manuelles à protéger
  const { data: existingManual, error: fetchError } = await client
    .from('ingredients')
    .select('name_inci')
    .like('source', '%manual%');

  if (fetchError) {
    log.warn(`Insert — impossible de récupérer les entrées manuelles: ${fetchError.message}`);
  }

  const manualKeys = new Set<string>(
    (existingManual ?? []).map((r: { name_inci: string }) => r.name_inci.toUpperCase().trim()),
  );
  log.info(`Insert — ${manualKeys.size} entrées manuelles protégées`);

  // Filtrer les doublons avec les entrées manuelles
  const toInsert: CrossRefResult[] = [];
  for (const entry of entries) {
    if (manualKeys.has(entry.name_inci.toUpperCase().trim())) {
      stats.skipped++;
    } else {
      toInsert.push(entry);
    }
  }

  log.info(`Insert — ${toInsert.length} à insérer, ${stats.skipped} protégés`);

  const batches = chunk(toInsert, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const rows = batch.map(toRow);

    try {
      await withRetry(
        async () => {
          const { error } = await client
            .from('ingredients')
            .upsert(rows, {
              onConflict: 'name_inci',
              ignoreDuplicates: false,
            });
          if (error) throw new Error(error.message);
        },
        { maxAttempts: 3, baseDelayMs: 500, label: `lot ${i + 1}/${batches.length}` },
      );
      stats.inserted += batch.length;
      if ((i + 1) % 10 === 0 || i + 1 === batches.length) {
        log.info(`Insert — lot ${i + 1}/${batches.length} (${stats.inserted} insérés jusqu'ici)`);
      }
    } catch (err) {
      stats.errors += batch.length;
      log.error(`Insert — lot ${i + 1} échoué: ${String(err)}`);
    }
  }

  log.ok(
    `Insert — terminé: ${stats.inserted} insérés, ${stats.skipped} protégés, ${stats.errors} erreurs`,
  );
  return stats;
}

/**
 * Insérer des données produits dans la table `products`.
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
  log.info(`Insert — pré-chargement de ${products.length} produits…`);
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
        log.warn(`Insert produits — lot ${i + 1} erreur: ${error.message}`);
      } else {
        stats.inserted += batch.length;
      }
    } catch (err) {
      stats.errors += batch.length;
      log.error(`Insert produits — lot ${i + 1} échoué: ${String(err)}`);
    }
  }

  log.ok(`Insert produits — ${stats.inserted} insérés, ${stats.errors} erreurs`);
  return stats;
}
