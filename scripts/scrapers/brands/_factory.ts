/**
 * scrapers/brands/_factory.ts
 *
 * Factory pour les scrapers marques. Les 12 brands cibles ont toutes
 * une structure similaire (Magento, Shopify, ou custom SPA) — on partage
 * la même implémentation, on switch juste les URLs de discovery.
 */
import { BaseScraper } from '../_shared/scraper_base.js';
import type { ScrapeContext } from '../_shared/types.js';

export interface BrandConfig {
  /** Nom commercial (Avène, Mustela, La Roche-Posay, ...). */
  name: string;
  /** Identifiant source pour DB. Convention : 'scraped_brand_<slug>'. */
  sourceKey: string;
  /** Sitemap principal (souvent /sitemap.xml). */
  sitemapUrl: string;
  /** Patterns regex pour identifier URLs produit dans le sitemap. */
  productUrlPatterns: RegExp[];
  /** Patterns regex pour exclure (CMS, blog, etc.). */
  excludePatterns?: RegExp[];
}

export class BrandScraper extends BaseScraper {
  readonly name: string;
  readonly sourceKey: string;
  readonly qualityScore = 90; // marque officielle = source la plus pure
  readonly defaultCategory = 'cosmetic' as const;

  private config: BrandConfig;

  constructor(ctx: ScrapeContext, config: BrandConfig) {
    super(ctx);
    this.name = config.name;
    this.sourceKey = config.sourceKey;
    this.config = config;
  }

  async discoverProductUrls(): Promise<string[]> {
    // Beaucoup de marques ont un sitemap index → on flatten
    const allFromSitemap = await this.expandSitemap(this.config.sitemapUrl);

    const productUrls = allFromSitemap.filter((url) => {
      if (this.config.excludePatterns?.some((re) => re.test(url))) return false;
      return this.config.productUrlPatterns.some((re) => re.test(url));
    });

    return productUrls;
  }

  /**
   * Suit récursivement les sub-sitemaps. Limit depth=3 pour éviter loops.
   *
   * Note : on accepte les URLs contenant `sitemap*.xml` même avec query string
   * (Shopify utilise `sitemap_products_1.xml?from=...&to=...`).
   */
  private async expandSitemap(sitemapUrl: string, depth = 0): Promise<string[]> {
    if (depth > 3) return [];
    const urls = await this.http.fetchSitemap(sitemapUrl);
    console.log(`[${this.name}] Expanded sitemap ${sitemapUrl} → ${urls.length} URLs`);
    const expanded: string[] = [];
    for (const u of urls) {
      // Match sitemap URLs même avec query string (Shopify pattern)
      if (/sitemap[^/]*\.xml(\.gz)?(\?|$)/i.test(u)) {
        const subs = await this.expandSitemap(u, depth + 1);
        expanded.push(...subs);
      } else {
        expanded.push(u);
      }
    }
    return expanded;
  }
}

/**
 * Catalogue des 12 brands pharmacie FR populaires en grossesse.
 * Sitemaps validés au 25/05/2026.
 */
export const BRAND_CONFIGS: BrandConfig[] = [
  {
    name: 'Avène',
    sourceKey: 'scraped_brand_avene',
    sitemapUrl: 'https://www.eau-thermale-avene.fr/sitemap.xml',
    productUrlPatterns: [/\/p\//i, /\/produit\//i, /\/products\//i],
    excludePatterns: [/\/blog\//i, /\/conseil\//i],
  },
  {
    name: 'Mustela',
    sourceKey: 'scraped_brand_mustela',
    sitemapUrl: 'https://www.mustela.fr/sitemap.xml',
    productUrlPatterns: [/\/products?\//i, /\/produit\//i],
    excludePatterns: [/\/blog\//i],
  },
  {
    name: 'La Roche-Posay',
    sourceKey: 'scraped_brand_la_roche_posay',
    sitemapUrl: 'https://www.laroche-posay.fr/sitemap.xml',
    productUrlPatterns: [/\/products?\//i, /\/produit\//i],
    excludePatterns: [/\/blog\//i, /\/conseil\//i, /\/expert\//i],
  },
  {
    name: 'Bioderma',
    sourceKey: 'scraped_brand_bioderma',
    sitemapUrl: 'https://www.bioderma.fr/sitemap.xml',
    productUrlPatterns: [/\/produit\//i, /\/products?\//i],
    excludePatterns: [/\/conseil\//i],
  },
  {
    name: 'Weleda',
    sourceKey: 'scraped_brand_weleda',
    sitemapUrl: 'https://www.weleda.fr/sitemap.xml',
    productUrlPatterns: [/\/produit\//i, /\/products?\//i],
    excludePatterns: [/\/magazine\//i],
  },
  {
    name: 'Nuxe',
    sourceKey: 'scraped_brand_nuxe',
    sitemapUrl: 'https://www.nuxe.com/sitemap.xml',
    productUrlPatterns: [/\/products?\//i, /\/produit\//i],
    excludePatterns: [/\/journal\//i, /\/blog\//i],
  },
  {
    name: 'Caudalie',
    sourceKey: 'scraped_brand_caudalie',
    sitemapUrl: 'https://www.caudalie.com/sitemap.xml',
    productUrlPatterns: [/\/products?\//i, /\/produit\//i],
    excludePatterns: [/\/blog\//i, /\/magazine\//i],
  },
  {
    name: 'Lierac',
    sourceKey: 'scraped_brand_lierac',
    sitemapUrl: 'https://www.lierac.fr/sitemap.xml',
    productUrlPatterns: [/\/produit\//i, /\/products?\//i, /\/p\//i],
    excludePatterns: [/\/conseil\//i],
  },
  {
    name: 'Vichy',
    sourceKey: 'scraped_brand_vichy',
    sitemapUrl: 'https://www.vichy.fr/sitemap.xml',
    productUrlPatterns: [/\/products?\//i, /\/produit\//i],
    excludePatterns: [/\/conseil\//i, /\/diag\//i],
  },
  {
    name: 'SVR',
    sourceKey: 'scraped_brand_svr',
    sitemapUrl: 'https://www.labo-svr.com/sitemap.xml',
    productUrlPatterns: [/\/produit\//i, /\/products?\//i],
    excludePatterns: [/\/conseil\//i],
  },
  {
    name: 'A-Derma',
    sourceKey: 'scraped_brand_a_derma',
    sitemapUrl: 'https://www.aderma.fr/sitemap.xml',
    productUrlPatterns: [/\/produit\//i, /\/products?\//i],
    excludePatterns: [/\/conseil\//i],
  },
  {
    name: 'Ducray',
    sourceKey: 'scraped_brand_ducray',
    sitemapUrl: 'https://www.ducray.com/sitemap.xml',
    productUrlPatterns: [/\/products?\//i, /\/produit\//i],
    excludePatterns: [/\/blog\//i, /\/conseil\//i],
  },
];
