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
} from "../lib/matcher";
import { analyzeWithClaude, type AiVerdict } from "../lib/anthropic";
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

function trimesterCacheKey(t: Phase): string {
  return typeof t === "number" ? `t${t}` : t;
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
      .select("barcode, name, brand, ingredients_raw, image_url, analysis_cache")
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
      };
      res.json(response);
      return;
    }

    // ── 3. Fallback to OpenFoodFacts if product missing or has no ingredients
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
    }

    // ── 4. Deterministic engine ──────────────────────────────────────────
    const ingredientsList = parseIngredients(ingredientsRaw ?? "");
    if (ingredientsList.length === 0) {
      res.status(422).json({ error: "no_ingredients_parsed" });
      return;
    }

    const det = await matchDeterministic(ingredientsList, trimester);

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
      };
    } else {
      // ── 4c. Unknown ingredients present → AI fallback ──────────────────
      try {
        const ai = await analyzeWithClaude({
          productName: productName ?? "Produit inconnu",
          brand: productBrand,
          ingredients: ingredientsRaw ?? "",
          trimester,
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
        };
      } catch (aiErr) {
        req.log.error({ err: aiErr }, "AI fallback failed");
        // Last-resort safe fallback: return deterministic partial result
        const { verdict, glowScore } = computeVerdict(det.matches);
        response = {
          status: verdictToStatus(verdict),
          verdict,
          glow_score: glowScore,
          explanation:
            "Analyse partielle (certains ingrédients non reconnus). Consultez votre médecin en cas de doute.",
          source: "deterministic",
          cached: false,
          search_keyword: null,
          product: {
            name: productName ?? "",
            brand: productBrand,
            image_url: productImage,
          },
        };
      }
    }

    // ── 5. Persist to analysis_cache (upsert product if missing) ─────────
    try {
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
          analyzed_at: new Date().toISOString(),
        },
      };
      if (product) {
        await supabaseAdmin
          .from("products")
          .update({ analysis_cache: newCache })
          .eq("barcode", barcode);
      } else {
        await supabaseAdmin.from("products").insert({
          barcode,
          name: productName,
          brand: productBrand,
          ingredients_raw: ingredientsRaw,
          image_url: productImage,
          analysis_cache: newCache,
        });
      }
    } catch (writeErr) {
      // Cache write failure is non-fatal — log and still return the result
      req.log.warn({ err: writeErr }, "analysis_cache write failed");
    }

    res.json(response);
  } catch (err) {
    req.log.error({ err }, "scan handler failed");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
