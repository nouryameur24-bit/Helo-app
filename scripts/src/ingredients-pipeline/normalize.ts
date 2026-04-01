/**
 * normalize.ts — Send raw scraper entries to Claude Haiku for structured normalization.
 *
 * Each raw entry is sent to Claude Haiku with a specialized toxicology prompt.
 * Returns structured JSON with trimester-specific risk levels and confidence scores.
 *
 * Rate limit: max 10 req/s for Haiku (generous tier).
 * Only keeps entries with confidence "high" or "medium".
 */

import { log, RateLimiter, withRetry, sleep } from './utils.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export type RiskLevel = 'safe' | 'caution' | 'danger';
export type Confidence = 'high' | 'medium' | 'low';
export type Category = 'cosmetic' | 'food' | 'medication';

export interface NormalizedIngredient {
  name: string;
  name_inci: string;
  category: Category;
  risk_level_t1: RiskLevel;
  risk_level_t2: RiskLevel;
  risk_level_t3: RiskLevel;
  risk_level_breastfeeding: RiskLevel;
  description_fr: string;
  confidence: Confidence;
  source_raw: string;
}

// 10 req/s for Haiku
const rateLimiter = new RateLimiter(10);

const SYSTEM_PROMPT = `Tu es un expert en toxicologie de la reproduction. Pour l'ingrédient fourni, détermine le niveau de risque pendant la grossesse.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans explication:
{
  "name": "nom français",
  "name_inci": "nom INCI si applicable, sinon reprendre le nom",
  "category": "cosmetic" | "food" | "medication",
  "risk_level_t1": "safe" | "caution" | "danger",
  "risk_level_t2": "safe" | "caution" | "danger",
  "risk_level_t3": "safe" | "caution" | "danger",
  "risk_level_breastfeeding": "safe" | "caution" | "danger",
  "description_fr": "explication rassurante en 2 phrases max en français",
  "confidence": "high" | "medium" | "low"
}
Règles:
- En cas de doute, choisis le niveau de risque le plus strict (principe de précaution)
- Si aucune donnée spécifique grossesse, mets 'caution' et confidence 'low'
- 'danger' = contre-indiqué formellement (tératogène, foetotoxique, embryotoxique)
- 'caution' = données limitées, risque dose-dépendant, ou déconseillé sans être formellement contre-indiqué
- 'safe' = données rassurantes, largement utilisé sans signalement particulier de risque obstétrical
- La description_fr doit être utile pour une femme enceinte non-médecin`;

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callClaude(
  text: string,
  apiKey: string,
): Promise<NormalizedIngredient | null> {
  const messages: AnthropicMessage[] = [
    { role: 'user', content: `Ingrédient à analyser:\n${text}` },
  ];

  const body = {
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages,
  };

  const res = await withRetry(
    async () => {
      const r = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (r.status === 429) {
        const retryAfter = r.headers.get('retry-after');
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;
        await sleep(delay);
        throw new Error('429 rate limit');
      }
      if (!r.ok) throw new Error(`Anthropic HTTP ${r.status}`);
      return r;
    },
    { maxAttempts: 4, baseDelayMs: 1000, label: 'Claude Haiku' },
  );

  const json = await res.json() as {
    content?: Array<{ type: string; text: string }>;
  };
  const rawText = json.content?.[0]?.text ?? '';

  // Strip markdown code fences if present
  const cleaned = rawText.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as Partial<NormalizedIngredient>;
    // Validate required fields
    if (!parsed.name || !parsed.risk_level_t1 || !parsed.confidence) return null;
    return parsed as NormalizedIngredient;
  } catch {
    return null;
  }
}

type RawEntry = {
  name_inci?: string;
  name?: string;
  cas_number?: string;
  function?: string;
  restriction_text?: string;
  e_number?: string;
  category?: string;
  adi?: string;
  warnings_text?: string;
  risk_text_fr?: string;
  breastfeeding_text?: string;
  active_substance?: string;
  pregnancy_warning?: string;
  source: string;
};

function buildRawText(entry: RawEntry): string {
  const parts: string[] = [];
  if (entry.name_inci) parts.push(`Nom INCI: ${entry.name_inci}`);
  if (entry.name) parts.push(`Nom: ${entry.name}`);
  if (entry.cas_number) parts.push(`CAS: ${entry.cas_number}`);
  if (entry.function) parts.push(`Fonction cosmétique: ${entry.function}`);
  if (entry.restriction_text) parts.push(`Restriction réglementaire: ${entry.restriction_text}`);
  if (entry.e_number) parts.push(`Numéro E: ${entry.e_number}`);
  if (entry.adi) parts.push(`DJA: ${entry.adi}`);
  if (entry.warnings_text) parts.push(`Avertissements: ${entry.warnings_text}`);
  if (entry.risk_text_fr) parts.push(`Risque grossesse (CRAT): ${entry.risk_text_fr}`);
  if (entry.breastfeeding_text) parts.push(`Allaitement: ${entry.breastfeeding_text}`);
  if (entry.active_substance) parts.push(`Substance active: ${entry.active_substance}`);
  if (entry.pregnancy_warning) parts.push(`Mise en garde grossesse: ${entry.pregnancy_warning}`);
  parts.push(`Source: ${entry.source}`);
  return parts.join('\n');
}

/**
 * Normalize an array of raw scraper entries via Claude Haiku.
 * Filters out low-confidence results.
 */
export async function normalizeEntries(
  entries: RawEntry[],
  apiKey: string,
  { batchLabel = 'entries', skipLowConfidence = true } = {},
): Promise<NormalizedIngredient[]> {
  log.info(`Normalize — processing ${entries.length} ${batchLabel}…`);
  const results: NormalizedIngredient[] = [];
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const rawText = buildRawText(entry);

    try {
      await rateLimiter.acquire();
      const normalized = await callClaude(rawText, apiKey);

      if (!normalized) {
        errors++;
        continue;
      }

      if (skipLowConfidence && normalized.confidence === 'low') {
        skipped++;
        continue;
      }

      // Attach source info
      normalized.source_raw = entry.source;
      results.push(normalized);

      if ((i + 1) % 20 === 0) {
        log.info(`Normalize — ${i + 1}/${entries.length} processed (${results.length} kept)`);
      }
    } catch (err) {
      errors++;
      log.warn(`Normalize — error on entry "${entry.name_inci || entry.name}": ${String(err)}`);
    }
  }

  log.ok(
    `Normalize — done: ${results.length} kept, ${skipped} low-confidence skipped, ${errors} errors`,
  );
  return results;
}
