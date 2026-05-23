import { logger } from "./logger";

const OFF_API_BASE = "https://world.openfoodfacts.org/api/v2/product";
const OBF_API_BASE = "https://world.openbeautyfacts.org/api/v2/product";
const FIELDS =
  "product_name,product_name_fr,brands,image_url,image_front_url,ingredients_text_fr,ingredients_text";
const FETCH_TIMEOUT_MS = 6_000;

export interface OffProduct {
  name: string;
  brand: string | null;
  imageUrl: string | null;
  ingredientsRaw: string;
  source: "openfoodfacts" | "openbeautyfacts";
}

interface OffApiProduct {
  product_name?: string;
  product_name_fr?: string;
  brands?: string;
  image_url?: string;
  image_front_url?: string;
  ingredients_text_fr?: string;
  ingredients_text?: string;
}
interface OffApiResponse {
  status: number;
  product?: OffApiProduct;
}

async function fetchOne(
  base: string,
  barcode: string,
  source: OffProduct["source"],
): Promise<OffProduct | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `${base}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`;
    const res = await fetch(url, { signal: controller.signal });
    if (res.status === 404) return null;
    if (!res.ok) {
      logger.warn({ base, status: res.status }, "OFF non-OK response");
      return null;
    }
    const data = (await res.json()) as OffApiResponse;
    if (data.status === 0 || !data.product) return null;
    const p = data.product;
    const ingredientsRaw =
      p.ingredients_text_fr ?? p.ingredients_text ?? "";
    if (!ingredientsRaw.trim()) return null;
    return {
      name: p.product_name_fr ?? p.product_name ?? "Produit inconnu",
      brand: p.brands ?? null,
      imageUrl: p.image_front_url ?? p.image_url ?? null,
      ingredientsRaw,
      source,
    };
  } catch (err) {
    logger.warn({ err, base, barcode }, "OFF fetch error");
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Cascade: OpenFoodFacts (alimentaire) → OpenBeautyFacts (cosmétique).
 * Returns null if neither has the barcode or if no ingredients are listed.
 */
export async function fetchFromOpenFacts(
  barcode: string,
): Promise<OffProduct | null> {
  const food = await fetchOne(OFF_API_BASE, barcode, "openfoodfacts");
  if (food) return food;
  return fetchOne(OBF_API_BASE, barcode, "openbeautyfacts");
}
