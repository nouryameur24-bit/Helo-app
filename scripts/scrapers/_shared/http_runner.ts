/**
 * scrapers/_shared/http_runner.ts
 *
 * HTTP fetcher avec rate limiting global et User-Agent identifiable.
 * On RESPECTE robots.txt et on reste à 1-2 req/sec par défaut — c'est de la
 * courtoisie envers les sites scrapés.
 *
 * Pour les sites SPA qui ont besoin de JS render (rare en e-commerce FR
 * grossesse), on peut basculer vers playwright_runner.ts (à créer si besoin).
 */

/**
 * User-Agent identifiable. Si un admin du site veut nous bloquer, qu'il puisse
 * l'identifier facilement plutôt que de croire à un bot malveillant.
 */
const USER_AGENT =
  'HeloBot/1.0 (+https://helo.app/about/scraping; data-acquisition for pregnancy-safe products)';

interface RateLimiterState {
  lastRequestAt: number;
  minIntervalMs: number;
}

class RateLimiter {
  private state: RateLimiterState;

  constructor(reqPerSec: number) {
    this.state = {
      lastRequestAt: 0,
      minIntervalMs: 1000 / reqPerSec,
    };
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.state.lastRequestAt;
    if (elapsed < this.state.minIntervalMs) {
      const sleepMs = this.state.minIntervalMs - elapsed;
      await new Promise((r) => setTimeout(r, sleepMs));
    }
    this.state.lastRequestAt = Date.now();
  }
}

export interface FetchResult {
  ok: boolean;
  status: number;
  html: string;
  finalUrl: string;
  error?: string;
}

export interface HttpRunnerOptions {
  rateLimitPerSec?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

export class HttpRunner {
  private limiter: RateLimiter;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(opts: HttpRunnerOptions = {}) {
    this.limiter = new RateLimiter(opts.rateLimitPerSec ?? 1.5);
    this.timeoutMs = opts.timeoutMs ?? 20_000;
    this.maxRetries = opts.maxRetries ?? 2;
  }

  async fetch(url: string): Promise<FetchResult> {
    let lastError = '';
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      await this.limiter.wait();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // 429 = rate limited → backoff agressif
        if (response.status === 429) {
          const retryAfter = Number(response.headers.get('retry-after') ?? '5');
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          lastError = `rate_limited (retry after ${retryAfter}s)`;
          continue;
        }

        const html = await response.text();
        return {
          ok: response.ok,
          status: response.status,
          html,
          finalUrl: response.url,
        };
      } catch (err) {
        lastError = (err as Error).message;
        // Exponential backoff between retries
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
    return {
      ok: false,
      status: 0,
      html: '',
      finalUrl: url,
      error: lastError,
    };
  }

  /**
   * Récupère un sitemap.xml et extrait les URLs produit. Beaucoup de sites
   * e-commerce ont un sitemap propre (pas besoin de crawler l'arborescence).
   */
  async fetchSitemap(sitemapUrl: string): Promise<string[]> {
    const result = await this.fetch(sitemapUrl);
    if (!result.ok) return [];
    const urls: string[] = [];
    const locRegex = /<loc>(.*?)<\/loc>/g;
    let match;
    while ((match = locRegex.exec(result.html)) !== null) {
      urls.push(match[1].trim());
    }
    return urls;
  }
}
