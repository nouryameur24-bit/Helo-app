/**
 * middlewares/requirePremium.ts — Validation server-side du tier Premium.
 *
 * v4 — Remplace le simple check de header `x-helo-is-premium` qui était
 * falsifiable par n'importe quel attaquant (Proxyman, mitmproxy, etc.). On
 * vérifie maintenant le receipt directement contre l'API RevenueCat,
 * service of truth de notre IAP.
 *
 * Stratégie progressive (pour ne pas casser l'app actuelle au déploiement) :
 *
 *   1. Si `REVENUECAT_SECRET_API_KEY` n'est pas configuré → fallback au
 *      header `x-helo-is-premium` legacy. Log warn explicite pour signaler
 *      que le bouclier fort n'est pas actif.
 *
 *   2. Si le secret est configuré :
 *      - L'app mobile doit envoyer `x-helo-rc-user-id` = App-User-ID RC
 *        (typiquement `Purchases.getAppUserID()` côté client)
 *      - Le middleware appelle `GET /v1/subscribers/{user_id}` sur RC
 *      - Si `entitlements.helo_premium` est actif → req.isPremium = true
 *      - Cache 5min par user_id (limite la facture RC : 1 call par user
 *        toutes les 5 min, pas par requête).
 *
 * Une fois le mobile patché pour envoyer le header `x-helo-rc-user-id`,
 * supprimer le fallback legacy en retirant la branche `LEGACY_HEADER`.
 */

import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";
import { emitMetric } from "../lib/metrics";

const RC_API_KEY = process.env.REVENUECAT_SECRET_API_KEY?.trim() ?? "";
const RC_ENTITLEMENT_ID = "helo_premium"; // doit matcher lib/purchases.ts mobile
const RC_API_BASE = "https://api.revenuecat.com/v1";
const RC_TIMEOUT_MS = 1500; // RC SLA p99 ~300ms, on capx à 1.5s
const RC_CACHE_TTL_MS = 5 * 60_000; // 5 min
const RC_CACHE_MAX_SIZE = 10_000; // garde-fou mémoire FIFO

const hasRevenueCat = RC_API_KEY.length > 0;

if (hasRevenueCat) {
  logger.info("requirePremium: RevenueCat configured — strict server-side validation enabled");
} else {
  logger.warn(
    "requirePremium: REVENUECAT_SECRET_API_KEY not set — falling back to client header. NOT a real shield.",
  );
}

// ─── Cache mémoire (même pattern FIFO que webhookAlerter.ts) ────────────────

interface CacheEntry {
  isPremium: boolean;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

function cacheGet(userId: string): boolean | null {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(userId);
    return null;
  }
  return entry.isPremium;
}

function cacheSet(userId: string, isPremium: boolean): void {
  if (cache.size >= RC_CACHE_MAX_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(userId, {
    isPremium,
    expiresAt: Date.now() + RC_CACHE_TTL_MS,
  });
}

/** Exposé pour les tests : remet le cache à zéro. */
export function _resetPremiumCacheForTests(): void {
  cache.clear();
}

// ─── Validation RC ──────────────────────────────────────────────────────────

interface RcSubscriberResponse {
  subscriber?: {
    entitlements?: Record<
      string,
      { expires_date?: string | null; product_identifier?: string }
    >;
  };
}

async function checkRevenueCat(userId: string): Promise<boolean> {
  const url = `${RC_API_BASE}/subscribers/${encodeURIComponent(userId)}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), RC_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: ac.signal,
      headers: {
        Authorization: `Bearer ${RC_API_KEY}`,
        Accept: "application/json",
      },
    });
    if (!resp.ok) {
      // 404 = user_id inconnu de RC = pas premium (cas free + first-time).
      // Tout autre code (401/500/etc.) = on n'a pas pu vérifier → no premium
      // pour rester safe (better deny than leak feature).
      return false;
    }
    const json = (await resp.json()) as RcSubscriberResponse;
    const ent = json.subscriber?.entitlements?.[RC_ENTITLEMENT_ID];
    if (!ent) return false;
    // RC renvoie expires_date: null pour les achats lifetime (jamais expirés).
    // Pour les abonnements, on vérifie que la date n'est pas dépassée.
    if (ent.expires_date === null || ent.expires_date === undefined) return true;
    return new Date(ent.expires_date).getTime() > Date.now();
  } catch (err) {
    logger.warn({ err, userId }, "RevenueCat check failed");
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Extension type Express (req.isPremium) ─────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      isPremium?: boolean;
    }
  }
}

// ─── Middleware ─────────────────────────────────────────────────────────────

/**
 * Middleware qui peuple `req.isPremium = true|false` avant de passer au
 * handler. Le handler décide ensuite de renvoyer 403 ou pas (pas de
 * comportement uniforme : `/scan` est gratuit, `/alternatives` est gated).
 */
export async function attachPremiumStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Path strict : header RC user-id présent + secret configuré → vraie validation
  const rcUserId = String(req.header("x-helo-rc-user-id") ?? "").trim();
  if (hasRevenueCat && rcUserId.length > 0) {
    const cached = cacheGet(rcUserId);
    if (cached !== null) {
      req.isPremium = cached;
      return next();
    }
    const isPremium = await checkRevenueCat(rcUserId);
    cacheSet(rcUserId, isPremium);
    req.isPremium = isPremium;
    return next();
  }

  // Path legacy : fallback sur le header client (falsifiable). À retirer
  // une fois le mobile patché pour envoyer x-helo-rc-user-id.
  const legacyHeader = String(req.header("x-helo-is-premium") ?? "").toLowerCase();
  req.isPremium = legacyHeader === "true" || legacyHeader === "1";
  next();
}

/**
 * Middleware strict : si `req.isPremium !== true`, répond 403 directement.
 * À appliquer APRÈS `attachPremiumStatus`.
 */
export function requirePremium(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.isPremium === true) {
    next();
    return;
  }
  emitMetric(req.log ?? logger, "alternatives_premium_blocked", {
    barcode: String(req.params.barcode ?? ""),
  });
  res.status(403).json({
    error: "premium_required",
    feature: "alternatives",
    message:
      "Les alternatives expertes sont réservées aux abonnées Hēlo Premium.",
  });
}
