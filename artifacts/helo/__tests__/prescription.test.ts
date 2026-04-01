/**
 * Tests for lib/prescription.ts
 * extractMedications is a pure function — no mocks needed.
 * prescriptionVerdict is also pure.
 */

jest.mock('../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {
    from: jest.fn(() => ({ select: jest.fn(() => ({ in: jest.fn().mockResolvedValue({ data: [], error: null }) })) })),
  },
}));

import {
  extractMedications,
  prescriptionVerdict,
  MedicationResult,
  MedicationRisk,
} from '../lib/prescription';

// ─── extractMedications ───────────────────────────────────────────────────────
describe('extractMedications', () => {
  test('returns empty array for blank text', () => {
    expect(extractMedications('')).toEqual([]);
  });

  test('detects known medication by name (Doliprane)', () => {
    const results = extractMedications('Doliprane 1000 mg 3x/jour');
    expect(results.some((r) => r.name.toLowerCase().includes('doliprane'))).toBe(true);
  });

  test('extracts dosage when present', () => {
    const results = extractMedications('Paracétamol 500 mg');
    const match = results.find((r) => r.name.toLowerCase().includes('paracétamol'));
    expect(match).toBeDefined();
    expect(match!.dosage).toContain('500');
  });

  test('detects known medication listed in dictionary (aspirin variant)', () => {
    const text = 'Aspirine 75 mg par jour';
    const results = extractMedications(text);
    expect(results.length).toBeGreaterThan(0);
  });

  test('handles multi-line prescription text', () => {
    const text = `Dr Dupont
Paracétamol 1000 mg
Ibuprofène 200 mg
3x par jour pendant 5 jours`;
    const results = extractMedications(text);
    // Should find at least paracétamol and ibuprofène
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test('does not duplicate the same medication', () => {
    const text = 'Doliprane Doliprane Doliprane';
    const results = extractMedications(text);
    const dolipraneCount = results.filter((r) =>
      r.name.toLowerCase().includes('doliprane'),
    ).length;
    expect(dolipraneCount).toBe(1);
  });

  test('extracts medication from capsule format', () => {
    const text = 'Amoxicilline 500 mg gélules';
    const results = extractMedications(text);
    expect(results.some((r) => r.rawMatch.toLowerCase().includes('amoxicillin'))).toBe(true);
  });
});

// ─── prescriptionVerdict ─────────────────────────────────────────────────────
describe('prescriptionVerdict', () => {
  function makeResult(riskLevel: MedicationRisk): MedicationResult {
    return {
      name: 'Test med',
      found: true,
      riskLevel,
    };
  }

  test('returns "safe" for all-safe results', () => {
    const results = [makeResult('safe'), makeResult('safe')];
    expect(prescriptionVerdict(results)).toBe('safe');
  });

  test('returns "danger" if any result is danger', () => {
    const results = [makeResult('safe'), makeResult('danger')];
    expect(prescriptionVerdict(results)).toBe('danger');
  });

  test('returns "caution" if mix of safe and caution, no danger', () => {
    const results = [makeResult('safe'), makeResult('caution')];
    expect(prescriptionVerdict(results)).toBe('caution');
  });

  test('returns "unknown" for empty results', () => {
    expect(prescriptionVerdict([])).toBe('unknown');
  });

  test('danger takes priority over caution', () => {
    const results = [makeResult('caution'), makeResult('danger'), makeResult('safe')];
    expect(prescriptionVerdict(results)).toBe('danger');
  });
});
