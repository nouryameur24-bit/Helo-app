import Anthropic from "@anthropic-ai/sdk";
import type { Logger } from "pino";
import { logger } from "./logger";
import { emitMetric, mark } from "./metrics";
import { alertAiError } from "./webhookAlerter";

// v4 SECURITY — Le fallback sur EXPO_PUBLIC_ANTHROPIC_API_KEY a été supprimé :
// toute variable EXPO_PUBLIC_* est embarquée en clair dans le bundle mobile
// (extractible par décompilation APK/IPA). Utiliser cette clé en fallback
// côté serveur exposait notre crédit Anthropic à un attaquant qui aurait
// extrait la clé du bundle. La clé doit IMPÉRATIVEMENT être configurée via
// le secret Replit `ANTHROPIC_API_KEY` (jamais une variable EXPO_PUBLIC).
const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  logger.warn("ANTHROPIC_API_KEY not set — AI fallback will fail");
}

// v4 — Timeout 8s : SLA Anthropic typique = 1-3s sur Haiku. À 8s on couvre
// les pires cas de slow path sans laisser un /scan mobile bloquer >10s (le
// client mobile timeout HTTP ~15s). maxRetries 2 : le SDK fait du backoff
// exponentiel automatique sur 5xx/429 transients.
const client = new Anthropic({
  apiKey: apiKey ?? "",
  timeout: 8000,
  maxRetries: 2,
});

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 400; // hard cap to bound cost per call

// ─── Circuit breaker (v4) ───────────────────────────────────────────────────
// Si Anthropic entre en vraie panne (>5 erreurs SDK en 60s), on stoppe de
// les hammer pendant 2 minutes. Pendant ce délai :
//   - analyzeWithClaude throw `anthropic_circuit_open` → /scan tombe sur
//     indeterminateResponse côté caller (caution mais pas safe — médical).
//   - selectSafeAlternativesWithClaude renvoie `outcome: "infra_error"` →
//     /alternatives renvoie [] gracieusement.
// Évite d'aggraver la situation pendant un outage (chaque retry × N requêtes
// concurrentes empire l'incident sans valeur ajoutée).
const ERROR_WINDOW_MS = 60_000;
const ERROR_THRESHOLD = 5;
const BREAKER_OPEN_MS = 2 * 60_000;
let errorTimestamps: number[] = [];
let breakerOpenUntil = 0;

function isBreakerOpen(): boolean {
  return Date.now() < breakerOpenUntil;
}

function recordAnthropicError(): void {
  const now = Date.now();
  // Sliding window : on évince les erreurs >60s.
  errorTimestamps = errorTimestamps.filter((t) => now - t < ERROR_WINDOW_MS);
  errorTimestamps.push(now);
  if (errorTimestamps.length >= ERROR_THRESHOLD) {
    breakerOpenUntil = now + BREAKER_OPEN_MS;
    errorTimestamps = [];
    logger.error(
      { openUntil: new Date(breakerOpenUntil).toISOString() },
      "anthropic circuit breaker OPENED — short-circuiting for 2min",
    );
  }
}

/** Exposé pour les tests : remet le breaker à zéro. */
export function _resetCircuitBreakerForTests(): void {
  errorTimestamps = [];
  breakerOpenUntil = 0;
}

export interface AiVerdict {
  status: "autorise" | "a_eviter" | "interdit";
  glow_score: number;
  explanation: string;
  search_keyword: string;
}

const SYSTEM_PROMPT = `Tu es un expert en toxicologie et en nutrition périnatale. Analyse la liste d'ingrédients d'un produit pour une femme enceinte ou allaitante.

Tu réponds UNIQUEMENT avec un objet JSON valide (pas de texte hors JSON, pas de markdown) avec ces clés exactes :
- "status": "autorise" | "a_eviter" | "interdit"
- "glow_score": entier entre 0 et 100 (100 = parfaitement sûr, 0 = à proscrire)
- "explanation": 2 phrases maximum en français, factuel, sans alarmisme inutile
- "search_keyword": 1 à 3 mots décrivant le type de produit (ex: "fromage pâte molle", "shampoing doux", "crème hydratante")

Sois conservateur : en cas de doute sur la grossesse, oriente vers "a_eviter".`;

function buildUserPrompt(
  productName: string,
  brand: string | null,
  ingredients: string,
  trimester: 1 | 2 | 3 | "breastfeeding" | "baby",
): string {
  const phaseLabel =
    trimester === "breastfeeding"
      ? "allaitement"
      : trimester === "baby"
        ? "bébé (post-natal)"
        : `trimestre ${trimester} de grossesse`;
  return `Phase : ${phaseLabel}
Produit : ${productName}${brand ? ` (marque : ${brand})` : ""}
Ingrédients : ${ingredients}

Analyse cette composition pour cette phase et renvoie le JSON.`;
}

export async function analyzeWithClaude(params: {
  productName: string;
  brand: string | null;
  ingredients: string;
  trimester: 1 | 2 | 3 | "breastfeeding" | "baby";
  /** Logger requête pour émettre les métriques FinOps. */
  log?: Logger;
}): Promise<AiVerdict> {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const log = params.log ?? logger;
  // v4 — Circuit breaker : si Anthropic est down, on ne tape plus l'API et
  // on remonte immédiatement une erreur typée pour que le caller (scan.ts)
  // bascule sur indeterminateResponse sans attendre les retries SDK.
  if (isBreakerOpen()) {
    emitMetric(log, "scan_ai_error", { model: MODEL, error_kind: "circuit_open" });
    throw new Error("anthropic_circuit_open");
  }

  const t = mark();

  let response: Anthropic.Messages.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(
            params.productName,
            params.brand,
            params.ingredients,
            params.trimester,
          ),
        },
      ],
    });
  } catch (err) {
    const errorKind = classifyAnthropicError(err);
    recordAnthropicError(); // v4 — alimente le circuit breaker
    emitMetric(log, "scan_ai_error", {
      ms: t(),
      model: MODEL,
      error_kind: errorKind,
    });
    alertAiError({ source: "scan", errorKind, model: MODEL });
    throw err;
  }

  emitMetric(log, "scan_ai_call", {
    ms: t(),
    model: MODEL,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content");
  }

  // Strip markdown fences if any
  const cleaned = textBlock.text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    log.error({ err }, "Claude returned non-JSON content");
    throw new Error("Claude returned invalid JSON");
  }

  return normalizeVerdict(parsed);
}

// ─── Alternatives selector (Sniper) ─────────────────────────────────────────

// ─── M1 : Two domain-specific Sniper prompts ────────────────────────────────
//
// Food vs cosmetic require radically different safety frames:
//   - Food  → ingestion : caféine, additifs E*, alcool, listériose, mercure,
//             édulcorants, colorants azoïques, mycotoxines, sucre.
//   - Cosmo → absorption cutanée + inhalation : perturbateurs endocriniens
//             (parabènes, phénoxyéthanol, BHA/BHT, EDTA), allergènes de
//             contact (MIT, MCIT, formaldéhyde, parfum), sulfates (SLS/SLES),
//             huiles essentielles à risque grossesse (sauge, romarin, menthe
//             poivrée).
//
// Both prompts ask Claude for a structured `[{barcode, reason}]` output —
// `reason` is a ≤15-word French sentence justifying the safety pick. The
// strict format rule is preserved verbatim because regressions on this
// constraint cost us a full day in the previous sprint.

const ALTERNATIVES_SYSTEM_PROMPT_FOOD = `Tu es un expert en toxicologie périnatale ET en grande distribution alimentaire française. Voici 20 produits candidats avec leurs listes d'ingrédients.
Le produit d'origine scanné par l'utilisatrice est : '{originalName}' (Mot-clé/Catégorie : '{searchKeyword}'). L'utilisatrice est au {trimester}.

Ta mission : Sélectionne jusqu'à 3 produits qui respectent STRICTEMENT ces 3 règles :
1. SÉCURITÉ ALIMENTAIRE ABSOLUE : zéro caféine au-dessus du seuil OMS (200mg/j), zéro édulcorant déconseillé grossesse (aspartame T3, cyclamate), zéro additif controversé (E102/E110/E124 colorants azoïques, E249-E252 nitrites, E951), zéro alcool, zéro risque listériose/toxoplasmose (fromages au lait cru, charcuterie crue, poisson cru/fumé), zéro mercure élevé (thon rouge, espadon).
2. COHÉRENCE D'OCCASION : Les alternatives doivent répondre au même MOMENT DE CONSOMMATION que '{originalName}' (boisson rafraîchissante → autre boisson rafraîchissante ; encas sucré → autre encas sucré). Une eau pétillante aromatisée EST une alternative valable à un soda, un sorbet EST une alternative valable à une glace.
3. MARCHÉ FRANÇAIS : Produits grand public trouvables en supermarchés français. Exclus marchés étrangers.

🚨 PRIORITÉ ABSOLUE = SÉCURITÉ. Si AUCUN produit ne respecte la règle 1, renvoie [].

⚠️ FORMAT DE RÉPONSE OBLIGATOIRE — RÈGLE ABSOLUE :
Ta réponse DOIT être un tableau JSON d'objets {"barcode":"...","reason":"..."}. AUCUN texte, AUCUN markdown avant ou après.
"reason" = phrase française percutante de 15 mots MAX expliquant pourquoi ce produit est sûr (cite l'ingrédient absent ou le label clé).
Exemples valides :
[{"barcode":"3017620422003","reason":"Sans caféine ni édulcorant, sucres naturels seulement."}]
[{"barcode":"3017620422003","reason":"Label Bio FR, zéro additif controversé."},{"barcode":"5449000000996","reason":"Eau minérale naturelle, sans nitrate ajouté."}]
[]
Toute réponse non conforme sera rejetée.`;

const ALTERNATIVES_SYSTEM_PROMPT_COSMETIC = `Tu es un expert en cosmétovigilance périnatale ET en grande distribution cosmétique française. Voici 20 produits candidats avec leurs listes INCI.
Le produit d'origine scanné par l'utilisatrice est : '{originalName}' (Mot-clé/Catégorie : '{searchKeyword}'). L'utilisatrice est au {trimester}.

Ta mission : Sélectionne jusqu'à 3 produits qui respectent STRICTEMENT ces 3 règles :
1. SÉCURITÉ CUTANÉE ABSOLUE (absorption transdermique = risque réel pour le fœtus) : zéro perturbateur endocrinien (parabènes longue chaîne propyl/butyl/isopropyl, phénoxyéthanol >1%, BHA/BHT, cyclopentasiloxane D4/D5, EDTA, triclosan, oxybenzone/octocrylène), zéro rétinoïde (Retinol/Retinyl Palmitate/Retinaldehyde — formellement contre-indiqué grossesse), zéro acide salicylique >2%, zéro huile essentielle à risque (Sauge, Romarin verbénone, Menthe poivrée, Cèdre, Camphre, Anis), zéro allergène fort (Methylisothiazolinone MIT, Methylchloroisothiazolinone MCIT, Formaldéhyde/Quaternium-15), zéro sulfate agressif SLS/SLES en produit rincé court OK mais en produit non-rincé NON.
2. COHÉRENCE D'USAGE : Les alternatives doivent répondre au même BESOIN cosmétique que '{originalName}' (shampoing → shampoing doux ; crème visage → crème visage). Une formulation bio/dermo-pédiatrique EST une alternative valable.
3. MARCHÉ FRANÇAIS : Produits trouvables en parapharmacie / supermarché / Sephora France. Exclus marchés étrangers.

🚨 PRIORITÉ ABSOLUE = SÉCURITÉ. Si AUCUN produit ne respecte la règle 1, renvoie [].

⚠️ FORMAT DE RÉPONSE OBLIGATOIRE — RÈGLE ABSOLUE :
Ta réponse DOIT être un tableau JSON d'objets {"barcode":"...","reason":"..."}. AUCUN texte, AUCUN markdown avant ou après.
"reason" = phrase française percutante de 15 mots MAX expliquant pourquoi ce produit est sûr (cite l'absence d'un PE/allergène ou un label).
Exemples valides :
[{"barcode":"3401520123456","reason":"Sans parabène ni phénoxyéthanol, formulation dermo-pédiatrique."}]
[{"barcode":"3401520123456","reason":"Label Ecocert, zéro perturbateur endocrinien identifié."},{"barcode":"3600540123456","reason":"Sans sulfate ni huile essentielle à risque grossesse."}]
[]
Toute réponse non conforme sera rejetée.`;

export interface AlternativeCandidate {
  barcode: string;
  name: string;
  ingredients_raw: string;
}

/** Reason produced by the Sniper for a single picked candidate. */
export interface SniperPick {
  barcode: string;
  reason: string;
}

/**
 * Outcome distinguishing "le modèle a explicitement renvoyé []" (= vraie
 * trappe de sécurité, KPI fiabilité médicale) de tous les autres cas qui
 * produisent aussi un tableau vide (erreur infra, parse, key manquante…).
 *
 * Seul `model_empty` doit faire incrémenter le KPI safety_trap_triggered.
 */
export type SniperOutcome =
  | "success" //  ≥ 1 barcode validé
  | "model_empty" // 🚨 Claude a explicitement renvoyé [] — TRUE TRAP
  | "no_candidates" // filet vide en amont
  | "infra_error" // throw SDK (network/timeout/401/429/5xx)
  | "parse_error" // réponse non-JSON ou non-array
  | "unconfigured"; // ANTHROPIC_API_KEY manquante

export interface SniperResult {
  /** Picked barcodes — order = Claude's ranking. Kept for backward compat. */
  barcodes: string[];
  /**
   * M3 : structured picks with per-barcode safety reason (≤15 mots FR).
   * Same order as `barcodes`. Empty when outcome != "success".
   */
  picks: SniperPick[];
  outcome: SniperOutcome;
}

/**
 * Calls Claude Haiku to select up to 3 "100% safe" barcodes from a candidate
 * list. Always returns a structured `SniperResult` so that callers can
 * distinguish a true medical safety trap (`model_empty`) from infrastructure
 * or parse failures (which also yield `barcodes: []` but mean different
 * things FinOps-wise).
 */
export async function selectSafeAlternativesWithClaude(params: {
  candidates: AlternativeCandidate[];
  trimester: 1 | 2 | 3 | "breastfeeding" | "baby";
  /** Nom du produit d'origine scanné (injection prompt pour cohérence usage). */
  originalName: string;
  /** Mot-clé/catégorie recherche (cache hint ou heuristique locale). */
  searchKeyword: string;
  /** M1 : true → cosmetic prompt (perturbateurs endocriniens, allergènes,
   *  sulfates). false → food prompt (caféine, additifs E*, alcool). */
  isCosmetic: boolean;
  /** Logger requête pour émettre les métriques FinOps. */
  log?: Logger;
}): Promise<SniperResult> {
  const log = params.log ?? logger;

  if (!apiKey) {
    log.warn("ANTHROPIC_API_KEY not set — alternatives sniper returns []");
    return { barcodes: [], picks: [], outcome: "unconfigured" };
  }
  if (params.candidates.length === 0) {
    return { barcodes: [], picks: [], outcome: "no_candidates" };
  }
  // v4 — Circuit breaker : short-circuit silencieux côté alternatives (le
  // mobile n'a pas besoin de savoir, on renvoie [] comme un "rien trouvé"
  // standard, le frontend gère déjà cet état avec l'EducationalEmptyState).
  if (isBreakerOpen()) {
    log.warn("anthropic circuit open — alternatives sniper short-circuit");
    emitMetric(log, "alternatives_ai_error", {
      model: MODEL,
      error_kind: "circuit_open",
    });
    return { barcodes: [], picks: [], outcome: "infra_error" };
  }

  const phaseLabel =
    params.trimester === "breastfeeding"
      ? "stade d'allaitement"
      : params.trimester === "baby"
        ? "stade post-natal (bébé)"
        : `trimestre ${params.trimester} de sa grossesse`;

  const basePrompt = params.isCosmetic
    ? ALTERNATIVES_SYSTEM_PROMPT_COSMETIC
    : ALTERNATIVES_SYSTEM_PROMPT_FOOD;

  const systemPrompt = basePrompt.replace(
    /\{trimester\}/g,
    phaseLabel,
  )
    .replace(/\{originalName\}/g, params.originalName || "(produit inconnu)")
    .replace(
      /\{searchKeyword\}/g,
      params.searchKeyword || "(catégorie inconnue)",
    );

  // Post-CHUNK 7 review : ancienne troncature 800 chars laissait Claude
  // ignorer ~5-15 % de la fin des listes Open Food Facts (additifs en queue
  // de liste type "arôme naturel, E150c"). On passe à 2000 ce qui couvre
  // >99 % des produits OFF tout en restant largement sous la limite tokens
  // (20 candidats × 2000 ≈ 10 k tokens d'input, marge confortable).
  const userPrompt = params.candidates
    .map(
      (c, i) =>
        `${i + 1}. Code-barres: ${c.barcode}\n   Nom: ${c.name}\n   Ingrédients: ${c.ingredients_raw.slice(0, 2000)}`,
    )
    .join("\n\n");

  const t = mark();

  let response: Anthropic.Messages.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 500, // marge confortable : 3 barcodes × ~15 chars + brackets/quotes/commas reste largement sous 100 tokens, mais on laisse de l'air pour absorber un éventuel préambule markdown récalcitrant (parser regex le rattrapera ensuite).
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err) {
    const errorKind = classifyAnthropicError(err);
    recordAnthropicError(); // v4 — alimente le circuit breaker partagé
    emitMetric(log, "alternatives_ai_error", {
      ms: t(),
      model: MODEL,
      error_kind: errorKind,
    });
    alertAiError({ source: "alternatives", errorKind, model: MODEL });
    return { barcodes: [], picks: [], outcome: "infra_error" };
  }

  // Helper to emit the ai_call metric in every exit path below.
  const emitCall = (picked: number) =>
    emitMetric(log, "alternatives_ai_call", {
      ms: t(),
      model: MODEL,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      candidates: params.candidates.length,
      picked,
    });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    emitCall(0);
    return { barcodes: [], picks: [], outcome: "parse_error" };
  }

  // Resilient extraction via bracket-balanced scan (architect review M3) :
  // ni le non-greedy /\[[\s\S]*?\]/ (cut off au 1er `]` interne, foire sur
  // `[{"barcode":"...","reason":"..."}]` qui contient zéro `]` mais OK,
  // foirait sur tableaux d'objets nested), ni le greedy /\[[\s\S]*\]/
  // (over-capture si Claude ajoute du texte avec `[` après le JSON) ne
  // sont fiables. On scanne le 1er array JSON top-level en suivant la
  // profondeur des brackets ET en ignorant les `[`/`]` à l'intérieur des
  // chaînes (avec gestion des escape \").
  const raw = textBlock.text.trim();
  const jsonArray = extractFirstJsonArray(raw);
  if (!jsonArray) {
    log.warn(
      { rawOutput: raw.slice(0, 500) },
      "sniper: no JSON array found in Claude output",
    );
    emitCall(0);
    return { barcodes: [], picks: [], outcome: "parse_error" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonArray);
  } catch {
    emitCall(0);
    return { barcodes: [], picks: [], outcome: "parse_error" };
  }
  if (!Array.isArray(parsed)) {
    emitCall(0);
    return { barcodes: [], picks: [], outcome: "parse_error" };
  }

  // M3 : new format is [{barcode, reason}]. We also accept the legacy
  // string array format for graceful degradation (in case Claude regresses
  // mid-rollout) — in that case `reason` falls back to "".
  const validSet = new Set(params.candidates.map((c) => c.barcode));
  const picks: SniperPick[] = [];
  for (const item of parsed) {
    if (typeof item === "string") {
      if (validSet.has(item)) {
        picks.push({ barcode: item, reason: "" });
      }
      continue;
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const bc = typeof obj.barcode === "string" ? obj.barcode : null;
      const reason =
        typeof obj.reason === "string" ? obj.reason.trim().slice(0, 200) : "";
      if (bc && validSet.has(bc)) {
        picks.push({ barcode: bc, reason });
      }
    }
  }
  const trimmedPicks = picks.slice(0, 3);
  const barcodes = trimmedPicks.map((p) => p.barcode);

  emitCall(barcodes.length);

  // ⚠️ Distinction critique : Claude a parsé un array vide (vraie trappe)
  //    OU bien Claude a pické des barcodes hallucinés tous filtrés out.
  //    Dans les deux cas l'intention modèle = "rien de sûr" → model_empty.
  return {
    barcodes,
    picks: trimmedPicks,
    outcome: barcodes.length > 0 ? "success" : "model_empty",
  };
}

/**
 * Classifie une erreur du SDK Anthropic en une string courte pour métriques.
 *
 * Ordre important : les sous-classes connexion/timeout n'ont PAS de `status`
 * HTTP, donc le check `APIError`+status doit venir APRÈS. Cf. SDK source :
 *   - APIConnectionTimeoutError extends APIConnectionError extends APIError
 *   - APIConnectionError n'a pas de status → tomberait dans `api_unknown`.
 */
function classifyAnthropicError(err: unknown): string {
  if (err instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  if (err instanceof Anthropic.APIConnectionError) return "network";
  if (err instanceof Anthropic.RateLimitError) return "rate_limited";
  if (err instanceof Anthropic.AuthenticationError) return "unauthorized";
  if (err instanceof Anthropic.APIError) {
    if (err.status && err.status >= 500) return "server_error";
    return `api_${err.status ?? "unknown"}`;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("timeout") || msg.includes("aborted")) return "timeout";
    if (msg.includes("network") || msg.includes("econn")) return "network";
    return "other";
  }
  return "unknown";
}

/**
 * Extrait la première array JSON top-level d'un texte arbitraire en suivant
 * la profondeur des brackets et en ignorant ceux à l'intérieur des chaînes
 * (avec gestion des escapes `\"`, `\\`). Renvoie le substring exact ou null
 * si aucune array bien balancée n'est trouvée.
 *
 * Robustesse vs regex greedy/non-greedy :
 *   - Greedy `[…]` casse sur `[...] then [discarded note]` (over-capture).
 *   - Non-greedy `[…]?` casse sur `[{"a":1}, {"b":2}]` (cut au 1er `]`
 *     interne d'un objet imbriqué — pas notre cas ici mais résilience).
 *   - Cette fonction casse sur rien : O(n), une seule passe.
 */
function extractFirstJsonArray(text: string): string | null {
  const start = text.indexOf("[");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function normalizeVerdict(raw: unknown): AiVerdict {
  if (!raw || typeof raw !== "object") {
    throw new Error("Claude verdict is not an object");
  }
  const r = raw as Record<string, unknown>;
  const status = String(r.status ?? "").toLowerCase();
  if (status !== "autorise" && status !== "a_eviter" && status !== "interdit") {
    throw new Error(`Claude status invalid: ${String(r.status)}`);
  }
  const glow = Number(r.glow_score);
  if (!Number.isFinite(glow) || glow < 0 || glow > 100) {
    throw new Error(`Claude glow_score invalid: ${String(r.glow_score)}`);
  }
  return {
    status,
    glow_score: Math.round(glow),
    explanation: String(r.explanation ?? "").slice(0, 500),
    search_keyword: String(r.search_keyword ?? "").slice(0, 60),
  };
}
