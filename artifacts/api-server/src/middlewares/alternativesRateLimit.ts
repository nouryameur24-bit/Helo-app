import rateLimit from "express-rate-limit";

/**
 * Hard cap on /api/alternatives to bound Claude Haiku cost.
 *
 * Tighter than /api/scan because every cache MISS = a Claude call, and
 * legitimate usage is much rarer (only triggered on user click on a
 * caution/danger verdict). A real user clicks "Voir les alternatives"
 * 1–3× per session. 10 req/min/IP leaves plenty of headroom for
 * legitimate use while throttling automated abuse.
 *
 * Note: the mobile-shipped x-helo-app-secret can be extracted from the
 * binary, so we cannot rely on it alone for cost control.
 */
export const alternativesRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "rate_limited", retry_after_seconds: 60 },
});
