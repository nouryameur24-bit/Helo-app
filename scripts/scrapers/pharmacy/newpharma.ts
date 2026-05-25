/**
 * scrapers/pharmacy/newpharma.ts
 *
 * Newpharma (newpharma.be / newpharma.fr) — ~50k SKUs FR/BE Magento-based.
 * INCI complet sur fiches produit.
 *
 * Run :
 *   pnpm --filter @workspace/scripts tsx scrapers/pharmacy/newpharma.ts [--dry-run] [--max=100]
 */
import { BaseScraper } from '../_shared/scraper_base.js';
import type { ScrapeContext } from '../_shared/types.js';

class NewpharmaScraper extends BaseScraper {
  readonly name = 'Newpharma';
  readonly sourceKey = 'scraped_newpharma';
  readonly qualityScore = 80;
  readonly defaultCategory = 'cosmetic' as const;

  async discoverProductUrls(): Promise<string[]> {
    // Magento → sitemap.xml index puis sub-sitemaps produits
    const baseSitemap = 'https://www.newpharma.fr/sitemap.xml';
    const subs = await this.http.fetchSitemap(baseSitemap);
    // Magento nomme typiquement les product sitemaps `sitemap_product_1.xml`, etc.
    const productSubs = subs.filter((u) => /sitemap.*product/i.test(u));
    if (productSubs.length === 0) return subs.filter((u) => /\/p\d+\//.test(u));

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

  const scraper = new NewpharmaScraper({
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
