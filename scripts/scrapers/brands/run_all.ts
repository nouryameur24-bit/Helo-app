/**
 * scrapers/brands/run_all.ts
 *
 * Run les 12 scrapers brands séquentiellement (politesse réseau).
 *
 * Usage :
 *   pnpm --filter @workspace/scripts tsx scrapers/brands/run_all.ts [--dry-run] [--max=50]
 *   pnpm --filter @workspace/scripts tsx scrapers/brands/run_all.ts --brand=Mustela
 */
import { BrandScraper, BRAND_CONFIGS } from './_factory.js';
import type { ScrapeContext } from '../_shared/types.js';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const maxArg = args.find((a) => a.startsWith('--max='));
  const brandArg = args.find((a) => a.startsWith('--brand='));
  const maxProducts = maxArg ? Number(maxArg.split('=')[1]) : undefined;
  const onlyBrand = brandArg ? brandArg.split('=')[1] : undefined;

  const ctx: ScrapeContext = {
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
    firecrawlKey: process.env.FIRECRAWL_API_KEY ?? '',
    firecrawlStealth: process.env.FIRECRAWL_STEALTH === '1',
    dryRun,
    maxProducts,
  };

  if (!ctx.supabaseUrl || !ctx.supabaseServiceRoleKey || !ctx.anthropicKey || !ctx.firecrawlKey) {
    console.error('Missing env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ANTHROPIC_API_KEY / FIRECRAWL_API_KEY');
    process.exit(1);
  }

  const configs = onlyBrand
    ? BRAND_CONFIGS.filter((b) => b.name.toLowerCase() === onlyBrand.toLowerCase())
    : BRAND_CONFIGS;

  if (configs.length === 0) {
    console.error(`Brand not found: ${onlyBrand}`);
    console.error('Available:', BRAND_CONFIGS.map((b) => b.name).join(', '));
    process.exit(1);
  }

  const allStats = [];
  let totalCost = 0;
  for (const config of configs) {
    const scraper = new BrandScraper(ctx, config);
    try {
      const stats = await scraper.run();
      allStats.push(stats);
      totalCost += stats.estimated_cost_usd;
    } catch (err) {
      console.error(`[${config.name}] Fatal:`, err);
      allStats.push({ scraper: config.name, error: (err as Error).message });
    }
  }

  console.log('\n========== FINAL SUMMARY ==========');
  console.log(JSON.stringify(allStats, null, 2));
  console.log(`\nTotal estimated cost: $${totalCost.toFixed(2)}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
