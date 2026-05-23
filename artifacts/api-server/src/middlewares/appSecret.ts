import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

const expected = process.env.HELO_APP_SECRET;

if (!expected) {
  logger.warn(
    "HELO_APP_SECRET not set — /api/scan will reject ALL requests until configured",
  );
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
  if (!expected || !provided || provided !== expected) {
    req.log?.warn({ hasHeader: Boolean(provided) }, "app secret rejected");
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}
