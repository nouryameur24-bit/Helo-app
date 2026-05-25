/**
 * lib/apiCostTracker.ts — Persistance des coûts Claude API dans Supabase.
 *
 * Pour chaque appel Anthropic SDK, on insère une ligne dans `api_usage` avec :
 *   - user_id (si dispo), endpoint (nom métier de l'appel)
 *   - model (claude-haiku-4-5, etc.)
 *   - input_tokens, output_tokens
 *   - estimated_cost_usd (calculé localement depuis le pricing)
 *   - request_id (Anthropic message id pour cross-ref)
 *   - duration_ms
 *
 * Lecture côté dashboard : `SELECT * FROM v_api_costs_daily ORDER BY day DESC;`
 *
 * ⚠️ Source de vérité officielle des coûts = https://console.anthropic.com/usage.
 * Cette table est un complément SQL pour requêtes ad-hoc (top users, coût par
 * endpoint, etc.). Le calcul local peut diverger de quelques % vs la facture
 * réelle (Anthropic applique parfois des arrondis ou des promotions).
 */
import { supabaseAdmin } from "./supabaseAdmin";
import { logger } from "./logger";

/**
 * Pricing officiel Anthropic (vérifier https://www.anthropic.com/pricing).
 * Montants en USD par million de tokens (= per-token × 1_000_000).
 *
 * À mettre à jour si Anthropic révise ses tarifs. Les ratios in/out sont
 * stables (~1:5) mais les valeurs absolues bougent.
 *
 * Dernière vérif : 25/05/2026
 */
const PRICING_PER_M_TOKENS: Record<string, { input: number; output: number }> =
  {
    "claude-haiku-4-5": { input: 1.0, output: 5.0 },
    "claude-sonnet-4-5": { input: 3.0, output: 15.0 },
    "claude-opus-4-5": { input: 15.0, output: 75.0 },
    // Compat anciens noms (au cas où un appel passe avec un model legacy)
    "claude-haiku-4": { input: 0.8, output: 4.0 },
    "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0 },
    "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  };

function computeCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const rate = PRICING_PER_M_TOKENS[model];
  if (!rate) {
    logger.warn(
      { model },
      "apiCostTracker: unknown model — cost not computed (add to PRICING_PER_M_TOKENS)",
    );
    return null;
  }
  const inCost = (inputTokens / 1_000_000) * rate.input;
  const outCost = (outputTokens / 1_000_000) * rate.output;
  return Number((inCost + outCost).toFixed(6));
}

export interface ClaudeCallLog {
  userId?: string | null;
  endpoint: string; // ex: "scan_ai_call", "alternatives_ai_call", "ocr_cleanup", "vision_analyze"
  model: string;
  inputTokens: number;
  outputTokens: number;
  requestId?: string | null;
  durationMs?: number | null;
}

/**
 * Logge un appel Claude API dans Supabase api_usage (fire-and-forget).
 *
 * Ne JAMAIS faire échouer la requête utilisateur si le logging échoue : on
 * catch + log warning. Le coût ne sera juste pas visible dans le dashboard
 * SQL ; Anthropic Console reste source de vérité.
 *
 * Audit fix : 1 retry avec backoff 500ms sur erreur transitoire (réseau,
 * pool saturé). Évite de perdre des lignes sur blip Supabase. Au-delà d'un
 * retry on abandonne — pas la peine de retry indéfiniment, ça leak du time.
 */
const RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function insertApiUsageRow(call: ClaudeCallLog, cost: number | null) {
  return supabaseAdmin.from("api_usage").insert({
    user_id: call.userId ?? "system",
    endpoint: call.endpoint,
    model: call.model,
    input_tokens: call.inputTokens,
    output_tokens: call.outputTokens,
    estimated_cost_usd: cost,
    request_id: call.requestId ?? null,
    duration_ms: call.durationMs ?? null,
  });
}

export async function logClaudeApiCall(call: ClaudeCallLog): Promise<void> {
  try {
    const cost = computeCostUsd(
      call.model,
      call.inputTokens,
      call.outputTokens,
    );

    const first = await insertApiUsageRow(call, cost);
    if (!first.error) return;

    // Retry une seule fois après un court délai si l'erreur ressemble à du transitoire
    // (network / timeout / pool exhaustion). PostgreSQL constraint errors (unique,
    // FK) n'ont pas besoin de retry — mais le coût d'un retry inutile reste faible.
    logger.warn(
      {
        error: first.error.message,
        endpoint: call.endpoint,
        model: call.model,
        attempt: 1,
      },
      "apiCostTracker: insert failed, retrying once",
    );
    await sleep(RETRY_DELAY_MS);
    const retry = await insertApiUsageRow(call, cost);
    if (retry.error) {
      logger.warn(
        {
          error: retry.error.message,
          endpoint: call.endpoint,
          model: call.model,
          attempt: 2,
        },
        "apiCostTracker: insert failed after retry (giving up — non-fatal)",
      );
    }
  } catch (err) {
    logger.warn(
      { err, endpoint: call.endpoint },
      "apiCostTracker: unexpected error (non-fatal)",
    );
  }
}
