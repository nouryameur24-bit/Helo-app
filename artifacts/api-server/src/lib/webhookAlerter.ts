/**
 * lib/webhookAlerter.ts — Alerting fire-and-forget vers Discord/Slack.
 *
 * Lit `METRICS_WEBHOOK_URL` au module load. Si l'env var est absente,
 * `sendAlert()` est un no-op silencieux (zéro overhead, zéro log).
 *
 * Garanties critiques (cahier des charges CHUNK 6) :
 *
 *   1. FIRE & FORGET : `sendAlert()` ne `await` JAMAIS l'HTTP call. Elle
 *      retourne `void` immédiatement, lance la requête en arrière-plan,
 *      attrape toutes les erreurs (réseau, timeout, 5xx Discord) et les
 *      log en `warn`. Aucune erreur ne peut remonter au call site et
 *      polluer la réponse user.
 *
 *   2. TIMEOUT BORNÉ : 3s max via AbortController. Si Discord rame, on
 *      abandonne sans bloquer le pool d'event loop.
 *
 *   3. ZÉRO PII : seuls les codes-barres, IDs, error_kind et nom de modèle
 *      passent dans le message. Pas d'ingrédients, pas de prompts.
 *
 * Détection automatique du format de payload :
 *   - URL contient "slack" → `{ text }`
 *   - sinon (Discord par défaut) → `{ content }`
 *
 * Les deux services acceptent aussi le format de l'autre dans une certaine
 * mesure, mais on fait propre pour rendre le rendu Markdown natif.
 */

import { logger } from "./logger";

const WEBHOOK_URL = process.env.METRICS_WEBHOOK_URL?.trim() ?? "";
const WEBHOOK_TIMEOUT_MS = 3_000;

export const isWebhookConfigured = WEBHOOK_URL.length > 0;

/**
 * Détection robuste du service cible via hostname parsing (et pas substring,
 * qui matcherait `myslack-clone.com` à tort). Slack publie ses webhooks sur
 * `hooks.slack.com` (commercial) et `hooks.slack-gov.com` (gov cloud). Tout
 * autre hostname → Discord par défaut (couvre discord.com + proxys custom).
 */
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

/** Détecte le format de payload attendu par le service cible. */
function buildPayload(message: string): Record<string, string> {
  return isSlack ? { text: message } : { content: message };
}

/**
 * Envoie un message au webhook. **Fire-and-forget** : retourne immédiatement,
 * la requête HTTP part en arrière-plan. Ne lance jamais, ne bloque jamais.
 *
 * Si `METRICS_WEBHOOK_URL` n'est pas défini, est un no-op silencieux.
 */
export function sendAlert(message: string): void {
  if (!isWebhookConfigured) return;

  // Lance la requête sans attendre. Le `void` explicite documente
  // l'intention pour les linters et les futurs lecteurs.
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
    // Toute erreur (timeout, DNS, réseau, abort) → warn only, never throw.
    safeWarn({ err }, "metrics webhook delivery failed — alert dropped");
  } finally {
    clearTimeout(timer);
  }
}

// ─── Formatters ──────────────────────────────────────────────────────────────
// Centralisés ici pour garder un rendu cohérent entre toutes les alertes,
// et pour qu'on puisse ajuster le format Markdown à un seul endroit.

export function formatAiErrorAlert(params: {
  source: "scan" | "alternatives";
  errorKind: string;
  model: string;
}): string {
  const route = params.source === "scan" ? "`/api/scan`" : "`/api/alternatives`";
  return [
    `🔴 **Erreur API Anthropic**`,
    `**Route** : ${route}`,
    `**Type** : \`${params.errorKind}\``,
    `**Modèle** : \`${params.model}\``,
  ].join("\n");
}

export function formatSafetyTrapAlert(params: {
  reason: string;
  barcode: string;
  cacheKey: string;
}): string {
  return [
    `🛡️ **Trappe de Sécurité Activée**`,
    `**Raison** : \`${params.reason}\``,
    `**Code-barres** : \`${params.barcode}\``,
    `**Contexte** : \`${params.cacheKey}\``,
  ].join("\n");
}
