import { calculateGlowScore, getGlowLabel } from '../lib/glowscore';
import type { ShelfProduct } from '../components/shelf/ShelfCard';

// Mock Colors dependency used by getGlowLabel
jest.mock('../constants/theme', () => ({
  Colors: {
    safe: '#4CAF50',
    accent: '#C9A96E',
    caution: '#FF9800',
    danger: '#F44336',
    background: '#FFFAF5',
    surface: '#FFFFFF',
    textPrimary: '#2D2926',
    textSecondary: '#8C7E75',
    textTertiary: '#B8ADA6',
    border: '#EDE7E1',
    borderLight: '#F5F0EB',
    accentLight: '#E8D5B0',
    accentDark: '#A88B4A',
    surfaceElevated: '#F8F4EF',
    backgroundSecondary: '#F5F0EB',
  },
  Typography: {},
  Radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 999 },
  Shadows: { soft: {}, medium: {}, elevated: {} },
  Spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
}));

function makeProduct(verdict: 'safe' | 'caution' | 'danger'): ShelfProduct {
  return {
    id: Math.random().toString(),
    name: 'Test Product',
    brand: 'Test Brand',
    verdict,
    verdictLabel: verdict === 'safe' ? 'Sûr' : verdict === 'caution' ? 'Attention' : 'Danger',
    verdictChanged: false,
    category: 'salle-de-bain',
  };
}

describe('calculateGlowScore', () => {
  test('empty products → score 0', () => {
    const result = calculateGlowScore([]);
    expect(result.score).toBe(0);
    expect(result.total).toBe(0);
  });

  test('3 safe products → score 100 (clamped from 105)', () => {
    const products = [makeProduct('safe'), makeProduct('safe'), makeProduct('safe')];
    // (100*3)/3 = 100 + 5 bonus (no danger) = 105 → clamped to 100
    const result = calculateGlowScore(products);
    expect(result.score).toBe(100);
    expect(result.countSafe).toBe(3);
  });

  test('single danger product → score 0', () => {
    const result = calculateGlowScore([makeProduct('danger')]);
    expect(result.score).toBe(0);
    expect(result.countDanger).toBe(1);
  });

  test('safe + caution + danger → score 47', () => {
    const products = [makeProduct('safe'), makeProduct('caution'), makeProduct('danger')];
    // (100 + 40 + 0) / 3 = 46.67 → Math.round = 47; no +5 (has danger)
    const result = calculateGlowScore(products);
    expect(result.score).toBe(47);
  });

  test('counts are correct', () => {
    const products = [
      makeProduct('safe'),
      makeProduct('safe'),
      makeProduct('caution'),
      makeProduct('danger'),
    ];
    const result = calculateGlowScore(products);
    expect(result.countSafe).toBe(2);
    expect(result.countCaution).toBe(1);
    expect(result.countDanger).toBe(1);
    expect(result.total).toBe(4);
  });
});

describe('getGlowLabel', () => {
  test('score 85 → Excellent', () => {
    expect(getGlowLabel(85).label).toBe('Excellent');
    expect(getGlowLabel(85).variant).toBe('safe');
  });

  test('score 35 → Attention', () => {
    expect(getGlowLabel(35).label).toBe('Attention');
    expect(getGlowLabel(35).variant).toBe('danger');
  });

  test('score 60 → Bon', () => {
    expect(getGlowLabel(60).label).toBe('Bon');
    expect(getGlowLabel(60).variant).toBe('accent');
  });

  test('score 50 → À améliorer', () => {
    expect(getGlowLabel(50).label).toBe('À améliorer');
    expect(getGlowLabel(50).variant).toBe('caution');
  });
});
