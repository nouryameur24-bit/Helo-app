import { supabaseAdmin } from "./supabaseAdmin";
import { logger } from "./logger";

export type RiskLevel = "safe" | "caution" | "danger" | "no_signal";
export type Phase = 1 | 2 | 3 | "breastfeeding" | "baby";
export type Verdict = "safe" | "caution" | "danger";

/**
 * Ingredient domain — used to isolate the matcher dictionary so we don't
 * cross-pollute food vs cosmetic vs medication lookups (cf. "Kouign Amann"
 * regression where `fat` matched `sulfate de magnésium lauryléther`).
 *
 * Derived from the `source` column of the ingredients table, which actually
 * tells the truth (the `category` column is mis-tagged as "cosmetic" for
 * 100% of rows due to a backfill bug).
 */
export type IngredientDomain = "food" | "cosmetic" | "medication";

interface IngredientRow {
  id: string;
  name: string;
  name_inci: string | null;
  synonyms: string[] | null;
  source: string | null;
  risk_level_t1: RiskLevel;
  risk_level_t2: RiskLevel;
  risk_level_t3: RiskLevel;
  risk_level_breastfeeding: RiskLevel | null;
  risk_level_baby: RiskLevel | null;
}

/**
 * Map a raw `source` string (potentially multi-source like "ANSES, CRAT") to
 * a single domain bucket. The first matched pattern wins, in priority order:
 * food → medication → cosmetic. This priority handles entries that span
 * multiple registries (e.g. "cosing, efsa" is treated as food because EFSA
 * means it has a food signal that's authoritative for that use case).
 */
export function sourceToDomain(source: string | null): IngredientDomain {
  const s = (source ?? "").toLowerCase();
  if (/\befsa\b/.test(s)) return "food";
  if (/(anses|ansm|crat|bdpm|fda|\bhas\b|\boms\b|circ|inrs|aromathérapie)/.test(s)) {
    return "medication";
  }
  return "cosmetic"; // cosing, sccs, echa, ewg, ifra, cir, default
}

export interface MatchResult {
  ingredientName: string;
  matched: boolean;
  matchedIngredientName?: string;
  riskLevel: RiskLevel;
}

export interface DeterministicResult {
  matches: MatchResult[];
  hasUnknown: boolean;
  dangerousMatch?: MatchResult;
}

// In-memory cache for the ingredients dictionary. ~5000 rows, refreshed lazily.
let cache: { rows: IngredientRow[]; loadedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function loadIngredients(): Promise<IngredientRow[]> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache.rows;
  }
  // risk_level_baby is optional — older Supabase schemas don't have it yet.
  // We select it via a defensive query: try with, fall back to without.
  let { data, error } = await supabaseAdmin
    .from("ingredients")
    .select(
      "id, name, name_inci, synonyms, source, risk_level_t1, risk_level_t2, risk_level_t3, risk_level_breastfeeding, risk_level_baby",
    );
  if (error?.code === "42703") {
    ({ data, error } = await supabaseAdmin
      .from("ingredients")
      .select(
        "id, name, name_inci, synonyms, source, risk_level_t1, risk_level_t2, risk_level_t3, risk_level_breastfeeding",
      ));
  }
  if (error || !data) {
    logger.error({ err: error }, "loadIngredients failed");
    return cache?.rows ?? [];
  }
  cache = { rows: data as IngredientRow[], loadedAt: Date.now() };
  return cache.rows;
}

// ─── Whitelist d'exceptions (Bug "Vinaigre d'alcool") ──────────────────────
//
// Contexte : le matcher faisait `nameLower.includes(ing.name)` pour gérer
// les noms composés type "huile d'amande douce" (qui contient "amande").
// Effet pervers : si un row court du dictionnaire s'appelle "alcool" ou
// "alcool éthylique", il matche dans "vinaigre d'alcool" → faux positif
// danger systématique (test QA : Moutarde Amora → 27/100 à cause de ça).
//
// Médicalement, plusieurs composés contenant le mot "alcool" sont en
// réalité totalement inoffensifs en grossesse :
//   - Vinaigre d'alcool / vinaigre blanc : acide acétique pur, zéro éthanol
//   - Alcools gras (cetearyl, cetyl, stearyl, behenyl, myristyl) :
//     émollients cosmétiques, sans rapport avec l'éthanol
//   - Benzyl alcohol : conservateur cosmétique, sûr aux doses légales
//
// Ces patterns SHORT-CIRCUITENT le matching standard et marquent
// l'ingrédient comme `safe` quelle que soit la phase. Word-boundary seul
// ne suffirait pas : `\balcool\b` matcherait dans "vinaigre d'alcool".
const SAFE_OVERRIDES: { pattern: RegExp; label: string }[] = [
  { pattern: /\bvinaigre\s+(?:blanc|d['’]?\s*alcool|de\s+vin|de\s+cidre|balsamique)\b/iu, label: "Vinaigre" },
  { pattern: /\bcetearyl\s+alcohol\b/iu, label: "Cetearyl alcohol (alcool gras)" },
  { pattern: /\bcetyl\s+alcohol\b/iu, label: "Cetyl alcohol (alcool gras)" },
  { pattern: /\bstearyl\s+alcohol\b/iu, label: "Stearyl alcohol (alcool gras)" },
  { pattern: /\bbehenyl\s+alcohol\b/iu, label: "Behenyl alcohol (alcool gras)" },
  { pattern: /\bmyristyl\s+alcohol\b/iu, label: "Myristyl alcohol (alcool gras)" },
  { pattern: /\bbenzyl\s+alcohol\b/iu, label: "Benzyl alcohol (conservateur cosmétique)" },
  { pattern: /\balcool[s]?\s+gras\b/iu, label: "Alcool gras" },
];

function matchSafeOverride(
  ingredientName: string,
): { matched: true; label: string } | null {
  for (const { pattern, label } of SAFE_OVERRIDES) {
    if (pattern.test(ingredientName)) return { matched: true, label };
  }
  return null;
}

// ─── Word-boundary matcher (Bug substring) ──────────────────────────────────
//
// Échappe les caractères regex puis normalise les espaces et apostrophes
// (curly + straight) pour qu'une entrée "huile d'amande" match
// "huile d'amande douce" (et son apostrophe typographique).
function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Cache des regex compilées : avec ~5000 rows × ≥3 champs (name, inci,
// synonyms), le map().find() ferait jusqu'à ~20k recompilations par scan.
// On mémorise par needle pour rester à ~5000 compilations totales sur la
// vie du process (puis 0 jusqu'au prochain restart).
const REGEX_CACHE = new Map<string, RegExp | null>();
const REGEX_CACHE_MAX = 20_000; // safety cap pour éviter une fuite mémoire

function makeWordRegex(term: string): RegExp | null {
  const trimmed = term.trim();
  if (trimmed.length < 2) return null;
  const cached = REGEX_CACHE.get(trimmed);
  if (cached !== undefined) return cached;
  // Apostrophes droites ou typographiques interchangeables
  const escaped = escapeForRegex(trimmed)
    .replace(/['’]/g, "['’]")
    .replace(/\s+/g, "\\s+");
  let compiled: RegExp | null = null;
  try {
    compiled = new RegExp(`\\b${escaped}\\b`, "iu");
  } catch {
    compiled = null;
  }
  if (REGEX_CACHE.size < REGEX_CACHE_MAX) {
    REGEX_CACHE.set(trimmed, compiled);
  }
  return compiled;
}

function wordMatches(haystack: string, needle: string): boolean {
  const re = makeWordRegex(needle);
  return re ? re.test(haystack) : false;
}

function getRiskForPhase(ing: IngredientRow, phase: Phase): RiskLevel {
  switch (phase) {
    case 1:
      return ing.risk_level_t1;
    case 2:
      return ing.risk_level_t2;
    case 3:
      return ing.risk_level_t3;
    case "breastfeeding":
      return ing.risk_level_breastfeeding ?? ing.risk_level_t3;
    case "baby":
      return ing.risk_level_baby ?? "no_signal";
  }
}

/**
 * Deterministic matching engine. Mirrors the mobile matchIngredientsLocal logic.
 *
 * Returns:
 *  - matches: per-ingredient verdict
 *  - hasUnknown: at least one ingredient is not in our 5000 curated entries
 *  - dangerousMatch: the first matched ingredient with risk = danger (caution
 *    is NOT enough to bypass Claude — only confirmed danger short-circuits)
 */
export async function matchDeterministic(
  ingredientsList: string[],
  phase: Phase,
  domain?: IngredientDomain,
): Promise<DeterministicResult> {
  if (ingredientsList.length === 0) {
    return { matches: [], hasUnknown: false };
  }

  const allRows = await loadIngredients();
  // Domain isolation: if caller passes `food`, only EFSA rows; if `cosmetic`,
  // only cosing/sccs/echa/etc. This kills cross-domain false positives like
  // `fat` (food) matching `sulfate de magnésium lauryléther` (cosmetic).
  // When `domain` is omitted we load everything (legacy behaviour for the
  // /scan route which already gates by product.category upstream).
  const rows = domain
    ? allRows.filter((r) => sourceToDomain(r.source) === domain)
    : allRows;

  const matches: MatchResult[] = ingredientsList.map((ingredientName) => {
    // 0. Whitelist d'exceptions : "vinaigre d'alcool", alcools gras, etc.
    //    Court-circuite TOUTE règle dangereuse — médicalement inoffensifs.
    const safeOverride = matchSafeOverride(ingredientName);
    if (safeOverride) {
      return {
        ingredientName,
        matched: true,
        matchedIngredientName: safeOverride.label,
        riskLevel: "safe" as const,
      };
    }

    // 1. Matching word-boundary bi-directionnel (au lieu de substring).
    //    Évite les faux positifs type "fat" dans "sulfate" ou "ester" dans
    //    "esterel". On teste les 2 sens car les noms en BD peuvent être
    //    plus courts (radical) OU plus longs (forme INCI complète) que
    //    ce que le scanner OCR détecte.
    const matched = rows.find((ing) => {
      const ingName = ing.name;
      const ingInci = ing.name_inci ?? "";
      // a) row → ingredient (row name est un sous-mot du scan)
      if (ingName && wordMatches(ingredientName, ingName)) return true;
      if (ingInci && wordMatches(ingredientName, ingInci)) return true;
      if (
        ing.synonyms?.some((syn) => syn && wordMatches(ingredientName, syn))
      )
        return true;
      // b) ingredient → row (le scan est un sous-mot du row, ex: "amande"
      //    scanné, row "huile d'amande douce"). Plus restrictif : on
      //    n'autorise ce sens que si l'ingrédient scanné ≥ 4 chars pour
      //    éviter les matches accidentels sur tokens courts.
      if (ingredientName.length >= 4) {
        if (ingName && wordMatches(ingName, ingredientName)) return true;
        if (ingInci && wordMatches(ingInci, ingredientName)) return true;
      }
      return false;
    });

    if (matched) {
      return {
        ingredientName,
        matched: true,
        matchedIngredientName: matched.name,
        riskLevel: getRiskForPhase(matched, phase),
      };
    }
    return { ingredientName, matched: false, riskLevel: "no_signal" as const };
  });

  const dangerousMatch = matches.find((m) => m.riskLevel === "danger");
  const hasUnknown = matches.some((m) => !m.matched);

  return { matches, hasUnknown, dangerousMatch };
}

/**
 * Compute the GlowScore + verdict from deterministic matches.
 * Same formula as artifacts/helo/lib/glowscore.ts for consistency across surfaces.
 */
export function computeVerdict(matches: MatchResult[]): {
  verdict: Verdict;
  glowScore: number;
} {
  const hasDanger = matches.some((m) => m.riskLevel === "danger");
  const hasCaution = matches.some((m) => m.riskLevel === "caution");

  const verdict: Verdict = hasDanger
    ? "danger"
    : hasCaution
      ? "caution"
      : "safe";

  // Score: 100 baseline, -50 per danger, -15 per caution, -2 per unknown
  const dangerCount = matches.filter((m) => m.riskLevel === "danger").length;
  const cautionCount = matches.filter((m) => m.riskLevel === "caution").length;
  const unknownCount = matches.filter((m) => !m.matched).length;

  let score = 100 - dangerCount * 50 - cautionCount * 15 - unknownCount * 2;
  score = Math.max(0, Math.min(100, score));

  return { verdict, glowScore: score };
}
