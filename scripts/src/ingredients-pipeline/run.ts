/**
 * run.ts — Main orchestrator for the Hēlo ingredients pipeline.
 *
 * Stages:
 *   1. SCRAPE  — CosIng CSV, EFSA additives, CRAT fiches, French medications
 *   2. NORMALIZE — Claude Haiku structured JSON per entry
 *   3. CROSS-REFERENCE — deduplicate, keep strictest risk per trimester
 *   4. INSERT — batch upsert into Supabase (never overwrite manual entries)
 *   5. PRODUCTS — pre-load top 100 French products from Open Food Facts
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run ingredients-pipeline
 *
 * Env vars required:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY  (or SUPABASE_SERVICE_ROLE_KEY for admin upserts)
 *   EXPO_PUBLIC_ANTHROPIC_API_KEY
 */

import { scrapeCosIng } from './scrapers/cosing.js';
import { scrapeEFSA } from './scrapers/efsa.js';
import { scrapeCRAT } from './scrapers/crat.js';
import { scrapeMedications } from './scrapers/medications.js';
import { normalizeEntries } from './normalize.js';
import { crossReference, filterQuality } from './crossref.js';
import { insertIngredients, insertProducts } from './insert.js';
import { fetchTopFrenchProducts } from './products.js';
import { log, sleep } from './utils.js';

// ─── Config ───────────────────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

function checkEnv(): void {
  const required: string[] = [
    'EXPO_PUBLIC_SUPABASE_URL',
  ];
  const atLeastOne: string[] = [
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  const hasKey = atLeastOne.some((k) => process.env[k]);
  if (!hasKey) {
    throw new Error(`Need at least one of: ${atLeastOne.join(', ')}`);
  }
  if (!ANTHROPIC_API_KEY) {
    log.warn('EXPO_PUBLIC_ANTHROPIC_API_KEY not set — normalization will fail');
  }
}

// ─── Stage runner helper ──────────────────────────────────────────────────────
async function runStage<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  log.info(`\n${'═'.repeat(60)}`);
  log.info(`Stage: ${label}`);
  log.info('═'.repeat(60));
  try {
    const result = await fn();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    log.ok(`Stage "${label}" completed in ${elapsed}s`);
    return result;
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    log.error(`Stage "${label}" FAILED after ${elapsed}s: ${String(err)}`);
    throw err;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const pipelineStart = Date.now();

  log.info('');
  log.info('╔════════════════════════════════════════════════════════╗');
  log.info('║       Hēlo Ingredients Pipeline — Starting             ║');
  log.info('╚════════════════════════════════════════════════════════╝');
  log.info('');

  checkEnv();

  // ── Stage 1: Scrape ──────────────────────────────────────────────────────
  const allRaw: Array<Record<string, unknown>> = [];

  const [cosingEntries, efsaEntries, cratEntries, medicationEntries] =
    await runStage('1 — Scrape all sources', async () => {
      // Run scrapers with graceful individual failure handling
      const results = await Promise.allSettled([
        scrapeCosIng(),
        scrapeEFSA(),
        scrapeCRAT(),
        scrapeMedications(),
      ]);

      const cosing = results[0].status === 'fulfilled' ? results[0].value : [];
      const efsa   = results[1].status === 'fulfilled' ? results[1].value : [];
      const crat   = results[2].status === 'fulfilled' ? results[2].value : [];
      const meds   = results[3].status === 'fulfilled' ? results[3].value : [];

      if (results[0].status === 'rejected') log.warn(`CosIng scraper failed: ${String(results[0].reason)}`);
      if (results[1].status === 'rejected') log.warn(`EFSA scraper failed: ${String(results[1].reason)}`);
      if (results[2].status === 'rejected') log.warn(`CRAT scraper failed: ${String(results[2].reason)}`);
      if (results[3].status === 'rejected') log.warn(`BDPM scraper failed: ${String(results[3].reason)}`);

      log.info(
        `Scrape totals — CosIng: ${cosing.length}, EFSA: ${efsa.length}, ` +
        `CRAT: ${crat.length}, BDPM: ${meds.length}`,
      );

      return [cosing, efsa, crat, meds] as const;
    });

  allRaw.push(
    ...(cosingEntries as unknown as Record<string, unknown>[]),
    ...(efsaEntries as unknown as Record<string, unknown>[]),
    ...(cratEntries as unknown as Record<string, unknown>[]),
    ...(medicationEntries as unknown as Record<string, unknown>[]),
  );

  log.info(`Total raw entries to normalize: ${allRaw.length}`);

  // ── Stage 2: Normalize ───────────────────────────────────────────────────
  if (!ANTHROPIC_API_KEY) {
    log.error('Cannot normalize — EXPO_PUBLIC_ANTHROPIC_API_KEY is not set. Aborting pipeline.');
    process.exit(1);
  }

  const normalized = await runStage('2 — Normalize via Claude Haiku', () =>
    normalizeEntries(
      allRaw as Parameters<typeof normalizeEntries>[0],
      ANTHROPIC_API_KEY,
      { batchLabel: 'raw ingredients' },
    ),
  );

  // ── Stage 3: Cross-reference ─────────────────────────────────────────────
  const merged = await runStage('3 — Cross-reference & deduplicate', async () => {
    const crossReffed = crossReference(normalized);
    const filtered = filterQuality(crossReffed);
    log.info(`Quality filter: ${crossReffed.length} → ${filtered.length} entries`);
    return filtered;
  });

  // ── Stage 4: Insert into Supabase ────────────────────────────────────────
  const insertStats = await runStage('4 — Upsert into Supabase', () =>
    insertIngredients(merged),
  );

  // ── Stage 5: Pre-load popular products ───────────────────────────────────
  const productStats = await runStage('5 — Pre-load top 100 French products', async () => {
    const products = await fetchTopFrenchProducts(100);
    if (products.length === 0) {
      log.warn('No products fetched from Open Food Facts — skipping product insert');
      return { inserted: 0, skipped: 0, errors: 0 };
    }
    return insertProducts(products);
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - pipelineStart) / 1000).toFixed(0);

  log.info('');
  log.info('╔════════════════════════════════════════════════════════╗');
  log.info('║              Pipeline Complete ✓                       ║');
  log.info('╠════════════════════════════════════════════════════════╣');
  log.info(`║  Raw entries scraped:    ${String(allRaw.length).padEnd(29)}║`);
  log.info(`║  After normalization:    ${String(normalized.length).padEnd(29)}║`);
  log.info(`║  After deduplication:   ${String(merged.length).padEnd(29)}║`);
  log.info(`║  Ingredients inserted:  ${String(insertStats.inserted).padEnd(29)}║`);
  log.info(`║  Manual entries kept:   ${String(insertStats.skipped).padEnd(29)}║`);
  log.info(`║  Insert errors:         ${String(insertStats.errors).padEnd(29)}║`);
  log.info(`║  Products pre-loaded:   ${String(productStats.inserted).padEnd(29)}║`);
  log.info(`║  Total duration:        ${`${elapsed}s`.padEnd(29)}║`);
  log.info('╚════════════════════════════════════════════════════════╝');
  log.info('');
}

main().catch((err) => {
  log.error(`Pipeline crashed: ${String(err)}`);
  process.exit(1);
});
