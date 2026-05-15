// Tests for parseIngredients and getVerdict from productLookup (formerly openfoodfacts)

// Mock dependencies before imports
jest.mock('../lib/config', () => ({
  Config: {
    supabaseUrl: '',
    supabaseAnonKey: '',
    googleVisionKey: '',
    anthropicKey: '',
    revenueCatKey: '',
  },
  validateConfig: jest.fn(),
}));

jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
  isSupabaseConfigured: false,
}));

import { parseIngredients, getVerdict } from '../lib/productLookup';
import type { MatchResult } from '../types';

// ─── parseIngredients ────────────────────────────────────────────────────────

describe('parseIngredients', () => {
  test('parses simple comma-separated list and capitalizes', () => {
    const result = parseIngredients('eau, sucre, sel');
    expect(result).toContain('Eau');
    expect(result).toContain('Sucre');
    expect(result).toContain('Sel');
    expect(result).toHaveLength(3);
  });

  test('strips parenthetical sub-ingredients', () => {
    const result = parseIngredients('aqua (water), sodium lauryl sulfate');
    expect(result).toContain('Aqua');
    expect(result).toContain('Sodium lauryl sulfate');
    expect(result).not.toContain('water');
    expect(result).not.toContain('Water');
  });

  test('empty string → empty array', () => {
    expect(parseIngredients('')).toEqual([]);
  });

  test('strips percentage values', () => {
    const result = parseIngredients('glycerin 5%, aqua, parfum 0.5%');
    expect(result).toContain('Aqua');
    expect(result.join(' ')).not.toContain('%');
  });

  test('handles semicolon separator', () => {
    const result = parseIngredients('eau; glycérine; parfum');
    expect(result).toContain('Eau');
    expect(result).toContain('Glycérine');
    expect(result).toContain('Parfum');
  });

  test('deduplicates ingredients case-insensitively', () => {
    const result = parseIngredients('eau, EAU, Eau, sucre');
    const eauCount = result.filter((i) => i.toLowerCase() === 'eau').length;
    expect(eauCount).toBe(1);
  });

  test('filters nutrition-table junk but preserves real INCI ingredients', () => {
    const result = parseIngredients(
      'sucre, matières grasses, dont acides gras saturés: 0, sodium benzoate, sodium lauryl sulfate, fibres alimentaires',
    );
    // Real ingredients preserved (critical: "sodium ..." must NOT be filtered)
    expect(result).toContain('Sucre');
    expect(result).toContain('Sodium benzoate');
    expect(result).toContain('Sodium lauryl sulfate');
    // Nutrition junk removed
    expect(result.some((s) => /matières grasses/i.test(s))).toBe(false);
    expect(result.some((s) => /^dont/i.test(s))).toBe(false);
    expect(result.some((s) => /fibres alimentaires/i.test(s))).toBe(false);
  });
});

// ─── getVerdict ───────────────────────────────────────────────────────────────

function makeMatch(riskLevel: MatchResult['riskLevel']): MatchResult {
  return {
    ingredientName: `ingredient_${riskLevel}`,
    matched: riskLevel !== 'no_signal',
    riskLevel,
  };
}

describe('getVerdict', () => {
  test('single danger ingredient → verdict danger', () => {
    const result = getVerdict([makeMatch('danger')]);
    expect(result.verdict).toBe('danger');
    expect(result.flaggedIngredients).toHaveLength(1);
  });

  test('no danger, one caution → verdict caution', () => {
    const result = getVerdict([makeMatch('safe'), makeMatch('caution')]);
    expect(result.verdict).toBe('caution');
  });

  test('all safe → verdict safe', () => {
    const result = getVerdict([makeMatch('safe'), makeMatch('safe')]);
    expect(result.verdict).toBe('safe');
  });

  test('danger takes priority over caution', () => {
    const result = getVerdict([makeMatch('caution'), makeMatch('danger'), makeMatch('safe')]);
    expect(result.verdict).toBe('danger');
  });

  test('no matches → verdict safe', () => {
    const result = getVerdict([makeMatch('no_signal'), makeMatch('no_signal')]);
    expect(result.verdict).toBe('safe');
    expect(result.flaggedIngredients).toHaveLength(0);
  });
});
