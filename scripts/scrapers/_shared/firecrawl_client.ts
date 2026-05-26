/**
 * scrapers/_shared/firecrawl_client.ts
 *
 * Wrapper Firecrawl API pour récupérer une page web en markdown clean
 * (au lieu de HTML brut 25k tokens). Firecrawl gère :
 *   - Bypass Cloudflare/Akamai/PerimeterX (browser fingerprinting + proxies)
 *   - JS rendering pour SPA
 *   - HTML → markdown clean
 *   - Structured extraction (qu'on n'utilise pas, on garde Claude pour ça)
 *
 * Pricing Firecrawl (2026) :
 *   - Free : 500 pages/mois, 1 req/s
 *   - Hobby $19/mo : 5k pages, 2 req/s
 *   - Standard $99/mo : 100k pages, 5 req/s
 *
 * Doc API : https://docs.firecrawl.dev/api-reference/endpoint/scrape
 */

const FIRECRAWL_API = 'https://api.firecrawl.dev/v1/scrape';

export interface FirecrawlScrapeResult {
  ok: boolean;
  markdown: string;
  metadata: {
    title?: string;
    description?: string;
    ogImage?: string;
    sourceURL?: string;
    statusCode?: number;
  };
  error?: string;
}

interface FirecrawlClientOpts {
  apiKey: string;
  timeoutMs?: number;
  /** Format de sortie. 'markdown' = par défaut (clean, optimisé pour LLM). */
  formats?: Array<'markdown' | 'html' | 'rawHtml'>;
  /** Wait time before scraping (pour pages SPA). Défaut 1500ms. */
  waitFor?: number;
  /** Active stealth mode (bypass anti-bot). Coût +1 credit. */
  stealthProxy?: boolean;
}

export class FirecrawlClient {
  private apiKey: string;
  private timeoutMs: number;
  private formats: Array<'markdown' | 'html' | 'rawHtml'>;
  private waitFor: number;
  private stealthProxy: boolean;

  constructor(opts: FirecrawlClientOpts) {
    this.apiKey = opts.apiKey;
    this.timeoutMs = opts.timeoutMs ?? 60_000;
    this.formats = opts.formats ?? ['markdown'];
    this.waitFor = opts.waitFor ?? 1500;
    this.stealthProxy = opts.stealthProxy ?? false;
  }

  async scrape(url: string): Promise<FirecrawlScrapeResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(FIRECRAWL_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          url,
          formats: this.formats,
          waitFor: this.waitFor,
          ...(this.stealthProxy ? { proxy: 'stealth' } : {}),
          // Inclut metadata pour récup title/description rapidement
          includeTags: ['main', 'article', '[id*="composition"]', '[class*="composition"]', '[id*="ingred"]', '[class*="ingred"]'],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        return {
          ok: false,
          markdown: '',
          metadata: {},
          error: `firecrawl_${response.status}: ${errText.slice(0, 200)}`,
        };
      }

      const data = (await response.json()) as {
        success: boolean;
        data?: {
          markdown?: string;
          html?: string;
          metadata?: Record<string, unknown>;
        };
        error?: string;
      };

      if (!data.success || !data.data) {
        return {
          ok: false,
          markdown: '',
          metadata: {},
          error: data.error ?? 'no_data',
        };
      }

      return {
        ok: true,
        markdown: data.data.markdown ?? '',
        metadata: {
          title: data.data.metadata?.title as string | undefined,
          description: data.data.metadata?.description as string | undefined,
          ogImage: data.data.metadata?.ogImage as string | undefined,
          sourceURL: data.data.metadata?.sourceURL as string | undefined,
          statusCode: data.data.metadata?.statusCode as number | undefined,
        },
      };
    } catch (err) {
      return {
        ok: false,
        markdown: '',
        metadata: {},
        error: `firecrawl_exception: ${(err as Error).message}`,
      };
    }
  }

  /**
   * Map endpoint : crawl tout un sitemap d'un site en async.
   * Plus efficace que scrape × N pour les gros volumes.
   *
   * NOTE : pour Hēlo on préfère scrape unitaire car on dedup le barcode
   * avant Claude → plus de contrôle sur le coût.
   */
  async map(url: string): Promise<string[]> {
    const response = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { links?: string[] };
    return data.links ?? [];
  }
}
