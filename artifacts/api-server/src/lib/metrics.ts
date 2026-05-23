/**
 * lib/metrics.ts — Métriques structurées Hēlo (FinOps + fiabilité).
 *
 * Toute métrique sort comme une ligne Pino JSON avec `metric: true` pour
 * permettre un filtrage trivial en production :
 *
 *   grep '"metric":true' | jq 'select(.event=="scan_cache")'
 *
 * Évènements émis (cf. CHUNK 5 spec) :
 *
 *   - scan_cache              { hit, barcode, cacheKey }
 *   - scan_ai_call            { ms, input_tokens, output_tokens, model }
 *   - scan_ai_error           { ms, error_kind, model }
 *   - alternatives_cache      { hit, barcode, cacheKey }
 *   - alternatives_ai_call    { ms, input_tokens, output_tokens, candidates, picked, model }
 *   - alternatives_ai_error   { ms, error_kind, model }
 *   - safety_trap_triggered   { reason, barcode, cacheKey, [veto_barcode] }
 *
 * Données sensibles : on ne log JAMAIS d'ingrédients bruts, de PII, de secrets
 * ou de payloads Anthropic complets — uniquement des codes-barres, IDs courts
 * et compteurs numériques. Le redact du logger Pino bloque déjà les headers
 * `x-helo-app-secret`, mais on reste défensifs ici.
 */

import type { Logger } from "pino";

export type MetricEvent =
  | "scan_cache"
  | "scan_ai_call"
  | "scan_ai_error"
  | "alternatives_cache"
  | "alternatives_ai_call"
  | "alternatives_ai_error"
  | "safety_trap_triggered";

export type SafetyTrapReason =
  | "sniper_empty" // Claude a renvoyé [] (aucun produit 100% safe)
  | "belt_unknown" // Ceinture & Bretelles : ingrédient non reconnu
  | "belt_risk"; // Ceinture & Bretelles : danger/caution détecté

/**
 * Émet une métrique structurée. Niveau `info` (visible par défaut),
 * marqueur `metric: true` pour filtrage downstream.
 */
export function emitMetric(
  log: Logger,
  event: MetricEvent,
  fields: Record<string, unknown>,
): void {
  log.info({ metric: true, event, ...fields }, `metric:${event}`);
}

/**
 * Petit chronomètre — usage : `const t = mark(); ...; const ms = t();`
 * Retourne le temps écoulé en millisecondes arrondi à l'entier.
 */
export function mark(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}
