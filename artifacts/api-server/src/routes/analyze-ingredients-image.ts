/**
 * routes/analyze-ingredients-image.ts — Claude Vision direct (Lot 18-10).
 *
 * LE MOAT de Hēlo vs Yuka :
 *   - Yuka utilise Google Vision OCR (classique) : transcrit pixels → texte
 *     puis matche le texte contre une base d'additifs. Pas de raisonnement.
 *   - Hēlo utilise Claude Vision (LLM multimodal) : "regarde" la photo +
 *     comprend le contexte (type de produit, marque, format INCI, doses)
 *     et retourne une liste d'ingrédients STRUCTURÉE + warnings safety.
 *
 * Différence fondamentale :
 *   OCR     → "Pa£ab3ne Methy"  (typos sur photo floue)
 *   Vision  → "Methylparaben"   (déduit du contexte malgré flou)
 *
 * Économie : Claude Haiku Vision ~$0.005/scan, 30× plus cher que Google Vision
 * mais 10× plus précis. Justifié pour audience grossesse premium (cf. CLAUDE.md
 * "high-cost tech serves high-WTP audiences").
 *
 * Pattern : output JSON strict pour parser côté mobile sans risque
 * d'hallucination textuelle.
 *
 * Sécurité : gated par requireAppSecret + rate-limit. Pas de Premium-gating
 * pour l'instant — c'est la valeur de l'app, libre pour tous les users beta.
 */

import { Router, type IRouter } from "express";
import { z } from "zod/v4";

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../lib/logger";
import { emitMetric, mark } from "../lib/metrics";
import { logClaudeApiCall } from "../lib/apiCostTracker";
import { requireAppSecret } from "../middlewares/appSecret";
import { scanRateLimit } from "../middlewares/scanRateLimit";

const router: IRouter = Router();

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = new Anthropic({
  apiKey: apiKey ?? "",
  timeout: 15000, // 15s — Vision est plus lent que pure-text
  maxRetries: 1,
});

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1500;

// ─── Validation ─────────────────────────────────────────────────────────────

const BodySchema = z.object({
  /** Image encodée en base64 (sans le préfixe `data:image/...;base64,`). */
  imageBase64: z.string().min(100).max(8_000_000), // ~6MB max après base64
  /** Format image (jpeg/png). Par défaut jpeg. */
  imageMediaType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional().default("image/jpeg"),
  /** Locale du texte attendu sur l'étiquette. */
  locale: z.enum(["fr", "en", "auto"]).optional().default("auto"),
  /** Phase de grossesse de l'utilisatrice (pour contextualiser les warnings).
   *  1=T1, 2=T2, 3=T3, "breastfeeding"=allaitement. */
  phase: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal("breastfeeding")]).optional(),
  /** Hint sur le type de produit attendu (cosmetic/food/medication). */
  hintCategory: z.enum(["cosmetic", "food", "medication", "auto"]).optional().default("auto"),
});

// ─── Prompt système ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un expert en analyse de produits cosmétiques, alimentaires et pharmaceutiques pour femmes enceintes (marché français).

Tu reçois UNE photo d'un produit (devant, dos, ou liste d'ingrédients). Ta mission : extraire les informations utiles pour un verdict de sécurité grossesse.

**Tu retournes EXCLUSIVEMENT un JSON valide** (pas de texte avant/après, pas de markdown ni d'explication). Schéma strict :

\`\`\`json
{
  "product_name": "string|null",      // Nom du produit si visible (marque + variante)
  "brand": "string|null",              // Marque si identifiable
  "category": "cosmetic|food|medication|unknown",
  "ingredients": ["string", "..."],    // Liste INCI ou ingrédients dans l'ordre de l'étiquette
  "confidence": "high|medium|low",     // Ta confiance globale dans l'extraction
  "warnings": ["string", "..."],       // Warnings safety grossesse SI tu reconnais un risque évident (rétinol, parabens, alcool, etc.)
  "notes": "string|null"               // Note libre (1 phrase max) si quelque chose est ambigu
}
\`\`\`

Règles strictes :
1. **Si la photo n'est pas lisible** (floue, mal cadrée) : confidence="low", ingredients=[], notes="raison brève".
2. **Si la photo ne montre PAS un produit consommable** : category="unknown", ingredients=[], notes="hors-scope".
3. **Corrige les typos OCR évidentes** : "Pa£abene" → "Methylparaben" si plausible.
4. **Préserve les pourcentages** s'ils sont visibles : "Aqua 60%" reste "Aqua 60%".
5. **Filtre le marketing** : "Anti-âge 24h", numéros de lot, dates ne sont PAS des ingrédients.
6. **Restaure les accents français** : "Lecithine" → "Lécithine" en contexte FR.
7. **Re-assemble les mots cassés** sur plusieurs lignes : "Buty-\\nrospermum" → "Butyrospermum".
8. **Warnings safety** : signale UNIQUEMENT les ingrédients incontestablement risqués en grossesse (rétinol, parabens, salicylates >2%, alcool >5% en boisson, plantes utérotoniques connues). Pas de faux positifs.

Exemples :

INPUT (photo claire d'une crème Mustela) :
\`\`\`json
{
  "product_name": "Mustela Crème change",
  "brand": "Mustela",
  "category": "cosmetic",
  "ingredients": ["Aqua", "Glycerin", "Butyrospermum parkii butter", "Tocopherol", "Parfum"],
  "confidence": "high",
  "warnings": [],
  "notes": null
}
\`\`\`

INPUT (photo floue d'une boîte Doliprane) :
\`\`\`json
{
  "product_name": "Doliprane 1000mg",
  "brand": "Sanofi",
  "category": "medication",
  "ingredients": ["Paracétamol"],
  "confidence": "medium",
  "warnings": [],
  "notes": "Photo floue mais identifiable au logo Sanofi"
}
\`\`\`

INPUT (photo d'un menu de resto avec tartare) :
\`\`\`json
{
  "product_name": "Tartare de boeuf à l'italienne",
  "brand": null,
  "category": "food",
  "ingredients": ["Boeuf cru haché", "Câpres", "Persil", "Échalote", "Huile d'olive"],
  "confidence": "high",
  "warnings": ["Viande crue — risque toxoplasmose et listériose en grossesse"],
  "notes": null
}
\`\`\`

INPUT (photo illisible/trop sombre) :
\`\`\`json
{
  "product_name": null,
  "brand": null,
  "category": "unknown",
  "ingredients": [],
  "confidence": "low",
  "warnings": [],
  "notes": "Photo trop sombre pour lire l'étiquette"
}
\`\`\`

JSON UNIQUEMENT. Pas de texte avant ou après le JSON.`;

// ─── Route ──────────────────────────────────────────────────────────────────

router.post("/analyze-ingredients-image", scanRateLimit, requireAppSecret, async (req, res) => {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", details: parsed.error.issues });
    return;
  }

  if (!apiKey) {
    req.log.warn("ANTHROPIC_API_KEY missing — analyze-ingredients-image unavailable");
    res.status(503).json({
      error: "ai_unavailable",
      message: "AI service not configured. Use OCR fallback.",
    });
    return;
  }

  const { imageBase64, imageMediaType, locale, phase, hintCategory } = parsed.data;
  const t = mark();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageMediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Locale : ${locale}\nPhase grossesse : ${phase ?? "non précisé"}\nCatégorie supposée : ${hintCategory}\n\nAnalyse cette photo et retourne le JSON.`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const rawOutput = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    const durationMs = t();
    emitMetric(req.log, "claude_vision_call", {
      ms: durationMs,
      model: MODEL,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    });
    // Persistance coût Claude API dans Supabase (non-fatal)
    void logClaudeApiCall({
      userId: (req as { user?: { id?: string } }).user?.id ?? null,
      endpoint: "claude_vision_call",
      model: MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      requestId: response.id,
      durationMs,
    });

    if (!rawOutput) {
      res.status(500).json({ error: "empty_response", message: "Claude returned empty output" });
      return;
    }

    // Parse + valide le JSON
    let analysis: unknown;
    try {
      // Strip markdown code fences si Claude en met malgré la consigne
      const cleaned = rawOutput
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```$/i, "")
        .trim();
      analysis = JSON.parse(cleaned);
    } catch (parseErr) {
      req.log.warn({ rawOutput, parseErr }, "Failed to parse Claude Vision JSON");
      res.status(500).json({
        error: "invalid_ai_response",
        message: "AI returned non-JSON output",
        raw: rawOutput.substring(0, 500), // pour debug, tronqué
      });
      return;
    }

    res.json({
      analysis,
      source: "claude_vision",
      latency_ms: t(),
    });
  } catch (err) {
    req.log.warn({ err }, "analyze-ingredients-image failed");
    res.status(500).json({
      error: "ai_call_failed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
