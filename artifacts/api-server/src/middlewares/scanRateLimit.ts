import rateLimit from "express-rate-limit";

/**
 * Hard cap on /api/scan to prevent runaway Claude costs.
 * 30 requests / minute / IP is generous for legitimate scanning (a user
 * scans ~5 products max per session) while throttling abuse.
 */
export const scanRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "rate_limited", retry_after_seconds: 60 },
});
