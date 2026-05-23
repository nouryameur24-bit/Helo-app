/**
 * lib/webhookAlerter.ts — Alerting fire-and-forget vers Discord/Slack
 *                        avec throttling/déduplication en mémoire.
 *
 * Lit `METRICS_WEBHOOK_URL` au module load. Si l'env var est absente,
 * toutes les fonctions `alert*` sont des no-op silencieux.
 *
 * ─── Garanties critiques ────────────────────────────────────────────────────
 *
 *   1. FIRE & FORGET : aucune fonction publique n'`await` l'HTTP call. Elles
 *      retournent `void` immédiatement, lancent la requête en arrière-plan,
 *      attrapent toutes les erreurs (réseau, timeout, 5xx Discord) et les
 *      log en `warn`. Aucune erreur ne peut remonter au call site.
 *
 *   2. TIMEOUT BORNÉ : 3s max via AbortController.
 *
 *   3. ZÉRO PII : seuls les codes-barres, IDs, error_kind et nom de modèle
 *      passent dans le message. Pas d'ingrédients, pas de prompts.
 *
 *   4. THROTTLING / DEDUPLICATION (CHUNK 7) : protège le channel contre le
 *      spam en cas de panne prolongée d'Anthropic ou de scan massif d'un
 *      même mauvais produit. Voir la section THROTTLING ci-dessous.
 *
 * ─── Détection automatique du format de payload ─────────────────────────────
 *   - Hostname Slack officiel → `{ text }`
 *   - Sinon (Discord par défaut) → `{ content }`
 */

import { logger } from "./logger";

const WEBHOOK_URL = process.env.METRICS_WEBHOOK_URL?.trim() ?? "";
const WEBHOOK_TIMEOUT_MS = 3_000;

export const isWebhookConfigured = WEBHOOK_URL.length > 0;

// ─── Slack vs Discord detection ──────────────────────────────────────────────
// Hostname allowlist (pas substring : évite `myslack-clone.com` faux positif).
const SLACK_HOSTS = new Set(["hooks.slack.com", "hooks.slack-gov.com"]);
const isSlack = (() => {
  if (!isWebhookConfigured) return false;
  try {
    return SLACK_HOSTS.has(new URL(WEBHOOK_URL).hostname.toLowerCase());
  } catch {
    logger.warn("METRICS_WEBHOOK_URL is not a valid URL — assuming Discord");
    return false;
  }
})();

if (isWebhookConfigured) {
  logger.info(
    { format: isSlack ? "slack" : "discord" },
    "metrics webhook configured — alerting enabled",
  );
} else {
  logger.info("METRICS_WEBHOOK_URL not set — alerting disabled (no-op)");
}

// ─── THROTTLING / DEDUPLICATION ──────────────────────────────────────────────
//
// On garde en RAM la dernière date d'envoi par clé de dédup. Si la même clé
// est re-déclenchée avant l'expiration du TTL, l'alerte est silencieusement
// droppée (pas de log warn — c'est le comportement attendu, pas une erreur).
//
// Clés composites par type :
//   - AI errors    : "ai_error:<source>:<errorKind>"   (TTL 5 min)
//                    → 50 timeouts/min sur /api/scan = 1 seule alerte
//   - Safety traps : "safety_trap:<reason>:<barcode>"  (TTL 1 min)
//                    → 10 personnes scannent le même mauvais produit = 1 alerte
//
// Mémoire HARD-BORNÉE par éviction FIFO O(1).
//
// `Map` en JS itère dans l'ordre d'insertion : `lastSentAt.keys().next()`
// donne donc l'entrée la plus anciennement insérée, qu'on évince en O(1).
// Pour conserver l'ordre FIFO correct quand on rafraîchit une clé, on la
// delete avant de la re-set (sinon elle reste à sa position d'origine et
// notre éviction la pénaliserait à tort).
//
// Avantages vs full-sweep purge :
//   - Hard cap garanti : la Map ne dépasse JAMAIS THROTTLE_MAX_KEYS
//     (mitige le DoS par flood de clés uniques : codes-barres aléatoires
//     d'un attaquant).
//   - Aucune itération O(n) sur le request path : pas de spike CPU.
//   - Pas de setInterval/timer non-unref qui empêcherait Node de s'arrêter.

const AI_ERROR_TTL_MS = 5 * 60_000; // 5 minutes
const SAFETY_TRAP_TTL_MS = 60_000; //  1 minute
const THROTTLE_MAX_KEYS = 10_000;

const lastSentAt = new Map<string, number>();

/**
 * Retourne `true` si l'alerte peut être envoyée (clé absente ou TTL expiré),
 * et marque la clé comme "envoyée maintenant". Retourne `false` si on est
 * encore dans la fenêtre de silence → l'appelant doit dropper l'alerte.
 *
 * Complexité : strictement O(1) — pas d'itération sur la Map.
 */
function shouldSend(key: string, ttlMs: number): boolean {
  const now = Date.now();
  const last = lastSentAt.get(key);
  if (last !== undefined) {
    if (now - last < ttlMs) {
      return false; // encore dans la fenêtre de silence
    }
    // TTL expiré : on supprime puis ré-insère pour que la clé "rafraîchie"
    // soit la plus récente dans l'ordre FIFO (évite qu'on l'évince à tort
    // alors qu'elle vient juste d'être réémise).
    lastSentAt.delete(key);
  }
  // Hard cap par éviction FIFO O(1). On ne dépasse JAMAIS le seuil.
  if (lastSentAt.size >= THROTTLE_MAX_KEYS) {
    const oldest = lastSentAt.keys().next().value;
    if (oldest !== undefined) lastSentAt.delete(oldest);
  }
  lastSentAt.set(key, now);
  return true;
}

/** Exposé pour les tests : remet le throttler à zéro. */
export function _resetThrottleForTests(): void {
  lastSentAt.clear();
}

// ─── Plomberie HTTP ──────────────────────────────────────────────────────────

/** Helper paranoïaque : log.warn ne peut JAMAIS faire rejeter la promesse
 *  background. Si pino lui-même throw (transport cassé, FS plein…), on
 *  swallow. Le call site est déjà en train de répondre à l'utilisatrice. */
function safeWarn(payload: unknown, msg: string): void {
  try {
    logger.warn(payload, msg);
  } catch {
    // Last resort: nothing to do. We cannot let an exception escape here.
  }
}

function buildPayload(message: string): Record<string, string> {
  return isSlack ? { text: message } : { content: message };
}

/**
 * Pousse réellement le message vers le webhook. Privée : tous les call sites
 * doivent passer par `alertAiError` ou `alertSafetyTrap` pour garantir que le
 * throttling est appliqué (impossible d'oublier le throttle en oubliant la clé).
 */
function sendAlertRaw(message: string): void {
  if (!isWebhookConfigured) return;
  void postWebhookSafely(message);
}

async function postWebhookSafely(message: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(message)),
      signal: controller.signal,
    });
    if (!res.ok) {
      safeWarn(
        { status: res.status },
        "metrics webhook returned non-2xx — alert dropped",
      );
    }
  } catch (err) {
    safeWarn({ err }, "metrics webhook delivery failed — alert dropped");
  } finally {
    clearTimeout(timer);
  }
}

// ─── API publique : 2 fonctions throttlées par construction ──────────────────

/**
 * Alerte d'erreur infra Anthropic (timeout, 429, 5xx…).
 * Throttlée à 1 alerte par (source, error_kind) toutes les 5 minutes.
 */
export function alertAiError(params: {
  source: "scan" | "alternatives";
  errorKind: string;
  model: string;
}): void {
  if (!isWebhookConfigured) return;

  const key = `ai_error:${params.source}:${params.errorKind}`;
  if (!shouldSend(key, AI_ERROR_TTL_MS)) return; // silence gracieux

  const route = params.source === "scan" ? "`/api/scan`" : "`/api/alternatives`";
  const message = [
    `🔴 **Erreur API Anthropic**`,
    `**Route** : ${route}`,
    `**Type** : \`${params.errorKind}\``,
    `**Modèle** : \`${params.model}\``,
  ].join("\n");

  sendAlertRaw(message);
}

/**
 * Alerte de trappe de sécurité médicale (sniper_empty, belt_unknown,
 * belt_risk). Throttlée à 1 alerte par (reason, barcode) toutes les minutes.
 *
 * Choix de clé : on dédup par barcode (et pas par cacheKey) parce que si
 * 10 utilisatrices scannent le même produit pour 10 trimestres différents
 * en 30 secondes, c'est probablement la même Nutella problématique — pas
 * besoin de 10 pings Discord. La granularité par phase reste visible dans
 * les logs Pino.
 */
export function alertSafetyTrap(params: {
  reason: "sniper_empty" | "belt_unknown" | "belt_risk";
  barcode: string;
  cacheKey: string;
}): void {
  if (!isWebhookConfigured) return;

  const key = `safety_trap:${params.reason}:${params.barcode}`;
  if (!shouldSend(key, SAFETY_TRAP_TTL_MS)) return; // silence gracieux

  const message = [
    `🛡️ **Trappe de Sécurité Activée**`,
    `**Raison** : \`${params.reason}\``,
    `**Code-barres** : \`${params.barcode}\``,
    `**Contexte** : \`${params.cacheKey}\``,
  ].join("\n");

  sendAlertRaw(message);
}
