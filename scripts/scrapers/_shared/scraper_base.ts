/**
 * scrapers/_shared/scraper_base.ts
 *
 * Classe abstraite parente de tous les scrapers. Implémente la boucle
 * standard (discover URLs → dedup → fetch → extract → insert) et laisse
 * chaque scraper sous-classe implémenter `discoverProductUrls` et
 * éventuellement personnaliser `extractProduct`.
 */
import Anthropic from '@anthropic-ai/sdk';

import { extractWithClaude } from './claude_extractor.js';
import { HttpRunner } from './http_runner.js';
import { SupabaseWriter } from './supabase_writer.js';
import type { ScrapedProduct, ScraperRunStats, ScrapeContext } from './types.js';

export abstract class BaseScraper {
  abstract readonly name: string;
  abstract readonly sourceKey: string; // ex: 'scraped_doctipharma'
  abstract readonly qualityScore: number; // 70-90
  abstract readonly defaultCategory: 'cosmetic' | 'food' | 'medication';

  protected http: HttpRunner;
  protected writer: SupabaseWriter;
  protected claude: Anthropic;
  protected ctx: ScrapeContext;

  constructor(ctx: ScrapeContext) {
    this.ctx = ctx;
    this.http = new HttpRunner({ rateLimitPerSec: ctx.rateLimitPerSec ?? 1.5 });
    this.writer = new SupabaseWriter(ctx.supabaseUrl, ctx.supabaseServiceRoleKey);
    this.claude = new Anthropic({ apiKey: ctx.anthropicKey });
  }

  /**
   * Découvre la liste d'URLs produit à scraper. Implémenté par chaque
   * site (souvent via sitemap.xml ou crawler de catégories).
   */
  abstract discoverProductUrls(): Promise<string[]>;

  /**
   * Extrait éventuellement le barcode d'une URL avant de fetch la page,
   * pour pouvoir filtrer les EAN déjà connus → économise des appels Claude.
   * Retourner null si on ne peut pas, le scraper fetchra la page complète.
   */
  protected extractBarcodeFromUrl(_url: string): string | null {
    return null;
  }

  /**
   * Main loop. Renvoie les stats du run.
   */
  async run(): Promise<ScraperRunStats> {
    const t0 = Date.now();
    const stats: ScraperRunStats = {
      scraper: this.name,
      pages_visited: 0,
      products_extracted: 0,
      products_inserted: 0,
      products_skipped_dedup: 0,
      errors: 0,
      duration_ms: 0,
      estimated_cost_usd: 0,
    };

    console.log(`[${this.name}] Starting...`);

    let urls = await this.discoverProductUrls();
    console.log(`[${this.name}] Discovered ${urls.length} product URLs`);

    if (this.ctx.maxProducts) {
      urls = urls.slice(0, this.ctx.maxProducts);
      console.log(`[${this.name}] Limited to ${urls.length} (maxProducts)`);
    }

    const productsBuffer: ScrapedProduct[] = [];
    const BATCH_INSERT = 50;

    for (const url of urls) {
      stats.pages_visited++;

      // Quick pre-check : si on peut extraire le barcode depuis l'URL et qu'il
      // est déjà en DB → skip (économise un appel Claude)
      const earlyBarcode = this.extractBarcodeFromUrl(url);
      if (earlyBarcode && (await this.writer.barcodeExists(earlyBarcode))) {
        stats.products_skipped_dedup++;
        continue;
      }

      // Fetch HTML
      const fetched = await this.http.fetch(url);
      if (!fetched.ok) {
        stats.errors++;
        console.error(`[${this.name}] Fetch failed ${url}: ${fetched.error ?? fetched.status}`);
        continue;
      }

      // Extract via Claude
      const extracted = await extractWithClaude({
        html: fetched.html,
        pageUrl: fetched.finalUrl,
        hintCategory: this.defaultCategory,
        client: this.claude,
      });

      stats.estimated_cost_usd += extracted.costUsd;

      if (!extracted.product || !extracted.product.barcode) {
        stats.errors++;
        if (extracted.error && stats.errors <= 5) {
          console.warn(`[${this.name}] Extract failed ${url}: ${extracted.error}`);
        }
        continue;
      }

      stats.products_extracted++;

      const product: ScrapedProduct = {
        barcode: extracted.product.barcode!,
        name: extracted.product.name ?? 'Produit',
        brand: extracted.product.brand ?? '',
        category: (extracted.product.category as ScrapedProduct['category']) ?? this.defaultCategory,
        ingredients_raw: extracted.product.ingredients_raw ?? '',
        image_url: extracted.product.image_url ?? null,
        description_fr: extracted.product.description_fr ?? null,
        intended_use: extracted.product.intended_use ?? null,
        source: this.sourceKey,
        source_url: fetched.finalUrl,
        quality_score: this.qualityScore,
        metadata: {
          scraped_at: new Date().toISOString(),
          ...(extracted.product.metadata as Record<string, unknown> | undefined ?? {}),
        },
      };
      productsBuffer.push(product);

      // Flush batch
      if (productsBuffer.length >= BATCH_INSERT) {
        if (!this.ctx.dryRun) {
          const result = await this.writer.insertBatch(productsBuffer);
          stats.products_inserted += result.inserted;
          stats.products_skipped_dedup += result.skipped;
          if (result.errors.length > 0) {
            stats.errors += result.errors.length;
            console.error(`[${this.name}] Insert errors:`, result.errors.slice(0, 3));
          }
        }
        productsBuffer.length = 0;
        console.log(
          `[${this.name}] Progress: ${stats.products_inserted} inserted, ${stats.pages_visited}/${urls.length} pages, $${stats.estimated_cost_usd.toFixed(3)}`,
        );
      }
    }

    // Final flush
    if (productsBuffer.length > 0 && !this.ctx.dryRun) {
      const result = await this.writer.insertBatch(productsBuffer);
      stats.products_inserted += result.inserted;
      stats.products_skipped_dedup += result.skipped;
    }

    stats.duration_ms = Date.now() - t0;

    console.log(`[${this.name}] DONE in ${(stats.duration_ms / 1000).toFixed(1)}s`);
    console.log(`[${this.name}] ${stats.products_inserted} inserted, ${stats.products_skipped_dedup} skipped, ${stats.errors} errors, $${stats.estimated_cost_usd.toFixed(2)}`);

    return stats;
  }
}
