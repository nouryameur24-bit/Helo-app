import { Router, type IRouter } from "express";
import { z } from "zod/v4";

import { supabaseAdmin, isSupabaseConfigured } from "../lib/supabaseAdmin";
import { fetchFromOpenFacts } from "../lib/openFoodFacts";
import { parseIngredients } from "../lib/parseIngredients";
import {
  matchDeterministic,
  computeVerdict,
  type Phase,
  type Verdict,
  type MatchResult,
  type RiskLevel,
  type IngredientDomain,
} from "../lib/matcher";
import { analyzeWithClaude, type AiVerdict } from "../lib/anthropic";
import { emitMetric } from "../lib/metrics";
import { requireAppSecret } from "../middlewares/appSecret";
import { scanRateLimit } from "../middlewares/scanRateLimit";

const router: IRouter = Router();

// ─── Request validation ─────────────────────────────────────────────────────

const BARCODE_RE = /^[0-9]{6,14}$/; // EAN-8 / EAN-13 / UPC-A / UPC-E / ITF-14

const ScanBodySchema = z.object({
  barcode: z.string().regex(BARCODE_RE, "invalid barcode format"),
  trimester: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal("breastfeeding"),
    z.literal("baby"),
  ]),
});

// ─── Response shape ─────────────────────────────────────────────────────────

interface ScanMatchDto {
  ingredient_name: string;
  matched: boolean;
  matched_ingredient_name: string | null;
  risk_level: RiskLevel;
}

interface ScanResponse {
  status: "autorise" | "a_eviter" | "interdit";
  verdict: Verdict;
  glow_score: number;
  explanation: string;
  source: "deterministic" | "ai";
  cached: boolean;
  search_keyword: string | null;
  product: {
    name: string;
    brand: string | null;
    image_url: string | null;
  };
  matches: ScanMatchDto[];
}

function toMatchDto(m: MatchResult): ScanMatchDto {
  return {
    ingredient_name: m.ingredientName,
    matched: m.matched,
    matched_ingredient_name: m.matchedIngredientName ?? null,
    risk_level: m.riskLevel,
  };
}

function verdictToStatus(v: Verdict): "autorise" | "a_eviter" | "interdit" {
  if (v === "safe") return "autorise";
  if (v === "caution") return "a_eviter";
  return "interdit";
}

function aiStatusToVerdict(s: AiVerdict["status"]): Verdict {
  if (s === "autorise") return "safe";
  if (s === "a_eviter") return "caution";
  return "danger";
}

const MATCHER_VERSION = "v3";

function trimesterCacheKey(t: Phase): string {
  const base = typeof t === "number" ? `t${t}` : t;
  return `${base}_${MATCHER_VERSION}`;
}

// ─── Route ──────────────────────────────────────────────────────────────────

router.post("/scan", scanRateLimit, requireAppSecret, async (req, res) => {
  const parsed = ScanBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", details: parsed.error.issues });
    return;
  }
  const { barcode, trimester } = parsed.data;
  const cacheKey = trimesterCacheKey(trimester);

  if (!isSupabaseConfigured) {
    req.log.error("Supabase not configured");
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }

  try {
    // ── 1. Lookup product in our curated Supabase table ───────────────────
    const { data: product, error: lookupError } = await supabaseAdmin
      .from("products")
      .select("barcode, name, brand, category, ingredients_raw, image_url, analysis_cache")
      .eq("barcode", barcode)
      .maybeSingle();

    if (lookupError) {
      req.log.error({ err: lookupError }, "products lookup failed");
      res.status(500).json({ error: "db_error" });
      return;
    }

    let productName = product?.name ?? null;
    let productBrand = product?.brand ?? null;
    let productImage = product?.image_url ?? null;
    let ingredientsRaw = product?.ingredients_raw ?? null;
    const cache = (product?.analysis_cache ?? {}) as Record<
      string,
      Omit<ScanResponse, "cached" | "product"> & {
        product?: ScanResponse["product"];
      }
    >;

    // ── 2. CACHE HIT ─────────────────────────────────────────────────────
    if (product && cache[cacheKey]) {
      emitMetric(req.log, "scan_cache", { hit: true, barcode, cacheKey });
      const cached = cache[cacheKey];
      const response: ScanResponse = {
        status: cached.status,
        verdict: cached.verdict,
        glow_score: cached.glow_score,
        explanation: cached.explanation,
        source: cached.source,
        cached: true,
        search_keyword: cached.search_keyword ?? null,
        product: cached.product ?? {
          name: productName ?? "",
          brand: productBrand,
          image_url: productImage,
        },
        // Older cached entries (pre-matches) may lack this; default to []
        // — UI will simply show an empty breakdown rather than crash.
        matches: cached.matches ?? [],
      };
      res.json(response);
      return;
    }

    // Cache miss (atteint ici uniquement si pas de hit ci-dessus)
    emitMetric(req.log, "scan_cache", { hit: false, barcode, cacheKey });

    // ── 3. Fallback to OpenFoodFacts if product missing or has no ingredients
    // v3 — On capture `offSource` au scope extérieur pour pouvoir l'utiliser
    // ensuite dans le choix du domaine matcher (food vs cosmetic). Sans ça,
    // un barcode trouvé via OpenBeautyFacts (cosmétique) tomberait sur le
    // fallback `food` et appliquerait des règles alimentaires sur des INCI
    // cosmétiques → risque de sous-détection.
    let offSource: "openfoodfacts" | "openbeautyfacts" | null = null;
    if (!product || !ingredientsRaw || !ingredientsRaw.trim()) {
      const off = await fetchFromOpenFacts(barcode);
      if (!off) {
        res.status(404).json({ error: "product_not_found" });
        return;
      }
      productName = off.name;
      productBrand = off.brand;
      productImage = off.imageUrl;
      ingredientsRaw = off.ingredientsRaw;
      offSource = off.source;
    }

    // ── 4. Deterministic engine ──────────────────────────────────────────
    const ingredientsList = parseIngredients(ingredientsRaw ?? "");
    if (ingredientsList.length === 0) {
      res.status(422).json({ error: "no_ingredients_parsed" });
      return;
    }

    // v3 — Détermination du domaine pour isolation du dictionnaire matcher.
    // CRITIQUE : sans ce passage, FOOD_CONTEXT_OVERRIDES (alcool standalone,
    // E-numbers safe…) ne se déclenche jamais car gated sur `domain === 'food'`.
    // Ordre de priorité :
    //   1. products.category (source de vérité applicative quand le produit
    //      est en base curée Supabase)
    //   2. offSource (openbeautyfacts → cosmetic, openfoodfacts → food) pour
    //      les barcodes inconnus en base — évite le drift safety cosmétique
    //      identifié au code review v13.
    //   3. food par défaut (cas dégénéré : ne dégrade pas le comportement).
    const productCategory = String(product?.category ?? "").toLowerCase();
    const beltDomain: IngredientDomain =
      productCategory === "cosmetic"
        ? "cosmetic"
        : productCategory === "medication"
          ? "medication"
          : productCategory === "food"
            ? "food"
            : offSource === "openbeautyfacts"
              ? "cosmetic"
              : "food";
    const det = await matchDeterministic(ingredientsList, trimester, beltDomain);

    // Helper: conservative "analysis unavailable" verdict. NEVER returns safe.
    // Used when our knowledge sources cannot give a confident answer.
    const matchesDto: ScanMatchDto[] = det.matches.map(toMatchDto);

    const indeterminateResponse = (reason: string): ScanResponse => ({
      status: "a_eviter",
      verdict: "caution",
      glow_score: 40,
      explanation: reason,
      source: "deterministic",
      cached: false,
      search_keyword: null,
      product: {
        name: productName ?? "",
        brand: productBrand,
        image_url: productImage,
      },
      matches: matchesDto,
    });

    let response: ScanResponse;

    if (det.dangerousMatch) {
      // ── 4a. Confirmed danger → short-circuit, no Claude call ───────────
      const { verdict, glowScore } = computeVerdict(det.matches);
      const flaggedName =
        det.dangerousMatch.matchedIngredientName ??
        det.dangerousMatch.ingredientName;
      response = {
        status: "interdit",
        verdict,
        glow_score: glowScore,
        explanation: `Contient ${flaggedName}, à éviter pendant cette phase selon nos sources médicales.`,
        source: "deterministic",
        cached: false,
        search_keyword: null,
        product: {
          name: productName ?? "",
          brand: productBrand,
          image_url: productImage,
        },
        matches: matchesDto,
      };
    } else if (!det.hasUnknown) {
      // ── 4b. All ingredients known, no danger → deterministic verdict ───
      const { verdict, glowScore } = computeVerdict(det.matches);
      response = {
        status: verdictToStatus(verdict),
        verdict,
        glow_score: glowScore,
        explanation:
          verdict === "safe"
            ? "Tous les ingrédients sont reconnus et sans risque pour cette phase."
            : "Aucun ingrédient interdit détecté, mais certains demandent vigilance.",
        source: "deterministic",
        cached: false,
        search_keyword: null,
        product: {
          name: productName ?? "",
          brand: productBrand,
          image_url: productImage,
        },
        matches: matchesDto,
      };
    } else {
      // ── 4c. Unknown ingredients present → AI fallback ──────────────────
      try {
        const ai = await analyzeWithClaude({
          productName: productName ?? "Produit inconnu",
          brand: productBrand,
          ingredients: ingredientsRaw ?? "",
          trimester,
          log: req.log,
        });
        const verdict = aiStatusToVerdict(ai.status);
        response = {
          status: ai.status,
          verdict,
          glow_score: ai.glow_score,
          explanation: ai.explanation,
          source: "ai",
          cached: false,
          search_keyword: ai.search_keyword,
          product: {
            name: productName ?? "",
            brand: productBrand,
            image_url: productImage,
          },
          matches: matchesDto,
        };
      } catch (aiErr) {
        req.log.error({ err: aiErr }, "AI fallback failed");
        // Conservative: AI is the only safety net for unknown ingredients.
        // If it fails, we refuse to declare the product safe — medical context.
        response = indeterminateResponse(
          "Analyse indisponible pour le moment (ingrédients non reconnus dans notre base et IA injoignable). À éviter par précaution — consultez votre médecin.",
        );
      }
    }

    // ── 5. Persist to analysis_cache (skip indeterminate verdicts) ───────
    // We deliberately do NOT cache "analysis unavailable" responses so a
    // transient AI/DB outage doesn't poison the cache for hours.
    const shouldCache = !(
      response.source === "deterministic" &&
      response.glow_score === 40 &&
      response.verdict === "caution"
    );

    if (shouldCache) {
      // NOTE: read-modify-write on the JSONB column is not atomic. Concurrent
      // scans of the same barcode across different phases can lose one write.
      // Acceptable for v1 — worst case is one re-computation on next scan.
      // For atomic merge, install the `merge_analysis_cache` Postgres RPC
      // (see docs/supabase-rpc.sql) and switch to .rpc() here.
      const newCache = {
        ...cache,
        [cacheKey]: {
          status: response.status,
          verdict: response.verdict,
          glow_score: response.glow_score,
          explanation: response.explanation,
          source: response.source,
          search_keyword: response.search_keyword,
          product: response.product,
          matches: response.matches,
          analyzed_at: new Date().toISOString(),
        },
      };
      const { error: writeErr } = product
        ? await supabaseAdmin
            .from("products")
            .update({ analysis_cache: newCache })
            .eq("barcode", barcode)
        : await supabaseAdmin.from("products").insert({
            barcode,
            name: productName,
            brand: productBrand,
            ingredients_raw: ingredientsRaw,
            image_url: productImage,
            analysis_cache: newCache,
          });
      if (writeErr) {
        req.log.warn({ err: writeErr }, "analysis_cache write failed");
      }
    }

    res.json(response);
  } catch (err) {
    req.log.error({ err }, "scan handler failed");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
