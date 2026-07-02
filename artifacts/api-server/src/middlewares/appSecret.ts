import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

const expected = process.env.HELO_APP_SECRET;

if (!expected) {
  logger.warn(
    "HELO_APP_SECRET not set — /api/scan will reject ALL requests until configured",
  );
}

/**
 * Comparaison de secrets à temps constant (audit #3). Le `!==` naïf permet en
 * théorie une timing attack byte-par-byte sur le secret. `timingSafeEqual`
 * exige des buffers de même longueur — le check de longueur préalable leake
 * uniquement la longueur, pas le contenu (acceptable). Partagé avec le
 * cron gate de recalls-poll.
 */
export function secretsEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Shared-secret gate between the Hēlo mobile app and the backend.
 * The mobile sends `x-helo-app-secret: <secret>` on every /api/scan request.
 * Without this header (or with the wrong value) → 401.
 *
 * This is not bulletproof (the secret ships in the mobile bundle), but it
 * blocks 99% of casual abuse and prevents random scrapers from burning our
 * Claude credits.
 */
export function requireAppSecret(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const provided = req.header("x-helo-app-secret");
  if (!expected || !provided || !secretsEqual(provided, expected)) {
    req.log?.warn({ hasHeader: Boolean(provided) }, "app secret rejected");
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}
