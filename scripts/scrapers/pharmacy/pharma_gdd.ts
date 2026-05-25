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
  readonly name = 'PharmaGDD';
  readonly sourceKey = 'scraped_pharma_gdd';
  readonly qualityScore = 80;
  readonly defaultCategory = 'cosmetic' as const;

  async discoverProductUrls(): Promise<string[]> {
    const sitemap = 'https://www.pharma-gdd.com/sitemap.xml';
    const subs = await this.http.fetchSitemap(sitemap);
    const productSubs = subs.filter((u) => /product|produit/i.test(u));
    if (productSubs.length === 0) return subs;
    const all: string[] = [];
    for (const sub of productSubs) {
      const urls = await this.http.fetchSitemap(sub);
      all.push(...urls);
    }
    return all;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const maxArg = args.find((a) => a.startsWith('--max='));
  const maxProducts = maxArg ? Number(maxArg.split('=')[1]) : undefined;

  const scraper = new PharmaGddScraper({
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
    rateLimitPerSec: 1.5,
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
