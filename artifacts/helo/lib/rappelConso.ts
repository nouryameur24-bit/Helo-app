import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL =
  'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/rappelconso-v2-gtin-trie/records';

const RECALL_CACHE_KEY = '@helo_recall_cache';
const RECALL_CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

export interface RappelConsoRecord {
  id: number;
  gtin?: number | null;
  libelle: string;
  marque_produit: string;
  modeles_ou_references?: string | null;
  motif_rappel: string;
  risques_encourus?: string | null;
  categorie_produit: string;
  sous_categorie_produit?: string | null;
  date_publication: string;
  lien_vers_la_fiche_rappel: string;
  liens_vers_les_images?: string | null;
  conduites_a_tenir_par_le_consommateur?: string | null;
}

interface RecallCache {
  fetchedAt: number;
  records: RappelConsoRecord[];
}

export interface RecallMatch {
  product: { productName: string; brand?: string; barcode?: string };
  recall: RappelConsoRecord;
}

// ─── Normalize a string for fuzzy comparison ──────────────────────────────────
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordsMatch(a: string, b: string): boolean {
  const wa = normalize(a).split(' ').filter((w) => w.length > 2);
  const wb = normalize(b).split(' ').filter((w) => w.length > 2);
  if (wa.length === 0 || wb.length === 0) return false;
  const matches = wa.filter((w) => wb.includes(w));
  return matches.length >= Math.max(1, Math.min(wa.length, wb.length) - 1);
}

// ─── Fetch recent recalls from RappelConso V2 ─────────────────────────────────
export async function fetchRecentRecalls(forceRefresh = false): Promise<RappelConsoRecord[]> {
  if (!forceRefresh) {
    try {
      const cached = await AsyncStorage.getItem(RECALL_CACHE_KEY);
      if (cached) {
        const { fetchedAt, records }: RecallCache = JSON.parse(cached);
        if (Date.now() - fetchedAt < RECALL_CACHE_TTL) {
          return records;
        }
      }
    } catch {
    }
  }

  const params = new URLSearchParams({
    limit: '50',
    sort: '-date_publication',
    select:
      'id,gtin,libelle,marque_produit,modeles_ou_references,motif_rappel,risques_encourus,' +
      'categorie_produit,sous_categorie_produit,date_publication,lien_vers_la_fiche_rappel,' +
      'liens_vers_les_images,conduites_a_tenir_par_le_consommateur',
  });

  const resp = await fetch(`${BASE_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!resp.ok) throw new Error(`RappelConso API ${resp.status}`);

  const json = await resp.json();
  const records: RappelConsoRecord[] = json.results ?? [];

  await AsyncStorage.setItem(
    RECALL_CACHE_KEY,
    JSON.stringify({ fetchedAt: Date.now(), records }),
  ).catch(() => {});

  return records;
}

// ─── Check a single barcode against recalls ───────────────────────────────────
export function checkBarcodeForRecall(
  barcode: string,
  recalls: RappelConsoRecord[],
): RappelConsoRecord | null {
  if (!barcode) return null;
  const code = parseInt(barcode, 10);
  if (isNaN(code)) return null;

  return recalls.find((r) => r.gtin === code) ?? null;
}

// ─── Cross shelf products with recall list ────────────────────────────────────
export function checkShelfForRecalls(
  shelfProducts: Array<{ productName?: string; brand?: string; barcode?: string }>,
  recalls: RappelConsoRecord[],
): RecallMatch[] {
  const found: RecallMatch[] = [];

  for (const product of shelfProducts) {
    const pName = product.productName ?? '';
    const pBrand = product.brand ?? '';

    for (const recall of recalls) {
      let matched = false;

      // 1. GTIN / barcode exact match (most reliable)
      if (product.barcode && recall.gtin) {
        const code = parseInt(product.barcode, 10);
        if (!isNaN(code) && code === recall.gtin) {
          matched = true;
        }
      }

      // 2. Brand + name fuzzy match
      if (!matched && pBrand && recall.marque_produit) {
        const brandMatch = normalize(pBrand) === normalize(recall.marque_produit) ||
          wordsMatch(pBrand, recall.marque_produit);
        if (brandMatch) {
          const nameToCheck = recall.libelle || recall.modeles_ou_references || '';
          if (nameToCheck && wordsMatch(pName, nameToCheck)) {
            matched = true;
          }
        }
      }

      // 3. Name-only match (high-threshold to avoid false positives)
      if (!matched && pName.length > 4) {
        const nameToCheck = recall.libelle || '';
        if (nameToCheck.length > 4 && normalize(pName) === normalize(nameToCheck)) {
          matched = true;
        }
      }

      if (matched) {
        found.push({ product: { productName: pName, brand: pBrand, barcode: product.barcode }, recall });
        break; // one match per product
      }
    }
  }

  return found;
}
