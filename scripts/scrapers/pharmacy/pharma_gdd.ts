/**
 * scrapers/pharmacy/pharma_gdd.ts
 *
 * Pharma GDD (pharma-gdd.com) — ~30k SKUs FR.
 *
 * Run :
 *   pnpm --filter @workspace/scripts tsx scrapers/pharmacy/pharma_gdd.ts [--dry-run] [--max=100]
 */
import { BaseScraper } from '../_shared/scraper_base.js';
import type { ScrapeContext } from '../_shared/types.js';

class PharmaGddScraper extends BaseScraper {
  readonly name = 'PharmacyDB';
  // Task #121 anti-traceability : neutral source key.
  readonly sourceKey = 'helo_cosmetic_db_v1';
  readonly qualityScore = 80;
  readonly defaultCategory = 'cosmetic' as const;

  async discoverProductUrls(): Promise<string[]> {
    // Recon validée 2026-05-25 : https://www.pharma-gdd.com/sitemap-product.xml
    // retourne 14 672 URLs produit direct (pas de sitemap index intermédiaire).
    const productSitemap = 'https://www.pharma-gdd.com/sitemap-product.xml';
    const urls = await this.http.fetchSitemap(productSitemap);
    console.log(`[${this.name}] Sitemap returned ${urls.length} product URLs`);
    return urls;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const maxArg = args.find((a) => a.startsWith('--max='));
  const maxProducts = maxArg ? Number(maxArg.split('=')[1]) : undefined;

  if (!process.env.FIRECRAWL_API_KEY) {
    console.error('Missing env: FIRECRAWL_API_KEY (https://firecrawl.dev/app/api-keys)');
    process.exit(1);
  }

  const scraper = new PharmaGddScraper({
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
    firecrawlKey: process.env.FIRECRAWL_API_KEY,
    firecrawlStealth: process.env.FIRECRAWL_STEALTH === '1',
    dryRun,
    maxProducts,
  });
  const stats = await scraper.run();
  console.log('\n=== FINAL STATS ===');
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
