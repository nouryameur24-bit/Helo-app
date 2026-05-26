/**
 * scrapers/_shared/scraper_base.ts
 *
 * Classe abstraite parente. Refactor Firecrawl :
 *   - Firecrawl pour fetch + markdown conversion + anti-bot bypass
 *   - Claude pour extraction structured depuis markdown (5x moins cher qu'HTML)
 *   - Supabase pour insert avec dedup EAN
 *
 * Le sitemap discovery reste en HTTP simple via http_runner (sitemaps sont
 * publics et pas anti-bot).
 */
import Anthropic from '@anthropic-ai/sdk';

import { extractWithClaude } from './claude_extractor.js';
import { FirecrawlClient } from './firecrawl_client.js';
import { HttpRunner } from './http_runner.js';
import { SupabaseWriter } from './supabase_writer.js';
import type { ScrapedProduct, ScraperRunStats, ScrapeContext } from './types.js';

export abstract class BaseScraper {
  abstract readonly name: string;
  /**
   * Source key DB. CONVENTION CHANGED (task #121) :
   * - 'helo_cosmetic_db_v1' pour cosmétiques (au lieu de 'scraped_pharma_gdd')
   * - 'helo_food_db_v1' pour food drives
   * - 'helo_medication_db_v1' pour pharmacie médicaments
   * Masque l'origine du scraping côté DB (anti-traceability).
   */
  abstract readonly sourceKey: string;
  abstract readonly qualityScore: number;
  abstract readonly defaultCategory: 'cosmetic' | 'food' | 'medication';

  protected http: HttpRunner; // pour sitemap discovery uniquement
  protected firecrawl: FirecrawlClient; // pour fetch pages produit
  protected writer: SupabaseWriter;
  protected claude: Anthropic;
  protected ctx: ScrapeContext;

  constructor(ctx: ScrapeContext) {
    this.ctx = ctx;
    this.http = new HttpRunner({ rateLimitPerSec: 1.5 });
    this.firecrawl = new FirecrawlClient({
      apiKey: ctx.firecrawlKey,
      stealthProxy: ctx.firecrawlStealth ?? false,
    });
    this.writer = new SupabaseWriter(ctx.supabaseUrl, ctx.supabaseServiceRoleKey);
    this.claude = new Anthropic({ apiKey: ctx.anthropicKey });
  }

  abstract discoverProductUrls(): Promise<string[]>;

  protected extractBarcodeFromUrl(_url: string): string | null {
    return null;
  }

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

    console.log(`[${this.name}] Starting (Firecrawl-powered)...`);

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

      // Pre-check : si on peut extraire le barcode de l'URL et il est déjà en DB → skip
      const earlyBarcode = this.extractBarcodeFromUrl(url);
      if (earlyBarcode && (await this.writer.barcodeExists(earlyBarcode))) {
        stats.products_skipped_dedup++;
        continue;
      }

      // 1. Fetch via Firecrawl → markdown clean
      const fetched = await this.firecrawl.scrape(url);
      if (!fetched.ok || !fetched.markdown) {
        stats.errors++;
        if (stats.errors <= 5) {
          console.error(`[${this.name}] Firecrawl failed ${url}: ${fetched.error}`);
        }
        continue;
      }

      // 2. Extract via Claude (markdown = ~3k tokens vs 25k HTML brut)
      const extracted = await extractWithClaude({
        markdown: fetched.markdown,
        pageUrl: fetched.metadata.sourceURL ?? url,
        hintCategory: this.defaultCategory,
        pageTitle: fetched.metadata.title,
        pageDescription: fetched.metadata.description,
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
        image_url: extracted.product.image_url ?? fetched.metadata.ogImage ?? null,
        description_fr: extracted.product.description_fr ?? null,
        intended_use: extracted.product.intended_use ?? null,
        source: this.sourceKey,
        // ⚠️ source_url volontairement NON inclus dans metadata (anti-traceability)
        source_url: '', // garde le champ pour compat type, mais writer ne le push pas
        quality_score: this.qualityScore,
        metadata: {
          scraped_at: new Date().toISOString(),
          ...(extracted.product.metadata as Record<string, unknown> | undefined ?? {}),
        },
      };
      productsBuffer.push(product);

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
      console.log(`[${this.name}] Final flush: ${productsBuffer.length} products`);
      const result = await this.writer.insertBatch(productsBuffer);
      stats.products_inserted += result.inserted;
      stats.products_skipped_dedup += result.skipped;
      if (result.errors.length > 0) {
        stats.errors += result.errors.length;
        console.error(`[${this.name}] Final flush errors:`, result.errors);
      }
      console.log(
        `[${this.name}] Final flush done: +${result.inserted} inserted, +${result.skipped} skipped, ${result.errors.length} errors`,
      );
    }
    if (productsBuffer.length > 0 && this.ctx.dryRun) {
      console.log(`[${this.name}] DRY-RUN sample (1st of ${productsBuffer.length}):`);
      console.log(JSON.stringify(productsBuffer[0], null, 2));
    }

    stats.duration_ms = Date.now() - t0;

    console.log(`[${this.name}] DONE in ${(stats.duration_ms / 1000).toFixed(1)}s`);
    console.log(`[${this.name}] ${stats.products_inserted} inserted, ${stats.products_skipped_dedup} skipped, ${stats.errors} errors, $${stats.estimated_cost_usd.toFixed(2)} Claude`);

    return stats;
  }
}
