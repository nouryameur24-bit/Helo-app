import { Router, type IRouter } from "express";
import { z } from "zod/v4";

import { supabaseAdmin, isSupabaseConfigured } from "../lib/supabaseAdmin";
import {
  matchDeterministic,
  type Phase,
  type IngredientDomain,
} from "../lib/matcher";
import { parseIngredients } from "../lib/parseIngredients";
import {
  selectSafeAlternativesWithClaude,
  type AlternativeCandidate,
} from "../lib/anthropic";
import { emitMetric } from "../lib/metrics";
import { alertSafetyTrap } from "../lib/webhookAlerter";
import { requireAppSecret } from "../middlewares/appSecret";
import { alternativesRateLimit } from "../middlewares/alternativesRateLimit";

const router: IRouter = Router();

// ─── Request validation ─────────────────────────────────────────────────────

const BARCODE_RE = /^[0-9]{6,14}$/;

const QuerySchema = z.object({
  trimester: z.union([
    z.literal("1"),
    z.literal("2"),
    z.literal("3"),
    z.literal("breastfeeding"),
    z.literal("baby"),
  ]),
});

function parsePhase(raw: string): Phase {
  if (raw === "1" || raw === "2" || raw === "3") {
    return Number(raw) as 1 | 2 | 3;
  }
  return raw as "breastfeeding" | "baby";
}

function trimesterCacheKey(t: Phase): string {
  return typeof t === "number" ? `t${t}` : t;
}

// ─── Response shape (mirrors mobile AlternativeProduct) ─────────────────────

type OriginBadge = "pharmacy" | "french" | "bio" | null;

interface AlternativeProductDto {
  id: string;
  name: string;
  brand: string;
  category: string;
  barcode: string | null;
  image_url: string | null;
  description_fr: string | null;
  /**
   * M3 : Phrase française percutante (≤15 mots) générée par Claude pour
   * justifier pourquoi ce produit est sûr pour la phase de grossesse de
   * l'utilisatrice. Null si la sélection vient d'un cache pré-M3 (legacy).
   */
  reason: string | null;
  overall_risk: "safe" | "caution";
  price_range: string;
  popularity_count: number;
  origin_badge: OriginBadge;
}

// ─── Keyword extraction (unchanged from previous filet) ─────────────────────

const PRODUCT_TYPES = [
  // Cosmetics
  "crème visage", "crème mains", "crème corps", "crème solaire",
  "crème nuit", "crème jour", "crème anti-âge", "crème hydratante",
  "crème pieds",
  "lait corps", "lait visage", "lait démaquillant", "lait hydratant",
  "shampoing", "après-shampoing", "masque cheveux", "huile cheveux",
  "gel douche", "savon", "pain de toilette", "déodorant", "parfum",
  "eau micellaire", "eau florale", "lotion tonique", "tonique",
  "dentifrice", "bain de bouche", "fond de teint", "mascara",
  "rouge à lèvres", "baume lèvres", "gloss", "crayon", "fard",
  "huile démaquillante", "sérum", "masque visage", "gommage",
  "huile végétale", "beurre karité", "liniment", "cold cream",
  "soin", "baume",
  // Food
  "yaourt", "fromage", "jambon", "saumon", "thon", "chocolat",
  "biscuit", "pâte à tartiner", "jus", "eau", "lait", "beurre",
  "huile olive", "huile colza", "pâtes", "riz", "céréales",
  "soupe", "compote", "pain", "viennoiserie", "confiture",
  "miel", "café", "thé", "tisane", "soda", "limonade",
  "cola", "boisson", "barre", "bonbon", "glace", "sorbet",
  "boisson énergisante",
];

/**
 * Mapping marque → keywords de recherche OFF.
 *
 * Stratégie : pour chaque marque industrielle (souvent NON-SAFE en
 * grossesse à cause de caféine/colorants/édulcorants), on injecte
 * SIMULTANÉMENT :
 *   1. Le type "like-for-like" (Coke → soda) — au cas où une version safe
 *      existerait dans OFF (rare mais possible).
 *   2. Des types "alternatives safe par défaut" (Coke → eau pétillante,
 *      limonade artisanale) — pour donner au Sniper des candidats qu'il
 *      PEUT valider même si pas exactement le même produit.
 *
 * Sans (2), Claude n'a que des sodas devant lui et refuse tout
 * légitimement (aucun soda industriel n'est "safe T2 sans réserve").
 */
const BRAND_TO_TYPE: Record<string, string[]> = {
  // Sodas → eaux pétillantes/aromatisées + limonades artisanales
  "coke": ["eau pétillante", "limonade", "soda"],
  "coca": ["eau pétillante", "limonade", "soda"],
  "pepsi": ["eau pétillante", "limonade", "soda"],
  "fanta": ["eau pétillante", "limonade", "soda"],
  "sprite": ["eau pétillante", "limonade", "soda"],
  "schweppes": ["eau pétillante", "limonade", "tonic"],
  "orangina": ["eau pétillante", "limonade", "soda"],
  "perrier": ["eau pétillante", "eau"],
  "evian": ["eau", "eau pétillante"],
  // Énergisantes → infusions/jus naturels (vraies alts safe)
  "red bull": ["infusion", "jus", "thé glacé", "boisson énergisante"],
  "monster": ["infusion", "jus", "thé glacé", "boisson énergisante"],
  "burn": ["infusion", "jus", "thé glacé", "boisson énergisante"],
  // Pâtes à tartiner → purées d'oléagineux + confitures
  "nutella": ["pâte à tartiner", "purée amande", "confiture"],
  "nocciolata": ["pâte à tartiner", "purée amande", "confiture"],
  // Barres chocolatées → barres céréales/fruits + chocolat noir
  "twix": ["barre céréales", "fruits secs", "chocolat noir"],
  "mars": ["barre céréales", "fruits secs", "chocolat noir"],
  "snickers": ["barre céréales", "fruits secs", "chocolat noir"],
  "bounty": ["barre céréales", "fruits secs", "chocolat noir"],
  "kit kat": ["barre céréales", "fruits secs", "chocolat noir"],
  "kinder": ["chocolat noir", "barre céréales"],
  "milka": ["chocolat noir"],
  "lindt": ["chocolat noir"],
  "côte d'or": ["chocolat noir"],
  // Biscuits → biscuits bio/sablés simples
  "oreo": ["biscuit bio", "sablé", "biscuit"],
  "prince": ["biscuit bio", "sablé", "biscuit"],
  "lu": ["biscuit bio", "sablé", "biscuit"],
  "granola": ["biscuit bio", "céréales"],
  "petit beurre": ["biscuit bio", "sablé"],
  "bn": ["biscuit bio", "biscuit"],
  // Bonbons → fruits secs + compote
  "haribo": ["fruits secs", "compote", "bonbon bio"],
  "carambar": ["fruits secs", "compote", "bonbon bio"],
  // Glaces → sorbet fruits + yaourt glacé
  "magnum": ["sorbet", "yaourt"],
  "häagen-dazs": ["sorbet", "yaourt"],
  "ben & jerry": ["sorbet", "yaourt"],
};

function extractKeywords(name: string, brand?: string | null): string[] {
  const lower = (name ?? "").toLowerCase();
  const brandLower = (brand ?? "").toLowerCase();
  const hits = new Set<string>();
  // Form factor cues PREMIERS — un "Twix glacé" doit chercher glace/sorbet,
  // pas barre céréales, même si la brand Twix mappe vers barres.
  const isIced = lower.includes("glacé")
    || lower.includes("glace")
    || lower.includes("ice cream")
    || lower.includes("crème glacée");
  if (isIced) {
    hits.add("sorbet");
    hits.add("yaourt glacé");
    hits.add("glace");
  }
  // Brand-derived keywords ENSUITE — mapping spécifique
  // (Prince → biscuit bio, sablé, biscuit). Avant le fallback générique
  // qui fait des matches accidentels comme "choCOLAt" contient "cola".
  for (const [needle, types] of Object.entries(BRAND_TO_TYPE)) {
    if (lower.includes(needle) || brandLower.includes(needle)) {
      for (const t of types) hits.add(t);
    }
  }
  for (const type of PRODUCT_TYPES) {
    if (lower.includes(type)) hits.add(type);
  }
  // Last-resort fallback : si aucun match (cas typique des cosmétiques
  // dermo-pédiatriques type "Crème change 123" ou "Baume réconfortant"
  // qui n'ont aucun keyword exact dans PRODUCT_TYPES), on cherche le
  // premier "vrai" nom de produit dans le name : mot alphabétique pur
  // ≥4 lettres, hors stopwords marketing (bio, sans, naturel, hydra…).
  // Refus systématique des tokens type "100%", chiffres, articles.
  // OBF/OFF acceptent un mot seul et ranke par unique_scans_n — bien
  // suffisant pour donner des candidats au Sniper.
  if (hits.size === 0) {
    const fallbackWord = lower
      .split(/[\s,/()\-_+.0-9%]+/)
      .find((w) => /^[a-zà-ÿ][a-zà-ÿ'’-]{3,}$/iu.test(w) && !KEYWORD_STOPWORDS.has(w));
    if (fallbackWord) hits.add(fallbackWord);
  }
  return Array.from(hits);
}

/**
 * Stopwords génériques marketing / qualificatifs qui ne sont PAS des noms
 * de produit utilisables comme keyword OFF/OBF. Sans ce filtre, le
 * fallback renvoyait des trucs comme "naturel" ou "sans" pour des noms
 * type "BIO 100% naturel sans paraben", ce qui faisait remonter 0 candidat.
 */
const KEYWORD_STOPWORDS = new Set<string>([
  // Marketing / qualité
  "bio", "biologique", "naturel", "naturelle", "natural", "pure", "purs", "organic",
  "premium", "essentiel", "essentielle", "vital", "vegan",
  // Négations / exclusions
  "sans", "zero", "zéro", "free", "non",
  // Articles / liaisons
  "avec", "pour", "sur", "dans", "des", "les", "une", "aux", "leur",
  // Quantifiants
  "tout", "tous", "toute", "toutes", "plus", "moins",
  // Sensations / promesses
  "doux", "douce", "frais", "fraiche", "fraîche", "léger", "légère",
  "intense", "intensif", "intensive", "extra", "ultra", "super", "hyper",
  // Formats commerciaux
  "pack", "lot", "format", "edition", "édition", "spécial", "special",
  // Couleurs (rarement discriminantes)
  "rouge", "vert", "verte", "bleu", "bleue", "blanc", "blanche", "noir", "noire",
]);

// ─── Scoring badges (adapted for OFF/OBF labels_tags) ───────────────────────

const PHARMACY_BRANDS = [
  "avène", "avene", "la roche-posay", "roche posay",
  "mustela", "bioderma", "uriage", "a-derma", "aderma", "klorane",
  "weleda", "cattier", "cetaphil", "cerave", "eucerin", "ducray", "nuxe",
];

const FRENCH_BRANDS = [
  "caudalie", "embryolisse", "lierac", "sanoflore",
  "melvita", "galenic", "phyto", "rené furterer",
];

function detectBio(
  name: string,
  ingredientsLower: string,
  labelsTags: string[],
): boolean {
  const nameLower = (name ?? "").toLowerCase();
  if (labelsTags.some((t) => t === "en:organic" || t === "fr:bio")) return true;
  return /\bbio\b/.test(nameLower)
    || nameLower.includes("biologique")
    || /\bbio\b/.test(ingredientsLower);
}

function scoreAndBadge(
  name: string,
  brand: string,
  ingredientsRaw: string,
  labelsTags: string[],
): { score: number; originBadge: OriginBadge } {
  const brandLower = (brand ?? "").toLowerCase();
  const ingLower = (ingredientsRaw ?? "").toLowerCase();
  let score = 0;
  let originBadge: OriginBadge = null;

  if (PHARMACY_BRANDS.some((b) => brandLower.includes(b))) {
    score += 15;
    originBadge = "pharmacy";
  } else if (FRENCH_BRANDS.some((b) => brandLower.includes(b))) {
    score += 8;
    originBadge = "french";
  }

  if (detectBio(name, ingLower, labelsTags)) {
    score += 5;
    if (!originBadge) originBadge = "bio";
  }

  return { score, originBadge };
}

// ─── Live Filet : Open Food Facts / Open Beauty Facts ───────────────────────

/**
 * Forme normalisée d'un produit OFF/OBF utilisable indifféremment pour le
 * Sniper Claude (champs `barcode`, `name`, `ingredients_raw`) ET pour
 * l'hydratation in-memory (champs `brand`, `image_url`, `labels_tags`).
 *
 * Toutes les valeurs sont garanties non-vides ou normalisées (cf.
 * `normalizeOffProduct`) — pas besoin de re-vérifier dans le pipeline.
 */
interface LiveCandidate {
  barcode: string;
  name: string;
  brand: string;
  ingredients_raw: string;
  image_url: string | null;
  labels_tags: string[];
  category: string;
}

interface RawOffProduct {
  code?: unknown;
  product_name?: unknown;
  product_name_fr?: unknown;
  brands?: unknown; // ES service: array of strings | cgi: comma-separated string
  ingredients_text?: unknown;
  ingredients_text_fr?: unknown;
  ingredients_tags?: unknown; // ES: array de tags i18n "en:sugar","fr:lait", etc.
  ingredients_n?: unknown; // ES: nombre d'ingrédients indexés
  image_url?: unknown;
  image_small_url?: unknown;
  image_front_url?: unknown;
  labels_tags?: unknown;
  categories?: unknown;
}

/**
 * Convertit un tag OFF i18n ("en:palm-oil", "fr:huile-de-palme") en mot
 * lisible FR pour le Sniper. On utilise le segment après ":" et on
 * remplace les "-" par des espaces. Ce n'est pas une trad parfaite mais
 * c'est suffisant — Claude Haiku reconnaît "palm oil" aussi bien que
 * "huile de palme" pour son analyse safety.
 */
function tagsToIngredientsText(tags: string[]): string {
  return tags
    .map((t) => {
      const colon = t.indexOf(":");
      const segment = colon >= 0 ? t.slice(colon + 1) : t;
      return segment.replace(/-/g, " ").trim();
    })
    .filter((s) => s.length > 0)
    .join(", ");
}

const OFF_TIMEOUT_MS = 3000;

/**
 * Choisit l'endpoint OFF (alimentaire) ou OBF (cosmétique) selon la
 * catégorie du produit d'origine.
 *
 * Pour l'alimentaire on utilise le service Elasticsearch dédié
 * (`search.openfoodfacts.org`) au lieu de l'antique `cgi/search.pl` :
 * l'ancien endpoint est en 503 ~80% du temps en prod (rate-limited /
 * sous-dimensionné), l'ES est rock-solid (10/10 succès mesurés).
 *
 * Pour les cosmétiques, OpenBeautyFacts n'a pas (encore) son équivalent
 * ES, on reste sur `cgi/search.pl` qui marche mieux car le trafic OBF
 * est bien moindre que OFF.
 */
function getLiveFiletEndpoint(isCosmetic: boolean): string {
  return isCosmetic
    ? "https://world.openbeautyfacts.org/cgi/search.pl"
    : "https://search.openfoodfacts.org/search";
}

/**
 * Le payload diffère entre le service ES (`brands: string[]`,
 * `labels_tags: string[] | null`) et l'API cgi (`brands: "X, Y, Z"`,
 * `labels_tags: string[]`). On normalise les deux vers la même forme.
 */
function normalizeOffProduct(raw: RawOffProduct): LiveCandidate | null {
  const barcode = typeof raw.code === "string" ? raw.code.trim() : "";
  if (!BARCODE_RE.test(barcode)) return null;

  // Prefer FR name when present, fallback to default English.
  const name =
    (typeof raw.product_name_fr === "string" && raw.product_name_fr.trim()) ||
    (typeof raw.product_name === "string" && raw.product_name.trim()) ||
    "";
  if (!name) return null;

  // Priorité : texte FR > texte EN > tags structurés ES (en:sugar, fr:lait…)
  // L'index ES OFF a souvent les tags même quand le texte brut est vide,
  // donc on les utilise comme fallback de premier choix.
  const tags = Array.isArray(raw.ingredients_tags)
    ? raw.ingredients_tags.filter((t): t is string => typeof t === "string")
    : [];
  const ingredientsRaw =
    (typeof raw.ingredients_text_fr === "string" &&
      raw.ingredients_text_fr.trim()) ||
    (typeof raw.ingredients_text === "string" && raw.ingredients_text.trim()) ||
    (tags.length >= 3 ? tagsToIngredientsText(tags) : "");
  // Filter out products with no parseable ingredient list — Claude can't
  // judge what he can't read, and the Belt would veto them anyway.
  if (ingredientsRaw.length < 20) return null;

  // ES: brands is an array. cgi: brands is a comma-separated string.
  let brand = "";
  if (Array.isArray(raw.brands)) {
    const first = raw.brands.find((b): b is string => typeof b === "string");
    brand = first?.trim() ?? "";
  } else if (typeof raw.brands === "string") {
    brand = raw.brands.split(",")[0]!.trim();
  }

  const image =
    (typeof raw.image_front_url === "string" && raw.image_front_url) ||
    (typeof raw.image_url === "string" && raw.image_url) ||
    (typeof raw.image_small_url === "string" && raw.image_small_url) ||
    null;

  const labelsTags = Array.isArray(raw.labels_tags)
    ? raw.labels_tags.filter((t): t is string => typeof t === "string")
    : [];

  const category =
    typeof raw.categories === "string"
      ? raw.categories.split(",")[0]!.trim()
      : "";

  return {
    barcode,
    name,
    brand,
    ingredients_raw: ingredientsRaw,
    image_url: image,
    labels_tags: labelsTags,
    category,
  };
}

/**
 * Dédoublonne les candidats OFF par clé `(brand|nom-normalisé)`.
 * OFF retourne souvent 5 variantes du même Coca (250 mL / 33 cL / pack 6 /
 * vintage / saveur cerise) avec des barcodes différents. Pour le Sniper, on
 * n'a besoin que d'UN représentant par triplet marque+produit.
 */
function deduplicateCandidates(candidates: LiveCandidate[]): LiveCandidate[] {
  const seen = new Set<string>();
  const out: LiveCandidate[] = [];
  for (const c of candidates) {
    const key = `${c.brand.toLowerCase()}|${c.name
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/\d+\s*(ml|cl|l|g|kg)\b/g, "")
      .trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

const USER_AGENT = "Helo-App/1.0 (pregnancy product scanner)";

/**
 * Fetch d'un seul produit complet via `/api/v2/product/{barcode}` (endpoint
 * individuel d'OFF — stable même sous charge, ~100-300ms, ~95% uptime).
 *
 * Renvoie `null` si timeout/5xx/parse/produit incomplet — l'appelant
 * filtrera silencieusement.
 */
async function fetchOffProduct(
  barcode: string,
  isCosmetic: boolean,
): Promise<LiveCandidate | null> {
  const host = isCosmetic
    ? "world.openbeautyfacts.org"
    : "world.openfoodfacts.org";
  const fields =
    "code,product_name,product_name_fr,brands,ingredients_text,ingredients_text_fr,image_url,image_front_url,labels_tags,categories";
  const url = `https://${host}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), OFF_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: ac.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      status?: number;
      product?: RawOffProduct;
    };
    if (json.status !== 1 || !json.product) return null;
    // /product wraps the barcode at top-level too — inject it in case the
    // nested `product.code` is missing (rare but observed on legacy entries).
    const raw: RawOffProduct = { code: barcode, ...json.product };
    return normalizeOffProduct(raw);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Recherche directe de candidats complets via le service ES dédié.
 *
 * Le service ES (`search.openfoodfacts.org`) renvoie déjà tous les champs
 * dont on a besoin — y compris `ingredients_tags` (array i18n structuré
 * "en:sugar","fr:lait") qui sert de fallback quand `ingredients_text_fr`
 * est vide. C'est plus fiable que de faire un second appel `/product`
 * (qui timeout/rate-limit sous burst de 30 parallèles).
 *
 * Pour OBF (cosmétique) on reste sur `cgi/search.pl` qui renvoie
 * directement `ingredients_text` (l'API ES n'existe pas encore pour OBF).
 */
async function searchOffCandidates(
  keyword: string,
  isCosmetic: boolean,
): Promise<{ candidates: LiveCandidate[]; error: string | null }> {
  const endpoint = getLiveFiletEndpoint(isCosmetic);
  let url: string;
  if (isCosmetic) {
    const params = new URLSearchParams({
      search_terms: keyword,
      sort_by: "unique_scans_n",
      page_size: "30",
      json: "true",
    });
    url = `${endpoint}?${params.toString()}`;
  } else {
    const params = new URLSearchParams({
      q: keyword,
      countries_tags: "en:france",
      page_size: "30",
    });
    url = `${endpoint}?${params.toString()}`;
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), OFF_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: ac.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    if (!resp.ok) return { candidates: [], error: `http_${resp.status}` };
    const json = (await resp.json()) as {
      products?: RawOffProduct[];
      hits?: RawOffProduct[];
    };
    const raws = Array.isArray(json.hits)
      ? json.hits
      : Array.isArray(json.products)
        ? json.products
        : [];
    const candidates: LiveCandidate[] = [];
    for (const r of raws) {
      const norm = normalizeOffProduct(r);
      if (norm) candidates.push(norm);
    }
    return { candidates, error: null };
  } catch (err) {
    return {
      candidates: [],
      error:
        err instanceof Error && err.name === "AbortError"
          ? "timeout"
          : "network",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch live candidates from OFF (food) or OBF (beauty) en 1 seul appel ES.
 *
 * Stratégie : itère sur les keywords jusqu'à obtenir ≥10 candidats. ES
 * retourne `ingredients_tags` directement utilisable, plus besoin de
 * fetch individuel `/product` (qui timeout sous burst).
 *
 * Garanties pour l'appelant :
 *   - timeout strict OFF_TIMEOUT_MS par appel HTTP (pas cumulé)
 *   - retourne au max 20 candidats, dédoublonnés, normalisés, avec ingrédients
 *   - retour [] si toutes les tentatives échouent
 */
async function fetchLiveCandidates(
  keywords: string[],
  isCosmetic: boolean,
  excludeBarcode: string,
  log: import("pino").Logger,
): Promise<LiveCandidate[]> {
  if (keywords.length === 0) return [];

  const t0 = Date.now();
  let lastError: string | null = null;
  let totalRaw = 0;
  const seen = new Set<string>([excludeBarcode]);
  const collected: LiveCandidate[] = [];

  for (const kw of keywords.slice(0, 3)) {
    if (collected.length >= 10) break;
    const { candidates, error } = await searchOffCandidates(kw, isCosmetic);
    if (error) lastError = error;
    totalRaw += candidates.length;
    for (const c of candidates) {
      if (seen.has(c.barcode)) continue;
      seen.add(c.barcode);
      collected.push(c);
      if (collected.length >= 30) break;
    }
  }

  const deduped = deduplicateCandidates(collected).slice(0, 20);

  emitMetric(log, "live_filet_fetch", {
    ms: Date.now() - t0,
    source: isCosmetic ? "openbeautyfacts" : "openfoodfacts",
    n_raw: totalRaw,
    n_filtered: collected.length,
    n_final: deduped.length,
    error: lastError,
  });

  return deduped;
}

// ─── DTO cache (encoded as JSON in analysis_cache) ──────────────────────────
//
// Pivot Live Filet : on cache désormais le DTO complet (et plus juste les
// barcodes). Raison : les candidats viennent d'OFF en temps réel, on ne peut
// pas les ré-hydrater depuis Supabase. Si on ne cachait que les barcodes, un
// cache hit forcerait un re-fetch OFF + re-hydratation par barcode (latence
// 2-3s) — défaite du caching.
//
// Backward compat : si la cache contient l'ancien format `alternatives:
// string[]`, on le traite comme un miss (sera réécrit au format DTO au
// prochain passage).

interface CachedPhasePayload {
  search_keyword?: string | null;
  alternatives?: string[]; // legacy format, ignored on read
  alternatives_dtos?: AlternativeProductDto[]; // new format
  alternatives_computed_at?: string;
}

// ─── Route ──────────────────────────────────────────────────────────────────

router.get(
  "/alternatives/:barcode",
  alternativesRateLimit,
  requireAppSecret,
  async (req, res) => {
    // ── 0. BOUCLIER FINOPS (Étape 3 — M1) ──────────────────────────────────
    // Les alternatives sont une feature Premium. On gate la route AVANT
    // toute lecture DB et SURTOUT avant tout appel Claude/OFF/OBF pour ne
    // payer aucun token / aucun fetch externe sur un utilisateur free.
    //
    // En l'absence d'auth user back-end, on s'appuie sur un header signal
    // émis par l'app mobile (`x-helo-is-premium: true|false`). Ce header
    // n'est PAS un secret — le bouclier réel reste l'IAP RevenueCat côté
    // device + la signature App Store/Play. Le header sert à éviter le
    // coût API ; un utilisateur qui le forgerait ne casserait que sa
    // propre rate-limit de 10 req/min/IP et ne paierait rien à Anthropic
    // au-delà. Lorsqu'on aura un vrai serveur d'auth, on remplacera ce
    // header par un check JWT → `is_premium` en DB.
    const premiumHeader = String(
      req.header("x-helo-is-premium") ?? "",
    ).toLowerCase();
    const isPremiumRequest = premiumHeader === "true" || premiumHeader === "1";
    if (!isPremiumRequest) {
      emitMetric(req.log, "alternatives_premium_blocked", {
        barcode: String(req.params.barcode ?? ""),
      });
      res.status(403).json({
        error: "premium_required",
        feature: "alternatives",
        message:
          "Les alternatives expertes sont réservées aux abonnées Hēlo Premium.",
      });
      return;
    }

    const barcode = String(req.params.barcode ?? "");
    if (!BARCODE_RE.test(barcode)) {
      res.status(400).json({ error: "invalid_barcode" });
      return;
    }

    const queryParsed = QuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
      res.status(400).json({ error: "invalid_trimester" });
      return;
    }
    const phase = parsePhase(queryParsed.data.trimester);
    const cacheKey = trimesterCacheKey(phase);

    if (!isSupabaseConfigured) {
      req.log.error("Supabase not configured");
      res.status(500).json({ error: "server_misconfigured" });
      return;
    }

    try {
      // ── 1. Lookup origin product (still from our local DB) ──────────────
      const { data: origin, error: originErr } = await supabaseAdmin
        .from("products")
        .select(
          "id, barcode, name, brand, category, ingredients_raw, image_url, analysis_cache",
        )
        .eq("barcode", barcode)
        .maybeSingle();

      if (originErr) {
        req.log.error({ err: originErr }, "origin lookup failed");
        res.status(500).json({ error: "db_error" });
        return;
      }
      if (!origin) {
        res.status(404).json({ error: "origin_not_found" });
        return;
      }

      const cache = (origin.analysis_cache ?? {}) as Record<
        string,
        CachedPhasePayload
      >;
      const phaseCache = cache[cacheKey];

      // ── 2. CACHE HIT on full DTOs → return immediately ──────────────────
      if (
        phaseCache?.alternatives_dtos &&
        Array.isArray(phaseCache.alternatives_dtos)
      ) {
        emitMetric(req.log, "alternatives_cache", {
          hit: true,
          barcode,
          cacheKey,
          n: phaseCache.alternatives_dtos.length,
        });
        res.json(phaseCache.alternatives_dtos);
        return;
      }
      emitMetric(req.log, "alternatives_cache", {
        hit: false,
        barcode,
        cacheKey,
      });

      // ── 3. Resolve search keywords ──────────────────────────────────────
      const searchKeyword = phaseCache?.search_keyword ?? null;
      const fallbackKeywords = extractKeywords(origin.name ?? "", origin.brand);
      const keywordList = searchKeyword
        ? [searchKeyword.toLowerCase(), ...fallbackKeywords]
        : fallbackKeywords;
      const uniqueKw = Array.from(new Set(keywordList));

      // ── 4. LIVE FILET (OFF / OBF) ──────────────────────────────────────
      // M1 : routage cosmétique. La détection s'appuie sur origin.category
      // côté Supabase (alimenté par notre pipeline de scan). Le flag
      // bascule (1) le host OFF/OBF dans le fetcher live, (2) le system
      // prompt du Sniper Claude vers la grille cosmétique (perturbateurs
      // endocriniens, allergènes de contact, sulfates), (3) le domain
      // passé à la Ceinture déterministe pour qu'elle ne lise QUE le
      // dictionnaire Cosing (food → EFSA only, cf. Mission 2).
      const isCosmetic =
        (origin.category ?? "").toLowerCase() === "cosmetic";
      const beltDomain: IngredientDomain = isCosmetic ? "cosmetic" : "food";
      const liveCandidates = await fetchLiveCandidates(
        uniqueKw,
        isCosmetic,
        barcode,
        req.log,
      );

      req.log.info(
        {
          barcode,
          cacheKey,
          n: liveCandidates.length,
          kw: uniqueKw.slice(0, 3),
          source: isCosmetic ? "openbeautyfacts" : "openfoodfacts",
        },
        "live filet caught candidates",
      );

      if (liveCandidates.length === 0) {
        await writeAlternativesCache(req, barcode, cache, cacheKey, []);
        res.json([]);
        return;
      }

      // ── 5. SNIPER (Claude Haiku) ───────────────────────────────────────
      const sniperInput: AlternativeCandidate[] = liveCandidates.map((c) => ({
        barcode: c.barcode,
        name: c.brand ? `${c.brand} — ${c.name}` : c.name,
        ingredients_raw: c.ingredients_raw,
      }));

      const sniperResult = await selectSafeAlternativesWithClaude({
        candidates: sniperInput,
        trimester: phase,
        originalName: origin.name ?? "",
        searchKeyword: searchKeyword ?? fallbackKeywords[0] ?? "",
        isCosmetic, // M1
        log: req.log,
      });
      const validatedBarcodes = sniperResult.barcodes;
      // M3 : reason indexée par barcode pour propagation au DTO.
      const reasonByBarcode = new Map(
        sniperResult.picks.map((p) => [p.barcode, p.reason]),
      );

      if (sniperResult.outcome === "model_empty") {
        emitMetric(req.log, "safety_trap_triggered", {
          reason: "sniper_empty",
          barcode,
          cacheKey,
          candidates: sniperInput.length,
        });
        alertSafetyTrap({ reason: "sniper_empty", barcode, cacheKey });
      }

      if (validatedBarcodes.length === 0) {
        await writeAlternativesCache(req, barcode, cache, cacheKey, []);
        res.json([]);
        return;
      }

      // ── 6. CEINTURE & BRETELLES (in-memory, no DB hit) ─────────────────
      // M2 : Belt RÉACTIVÉ avec isolation domaine. matchDeterministic ne
      // charge plus la base ingrédients entière — il filtre par `source`
      // pour ne garder QUE le dictionnaire pertinent (food → EFSA only,
      // cosmetic → Cosing/SCCS/ECHA only). Plus de faux positifs cross-
      // domain genre "fat" → "sulfate de magnésium lauryléther".
      //
      // Politique : un candidat est rejeté s'il contient au moins un
      // ingrédient noté `danger` pour la phase courante dans le dico
      // isolé. `caution` n'est PAS bloquant (le Sniper Claude a déjà
      // jugé l'ensemble safe ; la Ceinture est un filet "ceinture"
      // contre l'hallucination, pas un second avis subjectif).
      const byBarcode = new Map(liveCandidates.map((c) => [c.barcode, c]));
      const safeCandidates: LiveCandidate[] = [];
      const beltRejections: Array<{ barcode: string; ingredient: string }> = [];
      for (const b of validatedBarcodes) {
        const cand = byBarcode.get(b);
        if (!cand) continue; // Claude hallucinated a barcode not in the input
        const parsed = parseIngredients(cand.ingredients_raw);
        const belt = await matchDeterministic(parsed, phase, beltDomain);
        if (belt.dangerousMatch) {
          beltRejections.push({
            barcode: b,
            ingredient: belt.dangerousMatch.matchedIngredientName ?? "?",
          });
          continue;
        }
        safeCandidates.push(cand);
      }
      if (beltRejections.length > 0) {
        req.log.warn(
          { barcode, beltDomain, beltRejections },
          "belt caught Sniper hallucinations",
        );
        emitMetric(req.log, "alternatives_belt_rejection", {
          barcode,
          beltDomain,
          n_rejected: beltRejections.length,
        });
      }

      // ── 7. Build DTOs in-memory (no Supabase hydration) ────────────────
      const dtos: AlternativeProductDto[] = safeCandidates.map((c) => {
        const { score, originBadge } = scoreAndBadge(
          c.name,
          c.brand,
          c.ingredients_raw,
          c.labels_tags,
        );
        const reason = reasonByBarcode.get(c.barcode) ?? "";
        return {
          id: c.barcode, // OFF barcodes are globally unique → use as id
          name: c.name,
          brand: c.brand,
          category: c.category,
          barcode: c.barcode,
          image_url: c.image_url,
          description_fr: null,
          reason: reason.length > 0 ? reason : null, // M3
          overall_risk: "safe",
          price_range: "",
          popularity_count: score,
          origin_badge: originBadge,
        };
      });

      dtos.sort((a, b) => b.popularity_count - a.popularity_count);

      // ── 8. Persist full DTOs in cache ──────────────────────────────────
      await writeAlternativesCache(req, barcode, cache, cacheKey, dtos);

      res.json(dtos);
    } catch (err) {
      req.log.error({ err }, "alternatives handler failed");
      res.status(500).json({ error: "internal_error" });
    }
  },
);

// ─── Cache write helper (best-effort) ───────────────────────────────────────

async function writeAlternativesCache(
  req: import("express").Request,
  barcode: string,
  existingCache: Record<string, unknown>,
  cacheKey: string,
  dtos: AlternativeProductDto[],
): Promise<void> {
  const existingPhase =
    (existingCache[cacheKey] as Record<string, unknown> | undefined) ?? {};
  const newCache = {
    ...existingCache,
    [cacheKey]: {
      ...existingPhase,
      alternatives_dtos: dtos,
      alternatives_computed_at: new Date().toISOString(),
    },
  };
  const { error } = await supabaseAdmin
    .from("products")
    .update({ analysis_cache: newCache })
    .eq("barcode", barcode);
  if (error) {
    req.log.warn(
      { err: error, barcode, cacheKey, n: dtos.length },
      "alternatives cache write failed — next call will re-trigger live filet",
    );
  }
}

export default router;
