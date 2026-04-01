/**
 * Tests for lib/voiceLimit.ts
 * Verifies daily counter, free limit enforcement, and reset on new day.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  canVoiceFree,
  FREE_VOICE_LIMIT,
  getDailyVoiceCount,
  incrementVoiceCount,
} from '../lib/voiceLimit';

const LIMIT_KEY = '@helo_voice_limit';

function makeEntry(date: string, count: number) {
  return JSON.stringify({ date, count });
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

// ─── FREE_VOICE_LIMIT constant ────────────────────────────────────────────────
describe('FREE_VOICE_LIMIT', () => {
  test('is a positive number', () => {
    expect(FREE_VOICE_LIMIT).toBeGreaterThan(0);
  });
});

// ─── getDailyVoiceCount ───────────────────────────────────────────────────────
describe('getDailyVoiceCount', () => {
  test('returns 0 when no entry exists', async () => {
    expect(await getDailyVoiceCount()).toBe(0);
  });

  test('returns stored count for today', async () => {
    await AsyncStorage.setItem(LIMIT_KEY, makeEntry(todayStr(), 2));
    expect(await getDailyVoiceCount()).toBe(2);
  });

  test('returns 0 when stored entry is from a different day', async () => {
    await AsyncStorage.setItem(LIMIT_KEY, makeEntry('2000-01-01', 10));
    expect(await getDailyVoiceCount()).toBe(0);
  });
});

// ─── canVoiceFree ─────────────────────────────────────────────────────────────
describe('canVoiceFree', () => {
  test('returns true when count is 0', async () => {
    expect(await canVoiceFree()).toBe(true);
  });

  test('returns true when count is below limit', async () => {
    await AsyncStorage.setItem(LIMIT_KEY, makeEntry(todayStr(), FREE_VOICE_LIMIT - 1));
    expect(await canVoiceFree()).toBe(true);
  });

  test('returns false when count equals limit', async () => {
    await AsyncStorage.setItem(LIMIT_KEY, makeEntry(todayStr(), FREE_VOICE_LIMIT));
    expect(await canVoiceFree()).toBe(false);
  });

  test('returns false when count exceeds limit', async () => {
    await AsyncStorage.setItem(LIMIT_KEY, makeEntry(todayStr(), FREE_VOICE_LIMIT + 5));
    expect(await canVoiceFree()).toBe(false);
  });
});

// ─── incrementVoiceCount ──────────────────────────────────────────────────────
describe('incrementVoiceCount', () => {
  test('increments from 0 to 1', async () => {
    const count = await incrementVoiceCount();
    expect(count).toBe(1);
  });

  test('increments multiple times correctly', async () => {
    await incrementVoiceCount();
    await incrementVoiceCount();
    const count = await incrementVoiceCount();
    expect(count).toBe(3);
  });

  test('daily count matches after increments', async () => {
    await incrementVoiceCount();
    await incrementVoiceCount();
    expect(await getDailyVoiceCount()).toBe(2);
  });

  test('canVoiceFree becomes false at limit', async () => {
    for (let i = 0; i < FREE_VOICE_LIMIT; i++) {
      await incrementVoiceCount();
    }
    expect(await canVoiceFree()).toBe(false);
  });

  test('stale entry from yesterday resets on first increment', async () => {
    await AsyncStorage.setItem(LIMIT_KEY, makeEntry('2000-01-01', 99));
    const count = await incrementVoiceCount();
    expect(count).toBe(1);
  });
});
