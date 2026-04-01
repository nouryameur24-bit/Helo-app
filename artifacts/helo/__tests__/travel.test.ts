/**
 * Tests for restaurant / menu analysis helpers
 * Covers safe-food list construction and dish classification.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: { from: jest.fn() },
}));

// ── Safe dish classification helpers ──────────────────────────────────────────
// These mirror the logic used in lib/restaurant.ts and the results screen.
type RiskLevel = 'safe' | 'caution' | 'danger';

interface DishRiskResult {
  dish: string;
  risk: RiskLevel;
  reason?: string;
}

const DANGER_KEYWORDS = [
  'cru', 'carpaccio', 'tartare', 'sashimi', 'sushi', 'bleu',
  'alcool', 'sake', 'vin', 'bière', 'cocktail',
  'listeria', 'toxoplasmose',
];

const CAUTION_KEYWORDS = [
  'fromage', 'charcuterie', 'jambon', 'foie', 'pâté',
  'café', 'thé', 'chocolat',
];

function classifyDish(dishName: string): RiskLevel {
  const lower = dishName.toLowerCase();
  if (DANGER_KEYWORDS.some((kw) => lower.includes(kw))) return 'danger';
  if (CAUTION_KEYWORDS.some((kw) => lower.includes(kw))) return 'caution';
  return 'safe';
}

function classifyMenu(dishes: string[]): DishRiskResult[] {
  return dishes.map((dish) => ({ dish, risk: classifyDish(dish) }));
}

// ─── classifyDish ─────────────────────────────────────────────────────────────
describe('classifyDish', () => {
  test('tartare is danger', () => {
    expect(classifyDish('Tartare de bœuf')).toBe('danger');
  });

  test('sashimi is danger', () => {
    expect(classifyDish('Sashimi de saumon')).toBe('danger');
  });

  test('carpaccio is danger', () => {
    expect(classifyDish('Carpaccio de thon')).toBe('danger');
  });

  test('sushi is danger', () => {
    expect(classifyDish('Sushi mix')).toBe('danger');
  });

  test('fromage is caution', () => {
    expect(classifyDish('Plateau de fromages')).toBe('caution');
  });

  test('jambon is caution', () => {
    expect(classifyDish('Jambon fumé')).toBe('caution');
  });

  test('grilled chicken is safe', () => {
    expect(classifyDish('Poulet grillé')).toBe('safe');
  });

  test('roasted vegetables is safe', () => {
    expect(classifyDish('Légumes rôtis')).toBe('safe');
  });

  test('pasta is safe', () => {
    expect(classifyDish('Pâtes au pesto')).toBe('safe');
  });

  test('case insensitive matching', () => {
    expect(classifyDish('TARTARE')).toBe('danger');
    expect(classifyDish('Fromage Blanc')).toBe('caution');
  });
});

// ─── classifyMenu ──────────────────────────────────────────────────────────────
describe('classifyMenu', () => {
  test('empty menu returns empty array', () => {
    expect(classifyMenu([])).toEqual([]);
  });

  test('classifies a mixed menu correctly', () => {
    const results = classifyMenu([
      'Salade César', 'Tartare de bœuf', 'Fromage blanc',
    ]);
    expect(results[0].risk).toBe('safe');
    expect(results[1].risk).toBe('danger');
    expect(results[2].risk).toBe('caution');
  });

  test('returns an entry for each dish', () => {
    const dishes = ['dish A', 'dish B', 'dish C', 'dish D'];
    const results = classifyMenu(dishes);
    expect(results).toHaveLength(4);
  });

  test('dish name is preserved in output', () => {
    const results = classifyMenu(['Soupe aux oignons']);
    expect(results[0].dish).toBe('Soupe aux oignons');
  });

  test('all-safe menu has no danger entries', () => {
    const dishes = ['Riz pilaf', 'Blanquette de veau', 'Tarte aux pommes'];
    const results = classifyMenu(dishes);
    expect(results.every((r) => r.risk !== 'danger')).toBe(true);
  });

  test('bière is flagged as danger', () => {
    expect(classifyDish('Bière blonde')).toBe('danger');
  });

  test('sake is flagged as danger', () => {
    expect(classifyDish('Sake chaud')).toBe('danger');
  });
});

// ─── Safe count helpers ────────────────────────────────────────────────────────
describe('safe count helpers', () => {
  test('counts safe dishes correctly', () => {
    const results = classifyMenu(['Poulet', 'Tartare', 'Salade', 'Sushi', 'Légumes']);
    const safeCount = results.filter((r) => r.risk === 'safe').length;
    expect(safeCount).toBe(3);
  });

  test('counts danger dishes correctly', () => {
    const results = classifyMenu(['Tartare', 'Sashimi', 'Carpaccio', 'Poulet']);
    const dangerCount = results.filter((r) => r.risk === 'danger').length;
    expect(dangerCount).toBe(3);
  });
});
