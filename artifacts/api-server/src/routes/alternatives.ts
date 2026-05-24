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
import {
  attachPremiumStatus,
  requirePremium,
} from "../middlewares/requirePremium";

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

const MATCHER_VERSION = "v14";
// v13 — Version du cache écrit par routes/scan.ts. DOIT rester synchronisée
// avec MATCHER_VERSION dans scan.ts (actuellement "v4"). Sert UNIQUEMENT
// à relire le glow_score d'origine pour le gate adaptatif — clé partagée
// dans la même colonne JSONB analysis_cache.
const SCAN_MATCHER_VERSION = "v4";

function trimesterCacheKey(t: Phase): string {
  const base = typeof t === "number" ? `t${t}` : t;
  return `${base}_${MATCHER_VERSION}`;
}

function scanCacheKey(t: Phase): string {
  const base = typeof t === "number" ? `t${t}` : t;
  return `${base}_${SCAN_MATCHER_VERSION}`;
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
  /**
   * v13 — GlowScore 0..100 calculé par la Ceinture sur la liste d'ingrédients
   * du candidat. Garanti ≥80 (plancher absolu, cf. belt loop). Exposé pour
   * que le mobile affiche le score dans la carte alternative.
   */
  glow_score: number;
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
  /**
   * Bug "Moutarde → Mayonnaise" : on récupère les categories_tags i18n d'OFF
   * (ex: ["en:condiments", "en:mustards"]) pour pouvoir scoper la recherche
   * d'alternatives à la MÊME catégorie stricte que l'origine.
   */
  categories_tags: string[];
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
  categories_tags?: unknown; // ES + cgi: array i18n ["en:mustards","en:condiments"]
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
      // Ignore les tags mal formés (sans préfixe i18n "xx:") : sans le
      // ":", on ne sait pas où finit le préfixe de langue et on polluait
      // ingredients_raw avec "en natural flavouring" (bug v3).
      if (colon < 0) return "";
      return t.slice(colon + 1).replace(/-/g, " ").trim();
    })
    .filter((s) => s.length > 0)
    .join(", ");
}

// Bumped from 3000→8000 : cgi/search.pl répond en ~3-4s typiquement (mesuré
// 3.4s sur amora+mustards). À 3s on timeoutait systématiquement le happy path
// cgi, forçant 3 retries × 3s = 15s puis empty. À 8s on laisse le 1er essai
// réussir, et les retries n'interviennent que sur vraies 5xx/network.
// ES (search.openfoodfacts.org) reste rapide (~1s) donc pas pénalisé.
const OFF_TIMEOUT_MS = 8000;

// v4 — Budget global pour l'ENSEMBLE du handler /alternatives (toutes les
// fetches OFF cumulées). Le mobile timeout HTTP est ~15s, on plafonne à 12s
// pour garder une marge de réponse réseau Replit→mobile. Sans ce budget,
// le pire cas était 3 keywords × 3 retries × 8s = 72s de fetches OFF avant
// de renvoyer [], pendant que le worker Replit Autoscale reste bloqué.
const OVERALL_BUDGET_MS = 12_000;

/** Combine un signal parent optionnel avec un signal local (timeout fetch). */
function combineSignals(parent: AbortSignal | undefined, local: AbortSignal): AbortSignal {
  return parent ? AbortSignal.any([parent, local]) : local;
}

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

  const categoriesTags = Array.isArray(raw.categories_tags)
    ? raw.categories_tags.filter((t): t is string => typeof t === "string")
    : [];

  return {
    barcode,
    name,
    brand,
    ingredients_raw: ingredientsRaw,
    image_url: image,
    labels_tags: labelsTags,
    category,
    categories_tags: categoriesTags,
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
  parentSignal?: AbortSignal,
): Promise<LiveCandidate | null> {
  const host = isCosmetic
    ? "world.openbeautyfacts.org"
    : "world.openfoodfacts.org";
  const fields =
    "code,product_name,product_name_fr,brands,ingredients_text,ingredients_text_fr,image_url,image_front_url,labels_tags,categories,categories_tags";
  const url = `https://${host}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), OFF_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: combineSignals(parentSignal, ac.signal),
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
  categoryTag?: string | null,
  parentSignal?: AbortSignal,
): Promise<{ candidates: LiveCandidate[]; error: string | null }> {
  // ★ Choix d'endpoint context-aware :
  //  - ES (`search.openfoodfacts.org`) est rock-solid mais N'HONORE PAS le
  //    paramètre `categories_tags` (testé : retourne Mayo+Ketchup pour
  //    mustard) ET omet `categories_tags` de la réponse → on ne peut ni
  //    filtrer côté serveur, ni filtrer côté client. Inutilisable dès que
  //    `categoryTag` est fourni.
  //  - Legacy cgi (`world.openfoodfacts.org/cgi/search.pl`) supporte les
  //    facets `tagtype_0=categories&tag_0=mustards` côté serveur ET renvoie
  //    `categories_tags` dans la réponse. Plus lent / parfois 503 mais le
  //    seul qui filtre vraiment par catégorie.
  // → cgi quand on a un categoryTag (food ou cosmétique), ES sinon (food
  //   keyword pur, où la rapidité prime).
  let url: string;
  if (isCosmetic || categoryTag) {
    const host = isCosmetic
      ? "https://world.openbeautyfacts.org"
      : "https://world.openfoodfacts.org";
    const params = new URLSearchParams({
      search_terms: keyword,
      sort_by: "unique_scans_n",
      page_size: "30",
      json: "true",
      action: "process",
    });
    if (categoryTag) {
      params.set("tagtype_0", "categories");
      params.set("tag_contains_0", "contains");
      // cgi veut le segment sans prefix i18n : "en:mustards" → "mustards"
      const tail = categoryTag.includes(":")
        ? categoryTag.split(":").slice(1).join(":")
        : categoryTag;
      params.set("tag_0", tail);
    }
    url = `${host}/cgi/search.pl?${params.toString()}`;
  } else {
    // Pas de categoryTag → fallback ES rapide pour recherche keyword pure
    // (déjà filtré côté caller par strategy="keywords" où le drift est
    // policé par les keywords spécifiques).
    const endpoint = getLiveFiletEndpoint(isCosmetic);
    const params = new URLSearchParams({
      q: keyword || "*",
      countries_tags: "en:france",
      page_size: "30",
    });
    url = `${endpoint}?${params.toString()}`;
  }

  // Retry on 503 / network — OFF cgi est intermittent (rate-limit, déploiements).
  // 3 tentatives avec backoff 0/250/750ms : couvre les blips courts sans
  // pénaliser le happy path (1ère tentative succès = pas de delay).
  const MAX_ATTEMPTS = 3;
  const BACKOFFS_MS = [0, 250, 750];
  let lastError: string | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (BACKOFFS_MS[attempt]! > 0) {
      await new Promise((r) => setTimeout(r, BACKOFFS_MS[attempt]!));
    }
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), OFF_TIMEOUT_MS);
    try {
      const resp = await fetch(url, {
        signal: combineSignals(parentSignal, ac.signal),
        headers: { "User-Agent": USER_AGENT },
      });
      if (!resp.ok) {
        lastError = `http_${resp.status}`;
        // Retry uniquement sur 5xx + 429 (transient). 4xx autres = définitif.
        if (resp.status < 500 && resp.status !== 429) {
          return { candidates: [], error: lastError };
        }
        continue;
      }
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
      lastError =
        err instanceof Error && err.name === "AbortError"
          ? "timeout"
          : "network";
    } finally {
      clearTimeout(timer);
    }
  }
  return { candidates: [], error: lastError };
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
type LiveStrategy = "category_primary" | "category_then_kw" | "keywords";

async function fetchLiveCandidates(
  keywords: string[],
  isCosmetic: boolean,
  excludeBarcode: string,
  log: import("pino").Logger,
  categoryTag?: string | null,
  // Bug "Amora → 3× variantes Amora" : marque d'origine exclue des candidats.
  // Une "alternative" = AUTRE marque (Maille, Bornier), pas autre format.
  excludeBrand?: string | null,
  parentSignal?: AbortSignal,
): Promise<{ candidates: LiveCandidate[]; strategy: LiveStrategy }> {
  if (keywords.length === 0 && !categoryTag)
    return { candidates: [], strategy: "keywords" };

  const t0 = Date.now();
  let lastError: string | null = null;
  let totalRaw = 0;
  const seen = new Set<string>([excludeBarcode]);
  const collected: LiveCandidate[] = [];
  let usedStrategy: LiveStrategy = "keywords";
  const excludeBrandNorm = (excludeBrand ?? "").trim().toLowerCase();

  // PHASE 1 : recherche scopée catégorie, keyword="" volontairement — sinon
  // cgi trie par pertinence textuelle et ramène 20 variantes de la même
  // marque (ex. "amora" → 20× Amora). Sans keyword, sort_by=unique_scans_n
  // remonte les produits populaires de la catégorie → mix de marques.
  if (categoryTag) {
    usedStrategy = "category_primary";
    const { candidates, error } = await searchOffCandidates(
      "",
      isCosmetic,
      categoryTag,
      parentSignal,
    );
    if (error) lastError = error;
    totalRaw += candidates.length;
    for (const c of candidates) {
      if (seen.has(c.barcode)) continue;
      if (excludeBrandNorm && c.brand.trim().toLowerCase() === excludeBrandNorm)
        continue;
      seen.add(c.barcode);
      collected.push(c);
      if (collected.length >= 30) break;
    }
  }

  // PHASE 2 : fallback keywords textuels si phase 1 trop peu.
  if (collected.length < 5) {
    if (categoryTag && collected.length > 0) usedStrategy = "category_then_kw";
    for (const kw of keywords.slice(0, 3)) {
      if (collected.length >= 10) break;
      if (excludeBrandNorm && kw.trim().toLowerCase() === excludeBrandNorm)
        continue;
      const { candidates, error } = await searchOffCandidates(
        kw,
        isCosmetic,
        categoryTag ?? null,
        parentSignal,
      );
      if (error) lastError = error;
      totalRaw += candidates.length;
      for (const c of candidates) {
        if (seen.has(c.barcode)) continue;
        if (excludeBrandNorm && c.brand.trim().toLowerCase() === excludeBrandNorm)
          continue;
        seen.add(c.barcode);
        collected.push(c);
        if (collected.length >= 30) break;
      }
    }
  }

  // Diversité marques : max 2 candidats par marque pour éviter qu'une marque
  // dominante (Maille avec 5 formats) sature le top et prive Claude d'options.
  const perBrandCount = new Map<string, number>();
  const brandDiverse: LiveCandidate[] = [];
  for (const c of collected) {
    const key = c.brand.trim().toLowerCase() || "__nobrand__";
    const n = perBrandCount.get(key) ?? 0;
    if (n >= 2) continue;
    perBrandCount.set(key, n + 1);
    brandDiverse.push(c);
  }

  const deduped = deduplicateCandidates(brandDiverse).slice(0, 20);

  emitMetric(log, "live_filet_fetch", {
    ms: Date.now() - t0,
    source: isCosmetic ? "openbeautyfacts" : "openfoodfacts",
    n_raw: totalRaw,
    n_filtered: collected.length,
    n_final: deduped.length,
    strategy: usedStrategy,
    category_tag: categoryTag ?? null,
    error: lastError,
  });

  return { candidates: deduped, strategy: usedStrategy };
}

/**
 * Sélectionne le tag de catégorie le plus spécifique parmi un array OFF
 * (ex: ["en:condiments", "en:mustards", "en:dijon-mustards"] → "en:dijon-mustards").
 *
 * OFF range ses categories_tags du plus général au plus spécifique : on
 * prend donc le DERNIER. Garde-fou : on ignore les tags trop génériques
 * (≤ une catégorie racine type "en:groceries" ou "en:plant-based-foods")
 * qui ramèneraient n'importe quoi.
 */
const TOO_GENERIC_TAGS = new Set([
  "en:groceries", "en:plant-based-foods-and-beverages", "en:plant-based-foods",
  "en:beverages", "en:meats", "en:meals", "en:snacks", "en:foods",
  "en:dairies", "en:fats", "en:cereals-and-potatoes",
  "en:cosmetics", "en:body", "en:hair", "en:face", "en:skin",
  // v4 — racines OFF couramment retournées qui amenaient à des candidats
  // hors-périmètre (ex. "sauces" → ketchup proposé en alt à une moutarde).
  "en:condiments", "en:sauces", "en:processed-foods",
  "en:cleansers", "en:moisturizers",
]);

/**
 * Fetch léger des categories_tags du produit d'origine via OFF/OBF.
 *
 * Ne ré-utilise pas `fetchOffProduct()` : celui-ci normalise vers un
 * `LiveCandidate` complet (et drop le produit si `ingredients_raw < 20`),
 * ce qui est totalement non pertinent pour l'origine. Ici on a juste
 * besoin des categories_tags pour scoper la recherche d'alternatives —
 * un produit d'origine sans liste d'ingrédients publique reste tout à
 * fait éligible (et c'est même un cas fréquent côté OBF/OFF où l'utilisateur
 * remonte juste une photo).
 */
async function fetchOriginCategoriesTags(
  barcode: string,
  isCosmetic: boolean,
  parentSignal?: AbortSignal,
): Promise<string[]> {
  const host = isCosmetic
    ? "world.openbeautyfacts.org"
    : "world.openfoodfacts.org";
  const url = `https://${host}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=categories_tags`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), OFF_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: combineSignals(parentSignal, ac.signal),
      headers: { "User-Agent": USER_AGENT },
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      status?: number;
      product?: { categories_tags?: unknown };
    };
    if (json.status !== 1 || !json.product) return [];
    const tags = json.product.categories_tags;
    return Array.isArray(tags)
      ? tags.filter((t): t is string => typeof t === "string")
      : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function pickMostSpecificCategoryTag(tags: string[]): string | null {
  if (!tags || tags.length === 0) return null;
  // On parcourt à l'envers (le plus spécifique vient en dernier dans OFF)
  for (let i = tags.length - 1; i >= 0; i--) {
    const t = tags[i]!;
    if (TOO_GENERIC_TAGS.has(t)) continue;
    // v4 — slug ≥ 6 chars (vs ≥ 4 en v3). Filtre les racines OFF courtes
    // qui passaient à travers TOO_GENERIC_TAGS (ex. "fats", "body", "hair",
    // "face", "skin") tout en gardant les catégories légitimes courantes
    // ("mustards", "yogurts", "pastas", "sauces", "shampoos" — tous ≥ 6).
    const seg = t.includes(":") ? t.split(":").slice(1).join(":") : t;
    if (seg.length >= 6) return t;
  }
  return null;
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
  // v4 — Bouclier Premium server-side. attachPremiumStatus valide via
  // RevenueCat (si configuré via REVENUECAT_SECRET_API_KEY) ou retombe
  // gracieusement sur le header legacy x-helo-is-premium. requirePremium
  // bloque la requête avec 403 si le tier n'est pas premium. Détails dans
  // src/middlewares/requirePremium.ts.
  attachPremiumStatus,
  requirePremium,
  async (req, res) => {
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

    // v4 — Budget global pour le handler. Si dépassé, toutes les fetches OFF
    // en cours sont abort() en cascade via AbortSignal.any(). Le worker
    // Replit est libéré et un timeout est renvoyé au client mobile (qui
    // affichera l'errorBanner retry).
    const overallAc = new AbortController();
    const overallTimer = setTimeout(
      () => overallAc.abort(),
      OVERALL_BUDGET_MS,
    );

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

      // Bug "Moutarde Amora → Mayonnaise Amora" : on récupère les
      // categories_tags du produit d'origine via OFF live pour scoper la
      // recherche d'alternatives à la même catégorie stricte. Coût : un
      // appel HTTP en plus (~200-400ms), gain : zéro cross-catégorie.
      // Échec silencieux → on retombe sur les keywords seuls (comportement
      // pré-correctif), donc pas de régression de robustesse.
      //
      // ⚠️ On n'utilise PAS `fetchOffProduct()` ici : celui-ci rejette les
      // produits avec ingredients < 20 chars (pertinent pour candidats,
      // pas pour l'origine où seuls les categories_tags nous intéressent).
      const originCategoriesTags = await fetchOriginCategoriesTags(
        barcode,
        isCosmetic,
        overallAc.signal,
      );
      const categoryTag = pickMostSpecificCategoryTag(originCategoriesTags);
      req.log.info(
        {
          barcode,
          category_tag: categoryTag,
          all_tags: originCategoriesTags.slice(-3),
        },
        "category resolution",
      );

      const { candidates: liveCandidates, strategy: liveStrategy } =
        await fetchLiveCandidates(
          uniqueKw,
          isCosmetic,
          barcode,
          req.log,
          categoryTag,
          origin.brand ?? null,
          overallAc.signal,
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
        // ★ NE PAS cacher cet empty : un live filet à 0 candidat est presque
        // toujours dû à un blip OFF (503 sur cgi/search.pl, timeout réseau)
        // qu'on veut re-tenter au prochain appel. Cacher ici empoisonne le
        // résultat pour 24h et masque les vraies alternatives. Si le produit
        // n'a réellement aucune alternative possible (catégorie de niche),
        // c'est le sniper qui le confirmera plus tard (cache L1010 ci-dessous).
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
      // v13 — Score map (même pattern que reasonByBarcode, pas de mutation).
      const scoreByBarcode = new Map<string, number>();
      // v13 — Score origine récupéré du cache SCAN (clé `tX_v3`), pas
      // de l'alternatives cache (`tX_v13`). Ces deux caches cohabitent dans
      // la même colonne JSONB `analysis_cache` mais sont versionnés
      // indépendamment. Sans cette double lecture, originGlowScore était
      // toujours null et le gate adaptatif inopérant.
      const scanPhaseCache = cache[scanCacheKey(phase)] as
        | { glow_score?: number }
        | undefined;
      const originGlowScore: number | null = scanPhaseCache?.glow_score ?? null;
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

        // ── v13 — Calcul du GlowScore du candidat ───────────────────────
        // Même formule que computeVerdict (matcher.ts) : 100 baseline,
        // -50 par danger (déjà filtré ci-dessus), -15 par caution,
        // -2 par unknown.
        const candidateDangerCount = belt.matches.filter((m) => m.riskLevel === "danger").length;
        const candidateCautionCount = belt.matches.filter((m) => m.riskLevel === "caution").length;
        const candidateUnknownCount = belt.matches.filter((m) => !m.matched).length;
        const candidateGlowScore = Math.max(
          0,
          Math.min(
            100,
            100 - candidateDangerCount * 50 - candidateCautionCount * 15 - candidateUnknownCount * 2,
          ),
        );

        // ── v13 — Plancher absolu à 80 ──────────────────────────────────
        // Jamais d'alternative "jaune" affichée — cohérence UX (une alt en
        // jaune induit "pourquoi tu me la proposes alors ?").
        if (candidateGlowScore < 80) {
          req.log.info(
            {
              action: "rejected_below_safe_floor",
              candidateBarcode: b,
              candidateScore: candidateGlowScore,
            },
            "alternative rejected: not safe enough to display",
          );
          continue;
        }

        // ── v13 — Gate adaptatif unifié ─────────────────────────────────
        // Quand on connaît le score origine, on exige une vraie amélioration
        // de +10 points minimum, MAIS toujours au-dessus du plancher 80
        // (Math.max). Sans le Math.max, origine<70 → seuil<80 → déjà filtré
        // par le floor au-dessus, donc gate sans effet (bug v13 initial).
        // Avec, le gate ajoute du travail réel sur les origines moyennes
        // (ex: origine=85 → exige candidate≥95, origine=60 → exige ≥80).
        if (originGlowScore !== null) {
          const requiredMinScore = Math.max(80, originGlowScore + 10);
          if (candidateGlowScore < requiredMinScore) {
            req.log.info(
              {
                action: "rejected_insufficient_improvement",
                candidateBarcode: b,
                candidateScore: candidateGlowScore,
                originScore: originGlowScore,
                threshold: requiredMinScore,
              },
              "alternative rejected: insufficient improvement vs origin",
            );
            continue;
          }
        }

        // Mémorise le score pour le mapping DTO (pas de mutation sur cand).
        scoreByBarcode.set(b, candidateGlowScore);

        // Garde-fou catégorie STRICT (v4) :
        // On NE FAIT PLUS confiance au filtrage server-side d'OFF, même en
        // strategy "category_primary". L'API cgi utilise tag_contains_0=
        // "contains" qui matche en substring : "mustards" matche aussi
        // "mustard-mayonnaises", "ravioli-with-mustard", etc. → bug v3
        // "Moutarde → Mayonnaise". On exige donc TOUJOURS la présence
        // exacte du categoryTag dans les categories_tags du candidat,
        // quelle que soit la strategy. Coût : zéro (30 candidats max,
        // filtre O(n) en mémoire). Gain : zéro cross-catégorie.
        if (categoryTag) {
          const tags = cand.categories_tags || [];
          if (!tags.includes(categoryTag)) {
            req.log.info(
              {
                barcode: b,
                expected: categoryTag,
                got: tags.slice(-3),
                strategy: liveStrategy,
              },
              "category drift rejected",
            );
            continue;
          }
        }
        // v13 — Filtre marques bidon AMÉLIORÉ : on relabelise "Marque
        // distributeur" plutôt que de rejeter quand OFF a recopié la
        // catégorie dans le champ brand (ex. brand="Moutarde"), ou quand
        // la brand est vide. Garde le candidat affichable au lieu de
        // perdre une alternative légitime à cause d'une junk row OFF.
        const brandNorm = cand.brand.trim().toLowerCase();
        const categoryNorm = cand.category.trim().toLowerCase();
        if (brandNorm.length < 2) {
          // Pas de marque exploitable → on garde uniquement si on a une photo
          // (identifiable visuellement en rayon), sinon trop ambigu.
          if (!cand.image_url) continue;
          cand.brand = "Marque distributeur";
        } else if (brandNorm === categoryNorm) {
          // brand = catégorie (junk OFF) → relabel propre
          cand.brand = "Marque distributeur";
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
        const { score: badgeScore, originBadge } = scoreAndBadge(
          c.name,
          c.brand,
          c.ingredients_raw,
          c.labels_tags,
        );
        const reason = reasonByBarcode.get(c.barcode) ?? "";
        // v13 — score du candidat calculé pendant la passe Ceinture
        // (Map pattern, pas de mutation). Default 100 = filet de sécurité
        // mais ne devrait jamais arriver (tous les push sont précédés d'un
        // scoreByBarcode.set).
        const candidateScore = scoreByBarcode.get(c.barcode) ?? 100;
        return {
          id: c.barcode, // OFF barcodes are globally unique → use as id
          name: c.name,
          brand: c.brand,
          category: c.category,
          barcode: c.barcode,
          image_url: c.image_url,
          description_fr: null,
          reason: reason.length > 0 ? reason : null, // M3
          // v13 — plancher 80 garantit cet invariant.
          overall_risk: "safe",
          price_range: "",
          // popularity_count = score sécurité + bonus badge (pharma/bio/fr)
          popularity_count: candidateScore + badgeScore,
          origin_badge: originBadge,
          glow_score: candidateScore,
        };
      });

      dtos.sort((a, b) => {
        // Tri principal par score ; à score égal, on remonte les produits
        // avec photo (identifiables visuellement en rayon).
        const scoreDiff = b.popularity_count - a.popularity_count;
        if (scoreDiff !== 0) return scoreDiff;
        const aHasImage = a.image_url ? 1 : 0;
        const bHasImage = b.image_url ? 1 : 0;
        return bHasImage - aHasImage;
      });

      // ── 8. Persist full DTOs in cache ──────────────────────────────────
      await writeAlternativesCache(req, barcode, cache, cacheKey, dtos);

      res.json(dtos);
    } catch (err) {
      // v4 — Distinguer un AbortError (timeout budget global dépassé) d'une
      // vraie erreur interne. Le mobile errorBanner gère mieux un 504 typé
      // qu'un 500 opaque.
      const isAbort =
        err instanceof Error &&
        (err.name === "AbortError" || overallAc.signal.aborted);
      if (isAbort) {
        req.log.warn({ barcode }, "alternatives budget exceeded — short-circuit");
        emitMetric(req.log, "alternatives_budget_exceeded", { barcode });
        res.status(504).json({ error: "upstream_timeout" });
      } else {
        req.log.error({ err }, "alternatives handler failed");
        res.status(500).json({ error: "internal_error" });
      }
    } finally {
      clearTimeout(overallTimer);
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
