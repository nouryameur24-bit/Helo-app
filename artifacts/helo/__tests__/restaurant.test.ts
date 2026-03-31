import { analyzeDish } from '../lib/restaurant';

describe('analyzeDish', () => {
  // ─── Danger dishes ─────────────────────────────────────────────────────────

  test('tartare → danger (viande crue)', () => {
    const result = analyzeDish('Tartare de boeuf');
    expect(result.risk).toBe('danger');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  test('carpaccio → danger (viande crue)', () => {
    const result = analyzeDish('Carpaccio de boeuf');
    expect(result.risk).toBe('danger');
  });

  test('sushi → danger (poisson cru)', () => {
    const result = analyzeDish('Sushi saumon');
    expect(result.risk).toBe('danger');
  });

  // ─── Caution dishes ────────────────────────────────────────────────────────

  test('tiramisu → caution (œufs possiblement crus)', () => {
    const result = analyzeDish('Tiramisu maison');
    expect(result.risk).toBe('caution');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  test('mousse au chocolat → caution (œufs crus possibles)', () => {
    const result = analyzeDish('Mousse au chocolat maison');
    expect(result.risk).toBe('caution');
  });

  // ─── Safe dishes ───────────────────────────────────────────────────────────

  test('grillé → safe (safe modifier present, no risky ingredients)', () => {
    // "Poulet grillé" — poulet alone has no risk rule, grillé is a safe modifier
    const result = analyzeDish('Poulet grillé sauce légumes');
    expect(result.risk).toBe('safe');
  });

  test('plain vegetable dish → safe', () => {
    const result = analyzeDish('Ratatouille provençale');
    expect(result.risk).toBe('safe');
  });

  // ─── Safe modifier downgrade ────────────────────────────────────────────────

  test('tartare "bien cuit" downgraded by safe modifier', () => {
    // "bien cuit" is in SAFE_MODIFIERS → downgrade danger → caution
    const result = analyzeDish('Tartare bien cuit');
    expect(['caution', 'safe']).toContain(result.risk);
    expect(result.risk).not.toBe('danger');
  });

  // ─── Course detection ──────────────────────────────────────────────────────

  test('tiramisu course is dessert', () => {
    const result = analyzeDish('Tiramisu');
    expect(result.course).toBe('dessert');
  });

  test('tartare course is plat or entrée', () => {
    const result = analyzeDish('Tartare de boeuf');
    expect(['plat', 'entrée']).toContain(result.course);
  });
});
