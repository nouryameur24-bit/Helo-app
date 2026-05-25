/**
 * scrapers/_shared/claude_extractor.ts
 *
 * Claude-assisted product page extraction.
 *
 * Plutôt qu'écrire un parser HTML fragile par site (cassé à chaque changement
 * de layout), on file le HTML brut à Claude Haiku qui retourne un JSON
 * structuré garanti par le prompt système.
 *
 * Coût : ~$0.0005/page (Haiku 4.5 = $1/$5 per MTok, page typique 5k tokens in / 500 out).
 * Robustesse : aucun maintenance quand le site change son CSS.
 */
import Anthropic from '@anthropic-ai/sdk';

import type { ScrapedProduct } from './types.js';

const SYSTEM_PROMPT = `Tu es un extracteur de données produit pour une app de scan grossesse (Hēlo).

Tu reçois le HTML brut d'une page produit (pharmacie, marque cosmétique, ou drive supermarché FR).

Tu DOIS extraire UNIQUEMENT ces champs et retourner UN SEUL OBJET JSON :
{
  "barcode": "code EAN à 13 chiffres si présent ailleurs sinon null",
  "name": "nom commercial complet",
  "brand": "marque",
  "category": "cosmetic | food | medication",
  "ingredients_raw": "liste INCI/ingrédients EXACTE telle qu'affichée, complète et sans paraphraser",
  "image_url": "URL absolue de l'image principale ou null",
  "description_fr": "1-2 phrases descriptives FR ou null",
  "intended_use": "shampoo|conditioner|sunscreen|deodorant|body_lotion|face_cream|... ou null"
}

RÈGLES IMPÉRATIVES :
- ingredients_raw : copie-colle EXACTE depuis le HTML. NE PAS résumer, NE PAS reformuler.
- Si tu ne trouves pas un champ, mets null. Ne fais JAMAIS de fabrication.
- barcode : ne devine JAMAIS. Si pas affiché clairement, null.
- name : sans les pourcentages de réduction, sans "NOUVEAU", sans "Promo".
- Réponds UNIQUEMENT le JSON, pas de texte avant/après.`;

export interface ExtractInput {
  html: string;
  pageUrl: string;
  hintCategory?: 'cosmetic' | 'food' | 'medication';
  client: Anthropic;
}

export interface ExtractResult {
  product: Partial<ScrapedProduct> | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  error?: string;
}

const HAIKU_PRICING = { input: 1.0, output: 5.0 }; // $ per MTok

/**
 * Smart trim : si l'INCI/composition est déjà dans les premiers 80k chars,
 * on garde tel quel. Sinon, on prepend une fenêtre 8k autour du keyword.
 *
 * Logique conservative : on ne casse pas le head/title/JSON-LD du début.
 */
function smartTrim(html: string, maxChars: number): string {
  const head = html.slice(0, maxChars);
  const kw = /(composition|ingr[ée]dients?|\bINCI\b)/i;
  // Si le keyword est déjà dans les premiers maxChars, OK
  if (kw.test(head)) {
    return head;
  }
  // Sinon on cherche dans le reste et on injecte une fenêtre dans l'output
  const rest = html.slice(maxChars);
  const match = rest.match(kw);
  if (!match || match.index === undefined) {
    return head; // pas de composition trouvée du tout → tel quel
  }
  const absIdx = maxChars + match.index;
  const windowStart = Math.max(maxChars, absIdx - 1_000);
  const windowEnd = Math.min(html.length, absIdx + 8_000);
  const window = html.slice(windowStart, windowEnd);
  // On garde les premiers (maxChars - window.length) chars du head + window
  const reservedForWindow = window.length + 100; // 100 chars pour le séparateur
  const truncatedHead = head.slice(0, maxChars - reservedForWindow);
  return truncatedHead + '\n<!-- COMPOSITION SECTION (injected from later in page) -->\n' + window;
}

export async function extractWithClaude({
  html,
  pageUrl,
  hintCategory,
  client,
}: ExtractInput): Promise<ExtractResult> {
  // Smart trim ciblé sur les sections pertinentes (head + composition sections)
  // pour rester sous ~80k chars d'input tout en capturant l'INCI où qu'elle soit.
  const trimmedHtml = smartTrim(html, 80_000);

  const userMessage = `URL: ${pageUrl}
${hintCategory ? `Hint catégorie: ${hintCategory}\n` : ''}
HTML:
\`\`\`html
${trimmedHtml}
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

    // Parse strict JSON (Claude est consistent avec le system prompt)
    let parsed: Partial<ScrapedProduct>;
    try {
      // Strip code fences si présents (au cas où)
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
