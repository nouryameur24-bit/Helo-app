/**
 * scrapers/pharmacy/doctipharma.ts
 *
 * Doctipharma (1001pharmacies.com) — ~80k SKUs FR avec EAN + INCI complet.
 *
 * Stratégie de discovery :
 *   - GET /sitemap-products.xml → liste de toutes les URLs produit
 *   - Filter celles qui ressemblent à des produits cosmétique/parapharmacie
 *
 * Run :
 *   pnpm --filter @workspace/scripts tsx scrapers/pharmacy/doctipharma.ts [--dry-run] [--max=100]
 */
import { BaseScraper } from '../_shared/scraper_base.js';
import type { ScrapeContext } from '../_shared/types.js';

class DoctipharmaScraper extends BaseScraper {
  readonly name = 'Doctipharma';
  readonly sourceKey = 'scraped_doctipharma';
  readonly qualityScore = 80;
  readonly defaultCategory = 'cosmetic' as const;

  async discoverProductUrls(): Promise<string[]> {
    // 1001pharmacies utilise un sitemap index → on liste les sub-sitemaps
    const indexSitemap = 'https://www.1001pharmacies.com/sitemap.xml';
    const subSitemaps = await this.http.fetchSitemap(indexSitemap);

    // On filtre les sub-sitemaps qui contiennent des produits (les autres = pages catégorie/CMS)
    const productSubSitemaps = subSitemaps.filter(
      (u) => /sitemap-products|sitemap_products|product-sitemap/i.test(u),
    );

    if (productSubSitemaps.length === 0) {
      console.warn(`[${this.name}] No product sitemap found in index, falling back to index URLs`);
      // Fallback : tenter URLs directes
      return subSitemaps.filter((u) => /\/p\//.test(u));
    }

    const allUrls: string[] = [];
    for (const sub of productSubSitemaps) {
      const urls = await this.http.fetchSitemap(sub);
      allUrls.push(...urls);
    }

    return allUrls;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const maxArg = args.find((a) => a.startsWith('--max='));
  const maxProducts = maxArg ? Number(maxArg.split('=')[1]) : undefined;

  const ctx: ScrapeContext = {
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
    rateLimitPerSec: 1.5,
    dryRun,
    maxProducts,
  };

  if (!ctx.supabaseUrl || !ctx.supabaseServiceRoleKey || !ctx.anthropicKey) {
    console.error('Missing env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ANTHROPIC_API_KEY');
    process.exit(1);
  }

  const scraper = new DoctipharmaScraper(ctx);
  const stats = await scraper.run();
  console.log('\n=== FINAL STATS ===');
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
