import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger";

const apiKey =
  process.env.ANTHROPIC_API_KEY ?? process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

if (!apiKey) {
  logger.warn("ANTHROPIC_API_KEY not set — AI fallback will fail");
}

const client = new Anthropic({ apiKey: apiKey ?? "" });

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 400; // hard cap to bound cost per call

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
}): Promise<AiVerdict> {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const response = await client.messages.create({
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
    logger.error(
      { err, raw: textBlock.text },
      "Claude returned non-JSON content",
    );
    throw new Error("Claude returned invalid JSON");
  }

  return normalizeVerdict(parsed);
}

// ─── Alternatives selector (Sniper) ─────────────────────────────────────────

const ALTERNATIVES_SYSTEM_PROMPT = `Tu es un expert en toxicologie périnatale. Voici 20 produits avec leurs listes d'ingrédients. L'utilisatrice est au trimestre {trimester} de sa grossesse.

Ta mission : Sélectionne jusqu'à 3 produits qui sont 100% SANS DANGER (zéro composant toxique, zéro risque selon les recommandations médicales).

🚨 SÉCURITÉ CRITIQUE (Trappe de Secours) : Si AUCUN produit de cette liste n'est parfaitement sûr pour ce trimestre, tu DOIS IMPÉRATIVEMENT renvoyer un tableau JSON vide []. Ne fais aucun compromis. Ne choisis pas 'le moins pire'.

Tu dois répondre UNIQUEMENT par un tableau JSON contenant les codes-barres des produits validés, ou un tableau vide. Exemple : ["123456789", "987654321"]`;

export interface AlternativeCandidate {
  barcode: string;
  name: string;
  ingredients_raw: string;
}

/**
 * Calls Claude Haiku to select up to 3 "100% safe" barcodes from a candidate
 * list. Returns [] on any failure (invalid JSON, timeout, etc.) — the empty
 * array is a valid, expected output per the strict safety policy.
 */
export async function selectSafeAlternativesWithClaude(params: {
  candidates: AlternativeCandidate[];
  trimester: 1 | 2 | 3 | "breastfeeding" | "baby";
}): Promise<string[]> {
  if (!apiKey) {
    logger.warn("ANTHROPIC_API_KEY not set — alternatives sniper returns []");
    return [];
  }
  if (params.candidates.length === 0) return [];

  const phaseLabel =
    params.trimester === "breastfeeding"
      ? "allaitement"
      : params.trimester === "baby"
        ? "bébé (post-natal)"
        : `trimestre ${params.trimester}`;

  const systemPrompt = ALTERNATIVES_SYSTEM_PROMPT.replace(
    "{trimester}",
    phaseLabel,
  );

  const userPrompt = params.candidates
    .map(
      (c, i) =>
        `${i + 1}. Code-barres: ${c.barcode}\n   Nom: ${c.name}\n   Ingrédients: ${c.ingredients_raw.slice(0, 800)}`,
    )
    .join("\n\n");

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 200, // tighter cap — output is just a tiny JSON array
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return [];

    // Resilient extraction: Claude sometimes wraps the JSON in markdown or
    // adds explanatory text after the array despite our prompt. Find the
    // first `[...]` block and parse only that.
    const raw = textBlock.text.trim();
    const match = raw.match(/\[[\s\S]*?\]/);
    if (!match) {
      logger.warn({ raw }, "sniper: no JSON array found in Claude output");
      return [];
    }
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    // Only keep barcodes that were in the candidate set (defence against
    // Claude hallucinating barcodes that don't exist).
    const validSet = new Set(params.candidates.map((c) => c.barcode));
    const barcodes = parsed
      .filter((x): x is string => typeof x === "string")
      .filter((bc) => validSet.has(bc))
      .slice(0, 3);

    return barcodes;
  } catch (err) {
    logger.warn(
      { err },
      "selectSafeAlternativesWithClaude failed — returning []",
    );
    return [];
  }
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
