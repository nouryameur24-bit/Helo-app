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

/**
 * Lot 19-E1c hot-fix — Métadonnées partielles (nom/marque/photo) même si la
 * fiche OBF/OFF n'a pas d'ingrédients.
 *
 * Utilisation : quand `fetchFromOpenFacts` renvoie null, on tente cette
 * version "soft" pour proposer au mobile "On a trouvé ton produit mais sans
 * sa composition. Prends une photo des ingrédients pour qu'on l'analyse."
 * → meilleure UX que "Produit inconnu" sec.
 *
 * Cascade : OBF d'abord (le user vient de scanner depuis sa salle de bain
 * vraisemblablement, donc cosmétique > food). Fallback OFF si rien.
 */
export interface PartialMetadata {
  name: string;
  brand: string | null;
  imageUrl: string | null;
  source: "openfoodfacts" | "openbeautyfacts";
}

async function fetchMetadataOnly(
  base: string,
  barcode: string,
  source: PartialMetadata["source"],
): Promise<PartialMetadata | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `${base}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`;
    const res = await fetch(url, { signal: controller.signal });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as OffApiResponse;
    if (data.status === 0 || !data.product) return null;
    const p = data.product;
    const name = (p.product_name_fr ?? p.product_name ?? "").trim();
    const brand = (p.brands ?? "").trim();
    // Considéré "trouvé" si on a au moins un nom OU une marque utile.
    if (!name && !brand) return null;
    return {
      name: name || "Produit",
      brand: brand || null,
      imageUrl: p.image_front_url ?? p.image_url ?? null,
      source,
    };
  } catch (err) {
    logger.warn({ err, base, barcode }, "OFF metadata fetch error");
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchPartialMetadata(
  barcode: string,
): Promise<PartialMetadata | null> {
  const obf = await fetchMetadataOnly(OBF_API_BASE, barcode, "openbeautyfacts");
  if (obf) return obf;
  return fetchMetadataOnly(OFF_API_BASE, barcode, "openfoodfacts");
}
