/**
 * scrapers/_shared/claude_extractor.ts
 *
 * Claude-assisted product extraction depuis markdown clean (post-Firecrawl).
 *
 * Avant : HTML brut 25k tokens/page → ~$0.02/page + rate limit Anthropic Tier 1
 * Après : markdown clean ~3k tokens/page → ~$0.003/page + reste sous rate limit
 *
 * Coût Haiku 4.5 : $1/MTok input + $5/MTok output.
 * Pour Hēlo : ~3k input + ~500 output = ~$0.005/page (vs $0.02 avant Firecrawl).
 */
import Anthropic from '@anthropic-ai/sdk';

import type { ScrapedProduct } from './types.js';

const SYSTEM_PROMPT = `Tu es un extracteur de données produit pour une app de scan grossesse.

Tu reçois le contenu markdown d'une page produit (pharmacie, marque cosmétique, drive supermarché FR).

Tu DOIS extraire UNIQUEMENT ces champs et retourner UN SEUL OBJET JSON :
{
  "barcode": "code EAN à 8, 12 ou 13 chiffres si présent (cherche 'EAN', 'gencod', 'code-barres')",
  "name": "nom commercial complet (sans % réduction, sans 'NOUVEAU', sans 'Promo')",
  "brand": "marque",
  "category": "cosmetic | food | medication",
  "ingredients_raw": "liste INCI/ingrédients EXACTE telle qu'écrite, complète, sans paraphraser",
  "image_url": "URL absolue de l'image principale ou null",
  "description_fr": "1-2 phrases descriptives FR ou null",
  "intended_use": "shampoo|conditioner|sunscreen|deodorant|body_lotion|face_cream|lip_balm|toothpaste|hair_oil|makeup_remover|foundation|mascara|baby_food|milk_dairy|cheese|meat|fish|... ou null"
}

RÈGLES IMPÉRATIVES :
- ingredients_raw : copie EXACTE depuis le markdown. NE PAS résumer, NE PAS reformuler.
- Si tu ne trouves pas un champ, mets null. Ne fabrique JAMAIS.
- barcode : ne devine JAMAIS. Si pas affiché clairement, null.
- Réponds UNIQUEMENT le JSON, pas de texte avant/après.`;

export interface ExtractInput {
  /**
   * Markdown clean post-Firecrawl. Beaucoup plus compact que HTML brut
   * (~3k tokens vs 25k) → 8x moins cher.
   */
  markdown: string;
  pageUrl: string;
  /** Hint catégorie passé en system prompt pour aider Claude. */
  hintCategory?: 'cosmetic' | 'food' | 'medication';
  /** Title/description prefetched par Firecrawl, à inclure dans le prompt. */
  pageTitle?: string;
  pageDescription?: string;
  client: Anthropic;
}

export interface ExtractResult {
  product: Partial<ScrapedProduct> | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  error?: string;
}

const HAIKU_PRICING = { input: 1.0, output: 5.0 };

export async function extractWithClaude({
  markdown,
  pageUrl,
  hintCategory,
  pageTitle,
  pageDescription,
  client,
}: ExtractInput): Promise<ExtractResult> {
  // Truncate markdown au cas où certaines pages sont énormes (rare en markdown clean)
  const trimmedMarkdown = markdown.slice(0, 30_000);

  const userMessage = `URL : ${pageUrl}
${pageTitle ? `Title : ${pageTitle}\n` : ''}${pageDescription ? `Description : ${pageDescription}\n` : ''}${hintCategory ? `Hint catégorie : ${hintCategory}\n` : ''}
Markdown :
\`\`\`markdown
${trimmedMarkdown}
\`\`\`

Retourne UNIQUEMENT le JSON.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const costUsd =
      (inputTokens / 1_000_000) * HAIKU_PRICING.input +
      (outputTokens / 1_000_000) * HAIKU_PRICING.output;

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return { product: null, inputTokens, outputTokens, costUsd, error: 'no_text_block' };
    }

    let parsed: Partial<ScrapedProduct>;
    try {
      const cleaned = textBlock.text
        .replace(/^```(?:json)?\s*/, '')
        .replace(/\s*```$/, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      return {
        product: null,
        inputTokens,
        outputTokens,
        costUsd,
        error: `json_parse_failed: ${(parseErr as Error).message}`,
      };
    }

    return { product: parsed, inputTokens, outputTokens, costUsd };
  } catch (err) {
    return {
      product: null,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      error: `claude_error: ${(err as Error).message}`,
    };
  }
}
