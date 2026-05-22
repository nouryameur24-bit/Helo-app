/**
 * lib/scanLimit.ts — Daily scan counter for free users
 *
 * FREE tier: 5 scans / 24h (server-enforced via `scan-quota` edge function).
 * Trigger paywall on the 6th scan attempt.
 *
 * The SERVER is the source of truth (api_usage table + consume_api_quota RPC),
 * which is atomic and survives reinstall / device wipe / rooted device edits.
 *
 * AsyncStorage is kept as a fast cache for instant paywall UX and as the
 * fallback when the user is offline (graceful degradation, no Premium leak
 * worse than today's pure-client implementation).
 *
 * AsyncStorage schema:
 *   @helo_scan_limit → JSON { date: 'YYYY-MM-DD', count: number }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { STORAGE_KEYS } from '@/lib/storageKeys';

const LIMIT_KEY = STORAGE_KEYS.scanLimit;
export const FREE_SCAN_LIMIT = 5;

interface ScanLimitData {
  date: string;
  count: number;
}

export interface ConsumeScanQuotaResult {
  allowed: boolean;
  remaining: number;
  source: 'server' | 'local';
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function readLimit(): Promise<ScanLimitData> {
  try {
    const raw = await AsyncStorage.getItem(LIMIT_KEY);
    if (!raw) return { date: todayString(), count: 0 };
    const parsed: ScanLimitData = JSON.parse(raw);
    if (parsed.date !== todayString()) {
      return { date: todayString(), count: 0 };
    }
    return parsed;
  } catch {
    return { date: todayString(), count: 0 };
  }
}

async function writeLimit(data: ScanLimitData): Promise<void> {
  try {
    await AsyncStorage.setItem(LIMIT_KEY, JSON.stringify(data));
  } catch {
    // Non-blocking
  }
}

/** Returns today's scan count from the local cache (UI-only). */
export async function getDailyScanCount(): Promise<number> {
  const data = await readLimit();
  return data.count;
}

/** Local-only check used by tests and as the offline fallback path. */
export async function canScanFree(): Promise<boolean> {
  const data = await readLimit();
  return data.count < FREE_SCAN_LIMIT;
}

/**
 * Increments the local counter and returns the NEW count.
 * Used by tests and as the offline fallback. The server-side counter is
 * incremented separately by the `scan-quota` edge function.
 */
export async function incrementScanCount(): Promise<number> {
  const data = await readLimit();
  const updated: ScanLimitData = { date: todayString(), count: data.count + 1 };
  await writeLimit(updated);
  return updated.count;
}

/**
 * Atomically check + consume one scan quota slot.
 *
 * Server-first: calls the `scan-quota` edge function (authoritative). On
 * success, mirrors the count into the local cache for UI. On network failure,
 * falls back to the local cache (same behaviour as before this change, so
 * offline scans keep working — no regression).
 *
 * Caller is responsible for the `isPremium` short-circuit (premium users
 * should not call this function at all).
 */
export async function consumeScanQuota(): Promise<ConsumeScanQuotaResult> {
  try {
    const { data, error } = await supabase.functions.invoke<{
      allowed: boolean;
      remaining: number;
    }>('scan-quota', { method: 'POST', body: {} });

    // 429 from edge functions surfaces as `error` with context.status === 429.
    // Treat any non-2xx as "server says no" (NOT as "fallback to local"), so
    // a free user who hit the cap can't bypass by simulating an error.
    if (error) {
      // FunctionsHttpError exposes context.response for status inspection.
      const status =
        (error as unknown as { context?: { status?: number } })?.context
          ?.status ?? 0;
      if (status === 429) {
        await writeLimit({ date: todayString(), count: FREE_SCAN_LIMIT });
        return { allowed: false, remaining: 0, source: 'server' };
      }
      if (status === 401 || status === 403) {
        // Auth not ready — best effort local fallback (rare race at cold start).
        return await consumeScanQuotaLocal();
      }
      // 5xx / network → graceful degradation to local cache.
      return await consumeScanQuotaLocal();
    }

    if (data && data.allowed) {
      const localUsed = FREE_SCAN_LIMIT - Math.max(0, data.remaining);
      await writeLimit({ date: todayString(), count: localUsed });
      return { allowed: true, remaining: data.remaining, source: 'server' };
    }

    // Defensive: server returned 200 with allowed:false (shouldn't happen).
    await writeLimit({ date: todayString(), count: FREE_SCAN_LIMIT });
    return { allowed: false, remaining: 0, source: 'server' };
  } catch {
    return await consumeScanQuotaLocal();
  }
}

async function consumeScanQuotaLocal(): Promise<ConsumeScanQuotaResult> {
  const current = await readLimit();
  if (current.count >= FREE_SCAN_LIMIT) {
    return { allowed: false, remaining: 0, source: 'local' };
  }
  const next = current.count + 1;
  await writeLimit({ date: todayString(), count: next });
  return {
    allowed: true,
    remaining: Math.max(0, FREE_SCAN_LIMIT - next),
    source: 'local',
  };
}

/** Resets the LOCAL counter only (DEV tool). Server counter rolls itself over 24h. */
export async function resetScanLimit(): Promise<void> {
  await writeLimit({ date: todayString(), count: 0 });
}
