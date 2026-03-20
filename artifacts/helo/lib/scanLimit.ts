/**
 * lib/scanLimit.ts — Daily scan counter for free users
 *
 * FREE tier: 5 scans / day (reset at midnight local time)
 * Trigger paywall on the 6th scan attempt.
 *
 * AsyncStorage schema:
 *   @helo_scan_limit → JSON { date: 'YYYY-MM-DD', count: number }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LIMIT_KEY = '@helo_scan_limit';
export const FREE_SCAN_LIMIT = 5;

interface ScanLimitData {
  date: string;
  count: number;
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
    // Reset if it's a new day
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

/** Returns today's scan count without modifying it. */
export async function getDailyScanCount(): Promise<number> {
  const data = await readLimit();
  return data.count;
}

/** Returns true if the user still has free scans available today. */
export async function canScanFree(): Promise<boolean> {
  const data = await readLimit();
  return data.count < FREE_SCAN_LIMIT;
}

/**
 * Increments the daily counter and returns the NEW count.
 * Call this only when the scan is actually triggered (not on paywall show).
 */
export async function incrementScanCount(): Promise<number> {
  const data = await readLimit();
  const updated: ScanLimitData = { date: todayString(), count: data.count + 1 };
  await writeLimit(updated);
  return updated.count;
}

/** Resets the counter (e.g. after going premium — not strictly needed). */
export async function resetScanLimit(): Promise<void> {
  await writeLimit({ date: todayString(), count: 0 });
}
