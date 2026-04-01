/**
 * Tests for lib/memories.ts
 * Uses the AsyncStorage mock — no real storage or network calls.
 */

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));

import {
  loadCapsules,
  saveCapsules,
  addCapsule,
  markCapsuleOpened,
  isCapsuleOpenable,
  formatSealedDate,
  formatOpensDate,
  generateId,
  MemoryCapsule,
} from '../lib/memories';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeCapsule(override: Partial<MemoryCapsule> = {}): MemoryCapsule {
  const opensAt = new Date(Date.now() - 1000); // already openable by default
  return {
    id: generateId(),
    trimester: 1,
    trimesterLabel: 'Trimestre 1',
    data: {
      avgGlowScore: 80,
      scanCount: 12,
      topProduct: 'Crème Nuxe',
      firstDangerProduct: null,
      journalCount: 3,
      circleMessages: 5,
      journalEntries: [],
      topScans: [],
    },
    sealedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    opensAt: opensAt.toISOString(),
    opened: false,
    ...override,
  };
}

// ─── Storage ──────────────────────────────────────────────────────────────────
describe('loadCapsules', () => {
  test('returns empty array when no capsules stored', async () => {
    const capsules = await loadCapsules();
    expect(capsules).toEqual([]);
  });
});

describe('saveCapsules + loadCapsules', () => {
  test('persists and retrieves capsules', async () => {
    const capsule = makeCapsule();
    await saveCapsules([capsule]);
    const loaded = await loadCapsules();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(capsule.id);
  });

  test('overwrites previous capsules', async () => {
    await saveCapsules([makeCapsule()]);
    const two = [makeCapsule(), makeCapsule()];
    await saveCapsules(two);
    const loaded = await loadCapsules();
    expect(loaded).toHaveLength(2);
  });
});

describe('addCapsule', () => {
  test('appends capsule to existing list', async () => {
    const first = makeCapsule();
    await saveCapsules([first]);
    const second = makeCapsule();
    await addCapsule(second);
    const loaded = await loadCapsules();
    expect(loaded).toHaveLength(2);
    expect(loaded[1].id).toBe(second.id);
  });
});

describe('markCapsuleOpened', () => {
  test('sets opened = true for matching capsule', async () => {
    const capsule = makeCapsule({ opened: false });
    await saveCapsules([capsule]);
    await markCapsuleOpened(capsule.id);
    const loaded = await loadCapsules();
    expect(loaded[0].opened).toBe(true);
  });

  test('does not affect other capsules', async () => {
    const a = makeCapsule();
    const b = makeCapsule();
    await saveCapsules([a, b]);
    await markCapsuleOpened(a.id);
    const loaded = await loadCapsules();
    expect(loaded.find((c) => c.id === b.id)!.opened).toBe(false);
  });
});

// ─── isCapsuleOpenable ────────────────────────────────────────────────────────
describe('isCapsuleOpenable', () => {
  test('returns true when opensAt is in the past and not yet opened', () => {
    const capsule = makeCapsule({
      opensAt: new Date(Date.now() - 1000).toISOString(),
      opened: false,
    });
    expect(isCapsuleOpenable(capsule)).toBe(true);
  });

  test('returns false when capsule is already opened', () => {
    const capsule = makeCapsule({ opened: true });
    expect(isCapsuleOpenable(capsule)).toBe(false);
  });

  test('returns false when opensAt is in the future', () => {
    const capsule = makeCapsule({
      opensAt: new Date(Date.now() + 86400000).toISOString(),
      opened: false,
    });
    expect(isCapsuleOpenable(capsule)).toBe(false);
  });
});

// ─── generateId ───────────────────────────────────────────────────────────────
describe('generateId', () => {
  test('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  test('ID is a non-empty string', () => {
    expect(typeof generateId()).toBe('string');
    expect(generateId().length).toBeGreaterThan(0);
  });
});

// ─── Date formatters ──────────────────────────────────────────────────────────
describe('formatSealedDate and formatOpensDate', () => {
  test('formatSealedDate returns a non-empty string', () => {
    const result = formatSealedDate(new Date().toISOString());
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('formatOpensDate returns a non-empty string', () => {
    const result = formatOpensDate(new Date(Date.now() + 86400000).toISOString());
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
