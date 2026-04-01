/**
 * run.ts — Orchestrateur du pipeline d'ingrédients Hēlo.
 *
 * MODE OFFLINE (par défaut — aucun appel réseau requis):
 *   Stage 1: Scraping → données pré-calculées embarquées dans les scrapers
 *   Stage 2: CrossRef + dédoublonnage (garde le risque le plus strict)
 *   Stage 3: Insertion en lot dans Supabase (upsert non-destructif)
 *   Stage 4: Produits Open Food Facts (désactivé en environnement Replit)
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run ingredients-pipeline
 *
 * Variables requises:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY  (ou SUPABASE_SERVICE_ROLE_KEY pour admin)
 *
 * NOTE: La normalisation Claude Haiku (ancienne Stage 2) est désactivée.
 *       Les scrapers embarquent déjà les niveaux de risque pré-calculés.
 */

import { scrapeCosIng } from './scrapers/cosing.js';
import { scrapeEFSA } from './scrapers/efsa.js';
import { scrapeCRAT } from './scrapers/crat.js';
import { scrapeMedications } from './scrapers/medications.js';
import { crossReference, filterQuality } from './crossref.js';
import { insertIngredients, insertProducts } from './insert.js';
import { log } from './utils.js';
import type { PreComputedIngredient } from './utils.js';

// Désactiver l'accès à Open Food Facts (Replit bloque l'egress externe)
const SKIP_PRODUCTS = true;

// ─── Vérification des variables d'environnement ───────────────────────────────
function checkEnv(): void {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error('EXPO_PUBLIC_SUPABASE_URL manquant');
  if (!key) throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY manquant');
}

// ─── Pipeline principal ────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const pipelineStart = Date.now();

  log.info('');
  log.info('╔══════════════════════════════════════════════════════════╗');
  log.info('║    Hēlo — Pipeline d\'ingrédients (mode offline)          ║');
  log.info('╚══════════════════════════════════════════════════════════╝');
  log.info('');

  checkEnv();

  // ── Stage 1: Scraping des données embarquées ──────────────────────────────
  log.info('Stage 1/3 — Collecte des données pré-calculées…');
  const stage1Start = Date.now();

  const results = await Promise.allSettled([
    scrapeCosIng(),
    scrapeEFSA(),
    scrapeCRAT(),
    scrapeMedications(),
  ]);

  const [cosing, efsa, crat, medications] = results.map((r, i) => {
    if (r.status === 'rejected') {
      const labels = ['cosing', 'efsa', 'crat', 'medications'];
      log.warn(`${labels[i]}: scraper a échoué — ${String(r.reason)}`);
      return [] as PreComputedIngredient[];
    }
    return r.value as PreComputedIngredient[];
  });

  const s1Elapsed = ((Date.now() - stage1Start) / 1000).toFixed(1);
  const rawTotal = cosing.length + efsa.length + crat.length + medications.length;

  log.ok(
    `Stage 1 terminé en ${s1Elapsed}s — ` +
    `Cosmétiques: ${cosing.length}, Aliments: ${efsa.length}, ` +
    `Médicaments DCI: ${crat.length}, Médicaments marques: ${medications.length}`,
  );
  log.info(`Total brut: ${rawTotal} entrées`);

  // ── Stage 2: CrossRef + dédoublonnage ─────────────────────────────────────
  log.info('\nStage 2/3 — Dédoublonnage et cross-référencement…');
  const stage2Start = Date.now();

  const allIngredients: PreComputedIngredient[] = [
    ...cosing, ...efsa, ...crat, ...medications,
  ];

  const crossRefed = crossReference(allIngredients);
  const filtered = filterQuality(crossRefed);

  const s2Elapsed = ((Date.now() - stage2Start) / 1000).toFixed(1);
  const dupsRemoved = rawTotal - filtered.length;

  log.ok(
    `Stage 2 terminé en ${s2Elapsed}s — ` +
    `${filtered.length} ingrédients uniques (${dupsRemoved} doublons supprimés)`,
  );

  // ── Stage 3: Insertion Supabase ────────────────────────────────────────────
  log.info('\nStage 3/3 — Insertion dans Supabase…');
  const stage3Start = Date.now();

  const insertStats = await insertIngredients(filtered);
  const s3Elapsed = ((Date.now() - stage3Start) / 1000).toFixed(1);

  log.ok(
    `Stage 3 terminé en ${s3Elapsed}s — ` +
    `${insertStats.inserted} insérés, ${insertStats.skipped} protégés (manuel), ${insertStats.errors} erreurs`,
  );

  // ── Stage 4 (optionnel): Produits Open Food Facts ─────────────────────────
  if (!SKIP_PRODUCTS) {
    log.info('\nStage 4/4 — Pré-chargement des produits Open Food Facts…');
    try {
      const { fetchTopFrenchProducts } = await import('./products.js');
      const products = await fetchTopFrenchProducts(100);
      if (products.length > 0) {
        const prodStats = await insertProducts(products);
        log.ok(`Stage 4 — ${prodStats.inserted} produits insérés, ${prodStats.errors} erreurs`);
      } else {
        log.warn('Stage 4 — Aucun produit récupéré (réseau probablement inaccessible)');
      }
    } catch (err) {
      log.warn(`Stage 4 — Erreur produits: ${String(err)} (ignoré)`);
    }
  } else {
    log.info('\nStage 4 ignoré — Open Food Facts désactivé en environnement Replit.');
    log.info('  → Pour activer: SKIP_PRODUCTS = false dans run.ts');
  }

  // ── Résumé ────────────────────────────────────────────────────────────────
  const totalElapsed = ((Date.now() - pipelineStart) / 1000).toFixed(1);

  log.info('');
  log.info('╔══════════════════════════════════════════════════════════╗');
  log.info('║              Pipeline terminé ✓                          ║');
  log.info('╠══════════════════════════════════════════════════════════╣');
  log.info(`║  Entrées brutes collectées:  ${String(rawTotal).padEnd(27)}║`);
  log.info(`║  Après dédoublonnage:        ${String(filtered.length).padEnd(27)}║`);
  log.info(`║  Ingrédients insérés:        ${String(insertStats.inserted).padEnd(27)}║`);
  log.info(`║  Entrées manuelles protégées:${String(insertStats.skipped).padEnd(27)}║`);
  log.info(`║  Erreurs d'insertion:        ${String(insertStats.errors).padEnd(27)}║`);
  log.info(`║  Durée totale:               ${`${totalElapsed}s`.padEnd(27)}║`);
  log.info('╚══════════════════════════════════════════════════════════╝');
  log.info('');
}

main().catch((err) => {
  log.error(`Pipeline échoué: ${String(err)}`);
  process.exit(1);
});
