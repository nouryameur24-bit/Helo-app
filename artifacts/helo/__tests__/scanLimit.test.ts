/**
 * Tests for lib/scanLimit.ts
 * Verifies daily scan counter, free limit enforcement, reset, and day boundary.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  canScanFree,
  FREE_SCAN_LIMIT,
  getDailyScanCount,
  incrementScanCount,
  resetScanLimit,
} from '../lib/scanLimit';

const LIMIT_KEY = '@helo_scan_limit';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function makeEntry(date: string, count: number) {
  return JSON.stringify({ date, count });
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

// ─── FREE_SCAN_LIMIT constant ──────────────────────────────────────────────────
describe('FREE_SCAN_LIMIT', () => {
  test('is at least 1', () => {
    expect(FREE_SCAN_LIMIT).toBeGreaterThanOrEqual(1);
  });
});

// ─── getDailyScanCount ────────────────────────────────────────────────────────
describe('getDailyScanCount', () => {
  test('returns 0 on first call with no storage', async () => {
    expect(await getDailyScanCount()).toBe(0);
  });

  test('returns stored count for today', async () => {
    await AsyncStorage.setItem(LIMIT_KEY, makeEntry(todayStr(), 3));
    expect(await getDailyScanCount()).toBe(3);
  });

  test('returns 0 when stored entry is stale (yesterday)', async () => {
    await AsyncStorage.setItem(LIMIT_KEY, makeEntry('1999-12-31', 5));
    expect(await getDailyScanCount()).toBe(0);
  });
});

// ─── canScanFree ──────────────────────────────────────────────────────────────
describe('canScanFree', () => {
  test('returns true when no scans done yet', async () => {
    expect(await canScanFree()).toBe(true);
  });

  test('returns true when below limit', async () => {
    await AsyncStorage.setItem(LIMIT_KEY, makeEntry(todayStr(), FREE_SCAN_LIMIT - 1));
    expect(await canScanFree()).toBe(true);
  });

  test('returns false at exactly limit', async () => {
    await AsyncStorage.setItem(LIMIT_KEY, makeEntry(todayStr(), FREE_SCAN_LIMIT));
    expect(await canScanFree()).toBe(false);
  });

  test('returns false above limit', async () => {
    await AsyncStorage.setItem(LIMIT_KEY, makeEntry(todayStr(), FREE_SCAN_LIMIT + 10));
    expect(await canScanFree()).toBe(false);
  });
});

// ─── incrementScanCount ───────────────────────────────────────────────────────
describe('incrementScanCount', () => {
  test('starts at 1 after first increment', async () => {
    expect(await incrementScanCount()).toBe(1);
  });

  test('increments sequentially', async () => {
    await incrementScanCount();
    await incrementScanCount();
    expect(await incrementScanCount()).toBe(3);
  });

  test('persists count across calls', async () => {
    await incrementScanCount();
    await incrementScanCount();
    expect(await getDailyScanCount()).toBe(2);
  });

  test('triggers canScanFree = false when limit reached', async () => {
    for (let i = 0; i < FREE_SCAN_LIMIT; i++) {
      await incrementScanCount();
    }
    expect(await canScanFree()).toBe(false);
  });

  test('resets stale day counter on increment', async () => {
    await AsyncStorage.setItem(LIMIT_KEY, makeEntry('1999-01-01', 100));
    expect(await incrementScanCount()).toBe(1);
  });
});

// ─── resetScanLimit ───────────────────────────────────────────────────────────
describe('resetScanLimit', () => {
  test('resets count to 0', async () => {
    await AsyncStorage.setItem(LIMIT_KEY, makeEntry(todayStr(), 4));
    await resetScanLimit();
    expect(await getDailyScanCount()).toBe(0);
  });

  test('canScanFree returns true after reset', async () => {
    for (let i = 0; i < FREE_SCAN_LIMIT; i++) {
      await incrementScanCount();
    }
    expect(await canScanFree()).toBe(false);
    await resetScanLimit();
    expect(await canScanFree()).toBe(true);
  });
});
