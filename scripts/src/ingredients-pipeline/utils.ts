/**
 * utils.ts — Shared helpers: rate limiter, logger, retry logic, shared types.
 */

// ─── Core types ───────────────────────────────────────────────────────────────
export type RiskLevel = 'safe' | 'caution' | 'danger';
export type Confidence = 'high' | 'medium' | 'low';
export type Category = 'cosmetic' | 'food' | 'medication';

/**
 * A fully pre-computed ingredient ready for direct insertion into Supabase.
 * No normalization step required.
 */
export interface PreComputedIngredient {
  name: string;
  name_inci: string;
  category: Category;
  risk_level_t1: RiskLevel;
  risk_level_t2: RiskLevel;
  risk_level_t3: RiskLevel;
  risk_level_breastfeeding: RiskLevel;
  description_fr: string;
  confidence: Confidence;
  source_raw: string;
}

// Shorthand builder helpers for dense data entry
export type RiskTuple = [RiskLevel, RiskLevel, RiskLevel, RiskLevel]; // [t1, t2, t3, bf]

export function ing(
  name_inci: string,
  name: string,
  category: Category,
  risks: RiskTuple,
  description_fr: string,
  source_raw: string,
  confidence: Confidence = 'high',
): PreComputedIngredient {
  return {
    name_inci,
    name,
    category,
    risk_level_t1: risks[0],
    risk_level_t2: risks[1],
    risk_level_t3: risks[2],
    risk_level_breastfeeding: risks[3],
    description_fr,
    confidence,
    source_raw,
  };
}

// ─── Logger ───────────────────────────────────────────────────────────────────
export const log = {
  info: (msg: string, ...args: unknown[]) =>
    console.log(`[${new Date().toISOString()}] ℹ  ${msg}`, ...args),
  ok: (msg: string, ...args: unknown[]) =>
    console.log(`[${new Date().toISOString()}] ✓  ${msg}`, ...args),
  warn: (msg: string, ...args: unknown[]) =>
    console.warn(`[${new Date().toISOString()}] ⚠  ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) =>
    console.error(`[${new Date().toISOString()}] ✗  ${msg}`, ...args),
};

// ─── Rate limiter ─────────────────────────────────────────────────────────────
export class RateLimiter {
  private queue: Array<() => void> = [];
  private running = 0;

  constructor(
    private readonly maxPerSecond: number,
    private readonly minDelayMs: number = 0,
  ) {}

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      const tryRun = () => {
        if (this.running < this.maxPerSecond) {
          this.running++;
          const delay = this.minDelayMs > 0 ? this.minDelayMs : 1000 / this.maxPerSecond;
          setTimeout(() => {
            this.running--;
            if (this.queue.length > 0) this.queue.shift()!();
          }, delay);
          resolve();
        } else {
          this.queue.push(tryRun);
        }
      };
      tryRun();
    });
  }
}

// ─── Retry with exponential backoff ───────────────────────────────────────────
export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxAttempts = 3, baseDelayMs = 500, label = 'operation' }: {
    maxAttempts?: number;
    baseDelayMs?: number;
    label?: string;
  } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRetryable = err instanceof Error &&
        (err.message.includes('429') || err.message.includes('503') || err.message.includes('ECONNRESET'));
      if (!isRetryable || attempt === maxAttempts) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      log.warn(`${label} — attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
  throw lastError;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

export function normalizeINCIName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 15_000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
