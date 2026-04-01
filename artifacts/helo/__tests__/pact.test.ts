/**
 * Tests for lib/pact.ts
 * Mocks Supabase and notifications to keep tests pure.
 */

jest.mock('../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {
    from: jest.fn(() => ({
      upsert: jest.fn().mockResolvedValue({}),
      insert: jest.fn().mockResolvedValue({}),
    })),
  },
}));

jest.mock('../lib/notifications', () => ({
  scheduleNotification: jest.fn().mockResolvedValue(undefined),
}));

import {
  computePactDay,
  flameSize,
  createPact,
  loadPact,
  abandonPact,
  PACT_BADGES,
  PactState,
} from '../lib/pact';

// ─── computePactDay ───────────────────────────────────────────────────────────
describe('computePactDay', () => {
  function pactStartingDaysAgo(daysAgo: number): PactState {
    const start = new Date();
    start.setDate(start.getDate() - daysAgo);
    return {
      id: 'test',
      duration: 30,
      startDate: start.toISOString().slice(0, 10),
      currentStreak: 0,
      longestStreak: 0,
      status: 'active',
      witnesses: [],
      lastScanDate: null,
    };
  }

  test('same day as start → day 1', () => {
    const pact = pactStartingDaysAgo(0);
    expect(computePactDay(pact)).toBe(1);
  });

  test('started 6 days ago → day 7', () => {
    const pact = pactStartingDaysAgo(6);
    expect(computePactDay(pact)).toBe(7);
  });

  test('result is clamped to pact duration', () => {
    const pact = pactStartingDaysAgo(40); // 40 days > 30 duration
    expect(computePactDay(pact)).toBe(30);
  });
});

// ─── flameSize ────────────────────────────────────────────────────────────────
describe('flameSize', () => {
  test('streak 0 → size 22', () => expect(flameSize(0)).toBe(22));
  test('streak 7 → size 28', () => expect(flameSize(7)).toBe(28));
  test('streak 15 → size 36', () => expect(flameSize(15)).toBe(36));
  test('streak 25 → size 48', () => expect(flameSize(25)).toBe(48));
  test('streak 6 → size 22 (just below threshold)', () => expect(flameSize(6)).toBe(22));
});

// ─── PACT_BADGES ──────────────────────────────────────────────────────────────
describe('PACT_BADGES', () => {
  test('contains 3 badges', () => {
    expect(PACT_BADGES).toHaveLength(3);
  });

  test('first badge requires 7 days', () => {
    expect(PACT_BADGES[0].id).toBe('semaine_1');
    expect(PACT_BADGES[0].requiredDays).toBe(7);
  });

  test('final badge requires 30 days', () => {
    expect(PACT_BADGES[2].id).toBe('maman_engagee');
    expect(PACT_BADGES[2].requiredDays).toBe(30);
  });
});

// ─── createPact / loadPact ────────────────────────────────────────────────────
describe('createPact + loadPact', () => {
  beforeEach(async () => {
    await abandonPact().catch(() => {}); // reset state
  });

  test('creates pact with correct duration and witnesses', async () => {
    const pact = await createPact(14, [{ id: 'witness-1', name: 'Marie' }]);
    expect(pact.duration).toBe(14);
    expect(pact.witnesses).toHaveLength(1);
    expect(pact.witnesses[0].name).toBe('Marie');
    expect(pact.status).toBe('active');
    expect(pact.currentStreak).toBe(0);
  });

  test('loadPact retrieves previously created pact', async () => {
    await createPact(30, []);
    const loaded = await loadPact();
    expect(loaded).not.toBeNull();
    expect(loaded!.duration).toBe(30);
  });

  test('abandoning a pact sets status to abandoned', async () => {
    await createPact(7, []);
    await abandonPact();
    const loaded = await loadPact();
    expect(loaded!.status).toBe('abandoned');
  });

  test('startDate is today in YYYY-MM-DD format', async () => {
    const pact = await createPact(7, []);
    const today = new Date().toISOString().slice(0, 10);
    expect(pact.startDate).toBe(today);
  });
});
