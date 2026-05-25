/**
 * routes/ocr-cleanup.ts — Endpoint AI cleanup pour le ghost capture (Lot 10).
 *
 * Contexte : quand une utilisatrice photographie une étiquette ingrédients
 * (mode OCR du ghost capture), le texte brut renvoyé par l'OCR est souvent
 * fautif : caractères mal reconnus, accents perdus, mots collés, ordre
 * cassé. Sans nettoyage, le matcher déterministe rate ~30-50 % des
 * ingrédients pourtant présents → mauvaise UX + AI fallback coûteux.
 *
 * Cette route prend le texte brut + appelle Claude Haiku avec un prompt
 * structuré pour :
 *   1. Corriger les fautes OCR évidentes
 *   2. Re-formater en liste comma-separated propre
 *   3. Garder UNIQUEMENT les ingrédients (filtrer le marketing/branding)
 *
 * Output : `{ cleanedIngredients: string }` — directement consommable par
 * `parseIngredients` côté mobile et matcher backend.
 *
 * Sécurité : gated par requireAppSecret comme /scan et /alternatives.
 * Rate-limit léger (même que scanRateLimit). Pas de Premium-gating —
 * c'est utile aux free users aussi (la valeur de l'app pour eux).
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

// ─── Anthropic client (réutilise la même clé que lib/anthropic.ts) ──────────

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = new Anthropic({
  apiKey: apiKey ?? "",
  timeout: 8000,
  maxRetries: 2,
});

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 800;

// ─── Validation ─────────────────────────────────────────────────────────────

const BodySchema = z.object({
  rawText: z.string().min(3).max(5000),
  locale: z.enum(["fr", "en", "auto"]).optional().default("auto"),
});

const SYSTEM_PROMPT = `Tu es un expert OCR cosmétique. Tu reçois un texte brut extrait par OCR d'une étiquette d'ingrédients (INCI cosmétique ou liste alimentaire FR/EN).

Ta mission : nettoyer ce texte et renvoyer UNE SEULE LIGNE avec les ingrédients séparés par des virgules, dans l'ordre de l'étiquette.

Règles strictes :
1. Corrige les fautes OCR évidentes (ex: "milx" → "milk", "Tocopnerol" → "Tocopherol", "Aaua" → "Aqua").
2. Restaure les accents perdus (ex: "Lecithine" → "Lécithine" si contexte FR).
3. Re-colle les mots cassés sur plusieurs lignes (ex: "Buty-\\nrospermum" → "Butyrospermum").
4. SUPPRIME les éléments NON-ingrédients : marque, nom du produit, marketing ("Anti-âge", "Hydratation 24h"), pictogrammes, numéros de lot, codes-barres, adresses, dates.
5. GARDE les pourcentages s'ils sont présents (ex: "Aqua 60%").
6. Si tu ne reconnais pas un mot, GARDE-le tel quel — c'est peut-être un INCI spécialisé.
7. Format de sortie : UNE LIGNE de "Ingrédient1, Ingrédient2, Ingrédient3..." — RIEN d'autre, ni intro ni explication ni JSON.

Exemples :
INPUT  : "MUSTELA bébé Crème change\\nAqua, Glyc rin, Bity-\\nrospermum park ii but-\\nter, Tocopher ol, Parfum"
OUTPUT : "Aqua, Glycérine, Butyrospermum parkii butter, Tocopherol, Parfum"

INPUT  : "INGRED ENTS: water, sodium laureth sulfat e, cocamidopropyl betaine, sodumchloride"
OUTPUT : "water, sodium laureth sulfate, cocamidopropyl betaine, sodium chloride"

INPUT  : "AVENE\\nEau Thermale Avène 80%\\nGlycérol, beurre de karité, parfum (linalool, limonene)"
OUTPUT : "Eau Thermale Avène 80%, Glycérol, Beurre de karité, Parfum, Linalool, Limonene"`;

// ─── Route ──────────────────────────────────────────────────────────────────

router.post("/ocr-cleanup", scanRateLimit, requireAppSecret, async (req, res) => {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", details: parsed.error.issues });
    return;
  }

  if (!apiKey) {
    // Anthropic non configuré → on renvoie le texte brut tel quel. L'OCR
    // côté mobile reste utilisable, on perd juste le boost de cleanup.
    req.log.warn("ANTHROPIC_API_KEY missing — returning raw OCR text");
    res.json({ cleanedIngredients: parsed.data.rawText, source: "passthrough" });
    return;
  }

  const t = mark();
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Locale: ${parsed.data.locale}\n\nTexte brut OCR :\n${parsed.data.rawText}`,
        },
      ],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    const cleaned = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    const durationMs = t();
    emitMetric(req.log, "scan_ai_call", {
      ms: durationMs,
      model: MODEL,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    });
    // Persistance coût Claude API dans Supabase (non-fatal)
    void logClaudeApiCall({
      userId: (req as { user?: { id?: string } }).user?.id ?? null,
      endpoint: "ocr_cleanup",
      model: MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      requestId: response.id,
      durationMs,
    });

    if (!cleaned) {
      // Claude n'a rien renvoyé → fallback safe
      res.json({ cleanedIngredients: parsed.data.rawText, source: "passthrough_empty" });
      return;
    }

    res.json({ cleanedIngredients: cleaned, source: "ai" });
  } catch (err) {
    req.log.warn({ err }, "ocr-cleanup AI call failed — passthrough");
    // En cas d'erreur AI, on renvoie le texte brut. Pas de 500 — l'app
    // mobile peut continuer avec le texte original.
    res.json({ cleanedIngredients: parsed.data.rawText, source: "passthrough_error" });
  }
});

export default router;
