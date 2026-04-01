/**
 * products.ts — Fetch top 100 popular French products from Open Food Facts.
 *
 * Products are pre-loaded into the database so they resolve instantly
 * (without API call) when scanned in the app.
 *
 * API: https://world.openfoodfacts.org/cgi/search.pl
 */

import { fetchWithTimeout, log, RateLimiter, withRetry } from './utils.js';

const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';

const rateLimiter = new RateLimiter(2, 500); // 2 req/s — polite crawling

export interface OFFProduct {
  barcode: string;
  name: string;
  brand: string;
  ingredients_text_fr: string;
  categories: string;
}

interface OFFSearchResponse {
  products?: OFFProductRaw[];
  count?: number;
}

interface OFFProductRaw {
  code?: string;
  product_name_fr?: string;
  product_name?: string;
  brands?: string;
  ingredients_text_fr?: string;
  ingredients_text?: string;
  categories_tags?: string[];
  categories?: string;
  unique_scans_n?: number;
}

/**
 * Fetches the top 100 most scanned French products from Open Food Facts.
 */
export async function fetchTopFrenchProducts(limit = 100): Promise<OFFProduct[]> {
  log.info(`OFF — fetching top ${limit} popular French products…`);

  const products: OFFProduct[] = [];
  const pageSize = 50;
  const pages = Math.ceil(limit / pageSize);

  for (let page = 1; page <= pages; page++) {
    try {
      await rateLimiter.acquire();

      const params = new URLSearchParams({
        action: 'process',
        tagtype_0: 'countries',
        tag_contains_0: 'contains',
        tag_0: 'france',
        sort_by: 'unique_scans_n',
        page_size: String(pageSize),
        page: String(page),
        json: '1',
        fields: 'code,product_name_fr,product_name,brands,ingredients_text_fr,ingredients_text,categories_tags,categories,unique_scans_n',
      });

      const url = `${OFF_SEARCH_URL}?${params.toString()}`;

      const res = await withRetry(
        () => fetchWithTimeout(url, { timeoutMs: 20_000 }),
        { maxAttempts: 3, label: `OFF page ${page}` },
      );

      if (!res.ok) {
        log.warn(`OFF — page ${page} returned HTTP ${res.status}`);
        continue;
      }

      const json = await res.json() as OFFSearchResponse;
      const raw = json.products ?? [];

      for (const p of raw) {
        const barcode = p.code?.trim();
        if (!barcode) continue;

        const name = (p.product_name_fr || p.product_name || '').trim();
        if (!name) continue;

        const ingredientsText = (p.ingredients_text_fr || p.ingredients_text || '').trim();
        const brand = (p.brands || '').split(',')[0].trim();
        const categories = (p.categories || p.categories_tags?.join(', ') || '').trim();

        products.push({ barcode, name, brand, ingredients_text_fr: ingredientsText, categories });

        if (products.length >= limit) break;
      }

      log.info(`OFF — page ${page}/${pages}: ${products.length}/${limit} products collected`);

      if (products.length >= limit) break;
    } catch (err) {
      log.warn(`OFF — page ${page} failed: ${String(err)}`);
    }
  }

  // Validate barcodes (EAN-13: 13 digits, EAN-8: 8 digits, UPC-A: 12 digits)
  const valid = products.filter((p) => /^\d{8,14}$/.test(p.barcode));
  const invalid = products.length - valid.length;

  if (invalid > 0) {
    log.warn(`OFF — filtered out ${invalid} products with invalid barcodes`);
  }

  log.ok(`OFF — collected ${valid.length} valid products`);
  return valid;
}

/**
 * Fetch a single product by barcode from Open Food Facts (for enrichment).
 */
export async function fetchProductByBarcode(barcode: string): Promise<OFFProduct | null> {
  await rateLimiter.acquire();

  try {
    const res = await fetchWithTimeout(
      `${OFF_PRODUCT_URL}/${barcode}.json`,
      { timeoutMs: 10_000 },
    );
    if (!res.ok) return null;

    const json = await res.json() as { product?: OFFProductRaw; status?: number };
    if (json.status !== 1 || !json.product) return null;

    const p = json.product;
    return {
      barcode,
      name: (p.product_name_fr || p.product_name || '').trim(),
      brand: (p.brands || '').split(',')[0].trim(),
      ingredients_text_fr: (p.ingredients_text_fr || p.ingredients_text || '').trim(),
      categories: (p.categories || p.categories_tags?.join(', ') || '').trim(),
    };
  } catch {
    return null;
  }
}
