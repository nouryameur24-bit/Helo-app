/**
 * lib/errors.ts — Typed errors shared across libs.
 *
 * Use `RateLimitError` whenever an Edge Function returns HTTP 429 so the UI
 * can surface a consistent message and (later) hook into the Premium upsell.
 */

export class RateLimitError extends Error {
  readonly code = 'RATE_LIMIT' as const;
  constructor(message = 'Vous avez atteint votre limite quotidienne. Réessayez demain.') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export function isRateLimitError(err: unknown): err is RateLimitError {
  return err instanceof RateLimitError
    || (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'RATE_LIMIT');
}

/**
 * Inspects a Supabase Edge Function error object and returns the HTTP status
 * if available. Supabase wraps non-2xx responses in `FunctionsHttpError` with
 * `error.context` being the Response object.
 */
export async function extractFunctionStatus(error: unknown): Promise<number | null> {
  if (!error || typeof error !== 'object') return null;
  const ctx = (error as { context?: unknown }).context;
  if (!ctx || typeof ctx !== 'object') return null;
  // Supabase JS v2: context is a Response
  if (typeof (ctx as Response).status === 'number') {
    return (ctx as Response).status;
  }
  // Older shape: { status, response }
  const status = (ctx as { status?: number }).status;
  return typeof status === 'number' ? status : null;
}

/**
 * Reads the JSON error body from a Supabase Edge Function error (best-effort).
 */
export async function extractFunctionErrorBody(error: unknown): Promise<{ error?: string } | null> {
  if (!error || typeof error !== 'object') return null;
  const ctx = (error as { context?: unknown }).context;
  if (!ctx || typeof ctx !== 'object') return null;
  const ctxResp = ctx as Response;
  if (typeof ctxResp.json !== 'function') return null;
  try {
    return await ctxResp.json();
  } catch {
    return null;
  }
}
