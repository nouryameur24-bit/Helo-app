import { Router, type IRouter } from "express";
import { z } from "zod/v4";

import { supabaseAdmin, isSupabaseConfigured } from "../lib/supabaseAdmin";
import { parseIngredients } from "../lib/parseIngredients";
import { matchDeterministic, type Phase } from "../lib/matcher";
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
  overall_risk: "safe" | "caution";
  price_range: string;
  popularity_count: number;
  origin_badge: OriginBadge;
}

// ─── Local helpers (duplicated from mobile lib/alternatives.ts) ─────────────
// TODO: extract to a shared @workspace/alternatives-scoring lib post-MVP.

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
 * Mapping marque/nom-produit → catégorie consommation.
 * Indispensable car la majorité des produits Open Food Facts ont un nom qui
 * est PUREMENT une marque ("Coke", "Nutella", "Red Bull", "Twix") sans aucun
 * mot-clé descriptif. Sans ce mapping, le Filet ramène 20 candidats aléatoires
 * (kw=[]) et le Sniper rejette tout pour incohérence d'usage.
 */
const BRAND_TO_TYPE: Record<string, string[]> = {
  // Sodas / boissons sucrées
  "coke": ["soda", "cola", "boisson"],
  "coca": ["soda", "cola", "boisson"],
  "pepsi": ["soda", "cola", "boisson"],
  "fanta": ["soda", "boisson"],
  "sprite": ["soda", "boisson"],
  "schweppes": ["soda", "limonade", "boisson"],
  "orangina": ["soda", "boisson"],
  "perrier": ["eau", "boisson"],
  "evian": ["eau", "boisson"],
  // Énergisantes
  "red bull": ["boisson énergisante", "boisson", "soda"],
  "monster": ["boisson énergisante", "boisson"],
  "burn": ["boisson énergisante", "boisson"],
  // Pâtes à tartiner (inclus substituts safe présents dans la base :
  // purée d'oléagineux, miel, confiture)
  "nutella": ["pâte à tartiner", "chocolat", "purée", "miel", "confiture"],
  "nocciolata": ["pâte à tartiner", "chocolat", "purée", "miel", "confiture"],
  // Barres / confiseries chocolatées
  "twix": ["barre", "chocolat", "biscuit"],
  "mars": ["barre", "chocolat"],
  "snickers": ["barre", "chocolat"],
  "bounty": ["barre", "chocolat"],
  "kit kat": ["barre", "chocolat", "biscuit"],
  "kinder": ["chocolat", "barre"],
  "milka": ["chocolat"],
  "lindt": ["chocolat"],
  "côte d'or": ["chocolat"],
  // Biscuits
  "oreo": ["biscuit", "chocolat"],
  "prince": ["biscuit", "chocolat"],
  "lu": ["biscuit"],
  "granola": ["biscuit", "céréales"],
  "petit beurre": ["biscuit"],
  "bn": ["biscuit"],
  // Bonbons
  "haribo": ["bonbon"],
  "carambar": ["bonbon"],
  // Glaces
  "magnum": ["glace", "chocolat"],
  "häagen-dazs": ["glace"],
  "ben & jerry": ["glace"],
};

function extractKeywords(name: string, brand?: string | null): string[] {
  const lower = (name ?? "").toLowerCase();
  const brandLower = (brand ?? "").toLowerCase();
  const hits = new Set<string>();
  // 1) Direct match on descriptive product types in the name.
  for (const type of PRODUCT_TYPES) {
    if (lower.includes(type)) hits.add(type);
  }
  // 2) Brand-name fallback: known brand → consumption category.
  for (const [needle, types] of Object.entries(BRAND_TO_TYPE)) {
    if (lower.includes(needle) || brandLower.includes(needle)) {
      for (const t of types) hits.add(t);
    }
  }
  return Array.from(hits);
}

const PHARMACY_BRANDS = [
  "avène", "avene", "la roche-posay", "roche posay",
  "mustela", "bioderma", "uriage", "a-derma", "aderma", "klorane",
  "weleda", "cattier", "cetaphil", "cerave", "eucerin", "ducray", "nuxe",
];

const FRENCH_BRANDS = [
  "caudalie", "embryolisse", "lierac", "sanoflore",
  "melvita", "galenic", "phyto", "rené furterer",
];

function detectBio(name: string, ingredientsLower: string): boolean {
  const nameLower = (name ?? "").toLowerCase();
  return /\bbio\b/.test(nameLower)
    || nameLower.includes("biologique")
    || /\bbio\b/.test(ingredientsLower);
}

function scoreAndBadge(
  name: string,
  brand: string,
  ingredientsRaw: string,
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

  if (detectBio(name, ingLower)) {
    score += 5;
    if (!originBadge) originBadge = "bio";
  }

  return { score, originBadge };
}

// ─── Route ──────────────────────────────────────────────────────────────────

router.get(
  "/alternatives/:barcode",
  alternativesRateLimit,
  requireAppSecret,
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

    try {
      // ── 1. Lookup origin product ─────────────────────────────────────────
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
        {
          search_keyword?: string | null;
          alternatives?: string[];
        }
      >;
      const phaseCache = cache[cacheKey];

      // ── 2. CACHE HIT on alternatives → skip Filet+Sniper ────────────────
      let validatedBarcodes: string[] | null = null;
      if (phaseCache?.alternatives && Array.isArray(phaseCache.alternatives)) {
        validatedBarcodes = phaseCache.alternatives;
        emitMetric(req.log, "alternatives_cache", {
          hit: true,
          barcode,
          cacheKey,
          n: validatedBarcodes.length,
        });
      } else {
        emitMetric(req.log, "alternatives_cache", {
          hit: false,
          barcode,
          cacheKey,
        });
      }

      // ── 3. Resolve search keyword (cache → local heuristic) ──────────────
      let searchKeyword: string | null = phaseCache?.search_keyword ?? null;
      const fallbackKeywords = extractKeywords(origin.name ?? "", origin.brand);

      // ── 4. FILET (Supabase) — only if no cache hit ──────────────────────
      if (validatedBarcodes === null) {
        // Build OR filter from keyword (string) and/or local keyword list.
        const keywordList = searchKeyword
          ? [searchKeyword.toLowerCase(), ...fallbackKeywords]
          : fallbackKeywords;
        const uniqueKw = Array.from(new Set(keywordList)).slice(0, 6);

        let netCandidates: Array<{
          id: string;
          barcode: string | null;
          name: string;
          brand: string | null;
          category: string | null;
          ingredients_raw: string | null;
          image_url: string | null;
        }> = [];

        if (uniqueKw.length > 0) {
          // Sanitize for PostgREST `or()` filter — strip commas/parens.
          // Cherche dans name ET brand : les produits Open Food Facts ont
          // souvent un nom purement marque ("Perrier", "Nutella") sans
          // descripteur, mais le brand contient le mot-clé recherché
          // (ex: brand="Coca-Cola" matche kw "cola").
          const cleanKw = uniqueKw
            .map((kw) => kw.replace(/[,()]/g, " ").trim())
            .filter((kw) => kw.length >= 3);
          const orFilter = cleanKw
            .flatMap((kw) => [`name.ilike.%${kw}%`, `brand.ilike.%${kw}%`])
            .join(",");

          if (orFilter) {
            const query = supabaseAdmin
              .from("products")
              .select(
                "id, barcode, name, brand, category, ingredients_raw, image_url",
              )
              .neq("barcode", barcode)
              .not("ingredients_raw", "is", null)
              .or(orFilter)
              .limit(20);

            // Prefer same category when we have one — keeps the filet tight.
            const finalQuery = origin.category
              ? query.eq("category", origin.category)
              : query;

            const { data: netRows, error: netErr } = await finalQuery;
            if (netErr) {
              req.log.warn({ err: netErr }, "filet keyword query failed");
            } else if (netRows) {
              netCandidates = netRows;
            }
          }
        }

        // Fallback: if keyword net was empty AND we have a category, take
        // any same-category product. Better to give Claude SOMETHING to
        // chew on than to return empty by lack of data.
        if (netCandidates.length === 0 && origin.category) {
          const { data: catRows } = await supabaseAdmin
            .from("products")
            .select(
              "id, barcode, name, brand, category, ingredients_raw, image_url",
            )
            .eq("category", origin.category)
            .neq("barcode", barcode)
            .not("ingredients_raw", "is", null)
            .limit(20);
          if (catRows) netCandidates = catRows;
        }

        req.log.info(
          { barcode, cacheKey, n: netCandidates.length, kw: uniqueKw },
          "filet caught candidates",
        );

        if (netCandidates.length === 0) {
          // Nothing to sniper → store empty cache and return empty.
          await writeAlternativesCache(req, barcode, cache, cacheKey, []);
          res.json([]);
          return;
        }

        // ── 5. SNIPER (Claude Haiku) ───────────────────────────────────────
        const sniperInput: AlternativeCandidate[] = netCandidates
          .filter(
            (c): c is typeof c & { barcode: string; ingredients_raw: string } =>
              !!c.barcode && !!c.ingredients_raw,
          )
          .map((c) => ({
            barcode: c.barcode,
            name: c.name,
            ingredients_raw: c.ingredients_raw,
          }));

        const sniperResult = await selectSafeAlternativesWithClaude({
          candidates: sniperInput,
          trimester: phase,
          originalName: origin.name ?? "",
          searchKeyword: searchKeyword ?? fallbackKeywords[0] ?? "",
          log: req.log,
        });
        validatedBarcodes = sniperResult.barcodes;

        // 🚨 KPI fiabilité médicale : seul `model_empty` compte comme vraie
        //    trappe (= Claude a délibérément rejeté tous les candidats).
        //    Les autres outcomes (infra_error, parse_error) sont des
        //    incidents techniques déjà loggés via alternatives_ai_error /
        //    log.warn — ne pas polluer le KPI safety.
        if (sniperResult.outcome === "model_empty") {
          emitMetric(req.log, "safety_trap_triggered", {
            reason: "sniper_empty",
            barcode,
            cacheKey,
            candidates: sniperInput.length,
          });
          alertSafetyTrap({ reason: "sniper_empty", barcode, cacheKey });
        }

        // ── 6. Write back cache (best-effort) ─────────────────────────────
        await writeAlternativesCache(
          req,
          barcode,
          cache,
          cacheKey,
          validatedBarcodes,
        );
      }

      if (validatedBarcodes.length === 0) {
        res.json([]);
        return;
      }

      // ── 7. Hydrate full product rows ───────────────────────────────────
      const { data: hydrated, error: hydErr } = await supabaseAdmin
        .from("products")
        .select(
          "id, barcode, name, brand, category, ingredients_raw, image_url",
        )
        .in("barcode", validatedBarcodes);

      if (hydErr || !hydrated) {
        req.log.error({ err: hydErr }, "hydration failed");
        res.json([]); // graceful degrade — better empty than 500
        return;
      }

      // ── 8. CEINTURE & BRETELLES — deterministic re-verification ────────
      // HOTFIX 1 (post-CHUNK 7) : assouplissement pragmatique pour
      // l'alimentaire. La règle "unknown = veto" était théoriquement juste
      // ("on ne sait pas" ≠ "c'est safe") mais en pratique vétait ~100 %
      // des candidats Open Food Facts (base EFSA trop maigre vs richesse
      // des listes INCI alimentaires composées).
      //
      // Nouvelle règle :
      //   - `danger` ou `caution` détecté → VETO (la Ceinture bloque toujours
      //     les risques EXPLICITEMENT identifiés par notre base curatée).
      //   - `unknown` (no_signal) → ACCEPT. La preuve positive est déjà
      //     apportée par le Sniper Claude qui a analysé la liste complète
      //     et certifié 100 % safe pour cette phase.
      //
      // La Ceinture reste un filet de sûreté contre les danger/caution connus,
      // mais ne sur-veto plus sur l'absence d'évidence dans notre base.
      // Application stricte de la directive HOTFIX 1 utilisateur : la Ceinture
      // veto UNIQUEMENT sur danger/caution explicitement identifiés par notre
      // base curatée. Tout ingrédient "unknown" (no_signal) → ACCEPT, preuve
      // positive déléguée au Sniper Claude.
      //
      // ⚠️ DETTE TECHNIQUE ASSUMÉE (post-review architect) : un produit dont
      // AUCUN ingrédient n'est dans notre base peut passer si le Sniper le
      // choisit. Tests empiriques (Oreo, Coca, Nutella, Red Bull) montrent
      // que toute borne plancher (même knownCount≥1) veto ~100 % des picks
      // alimentaires — la base EFSA (1540 entrées) est trop maigre face à
      // la richesse des listes Open Food Facts. La levée de cette dette
      // dépend de l'enrichissement de la base alimentaire, pas du pipeline.
      //
      // La trappe `belt_low_coverage` reste DÉCLARÉE dans metrics.ts pour
      // pouvoir être réactivée d'un seul flip une fois la base enrichie.
      const safeProducts: typeof hydrated = [];
      let beltVetoRisk = 0;
      for (const p of hydrated) {
        if (!p.ingredients_raw) continue;
        const ingredientsList = parseIngredients(p.ingredients_raw);
        if (ingredientsList.length === 0) continue;
        const det = await matchDeterministic(ingredientsList, phase);

        const hasRisk = det.matches.some(
          (m) => m.riskLevel === "danger" || m.riskLevel === "caution",
        );
        if (hasRisk) {
          beltVetoRisk++;
          continue;
        }
        safeProducts.push(p);
      }

      if (beltVetoRisk > 0) {
        emitMetric(req.log, "safety_trap_triggered", {
          reason: "belt_risk",
          barcode,
          cacheKey,
          vetoed: beltVetoRisk,
          examined: hydrated.length,
        });
        alertSafetyTrap({ reason: "belt_risk", barcode, cacheKey });
      }

      // ── 9. Transform to DTO with badges + score ─────────────────────────
      const dtos: AlternativeProductDto[] = safeProducts.map((p) => {
        const { score, originBadge } = scoreAndBadge(
          p.name,
          p.brand ?? "",
          p.ingredients_raw ?? "",
        );
        return {
          id: p.id,
          name: p.name,
          brand: p.brand ?? "",
          category: p.category ?? "",
          barcode: p.barcode,
          image_url: p.image_url,
          description_fr: null,
          overall_risk: "safe",
          price_range: "",
          popularity_count: score,
          origin_badge: originBadge,
        };
      });

      // Sort by score desc (pharmacy > french > bio > neutral)
      dtos.sort((a, b) => b.popularity_count - a.popularity_count);

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
  alternatives: string[],
): Promise<void> {
  // NOTE: same JSONB read-modify-write race as scan.ts. Acceptable for v1.
  // Worst case: cache miss on next scan, one extra Claude call.
  const existingPhase =
    (existingCache[cacheKey] as Record<string, unknown> | undefined) ?? {};
  const newCache = {
    ...existingCache,
    [cacheKey]: {
      ...existingPhase,
      alternatives,
      alternatives_computed_at: new Date().toISOString(),
    },
  };
  const { error } = await supabaseAdmin
    .from("products")
    .update({ analysis_cache: newCache })
    .eq("barcode", barcode);
  if (error) {
    // Non-fatal but observable: every silent failure here = repeated Claude
    // calls forever. Surface to logs so we can spot DB issues in production.
    req.log.warn(
      { err: error, barcode, cacheKey, n: alternatives.length },
      "alternatives cache write failed — next call will re-trigger Claude",
    );
  }
}

export default router;
