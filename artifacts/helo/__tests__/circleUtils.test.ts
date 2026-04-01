/**
 * Tests for lib/circleUtils.ts
 * Covers getMemberColor, getRelativeTime, and invite code structure.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../lib/supabase', () => ({
  isSupabaseConfigured: false,
  getAuthedClient: jest.fn(() => null),
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

import { getMemberColor, getRelativeTime } from '../lib/circleUtils';

// ─── getMemberColor ────────────────────────────────────────────────────────────
describe('getMemberColor', () => {
  test('returns a hex color string', () => {
    const color = getMemberColor('user-123');
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test('is deterministic — same userId gives same color', () => {
    const c1 = getMemberColor('user-abc');
    const c2 = getMemberColor('user-abc');
    expect(c1).toBe(c2);
  });

  test('different userIds can give different colors', () => {
    const colors = new Set(
      ['alice', 'bob', 'carol', 'dave', 'eve', 'frank', 'grace', 'heidi']
        .map((id) => getMemberColor(id)),
    );
    // At least 2 distinct colors among 8 members
    expect(colors.size).toBeGreaterThanOrEqual(2);
  });

  test('handles empty userId without throwing', () => {
    expect(() => getMemberColor('')).not.toThrow();
  });

  test('handles long userId without throwing', () => {
    expect(() => getMemberColor('a'.repeat(200))).not.toThrow();
  });
});

// ─── getRelativeTime ──────────────────────────────────────────────────────────
describe('getRelativeTime', () => {
  const now = new Date();

  test('returns "maintenant" for very recent dates', () => {
    const recent = new Date(now.getTime() - 10_000); // 10s ago
    const result = getRelativeTime(recent.toISOString());
    expect(result).toMatch(/maintenant|instant/i);
  });

  test('returns minutes ago string for 5 min ago', () => {
    const fiveMin = new Date(now.getTime() - 5 * 60 * 1000);
    const result = getRelativeTime(fiveMin.toISOString());
    expect(result).toMatch(/min|minute/i);
  });

  test('returns hours ago string for 3 hours ago', () => {
    const threeHours = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const result = getRelativeTime(threeHours.toISOString());
    expect(result).toMatch(/h|heure/i);
  });

  test('returns day info for 2 days ago', () => {
    const twoDays = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const result = getRelativeTime(twoDays.toISOString());
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('handles invalid date gracefully', () => {
    expect(() => getRelativeTime('invalid')).not.toThrow();
  });

  test('handles future date without crashing', () => {
    const future = new Date(now.getTime() + 60_000);
    expect(() => getRelativeTime(future.toISOString())).not.toThrow();
  });
});

// ─── createCircle — offline guard ─────────────────────────────────────────────
describe('createCircle — offline (isSupabaseConfigured = false)', () => {
  test('throws when Supabase is not configured', async () => {
    const { createCircle } = require('../lib/circleUtils');
    await expect(createCircle('user-1', 'Alice')).rejects.toThrow();
  });
});

// ─── joinCircle — offline guard ───────────────────────────────────────────────
describe('joinCircle — offline (isSupabaseConfigured = false)', () => {
  test('throws when Supabase is not configured', async () => {
    const { joinCircle } = require('../lib/circleUtils');
    await expect(joinCircle('user-1', 'Alice', 'ABCD1234')).rejects.toThrow();
  });
});
