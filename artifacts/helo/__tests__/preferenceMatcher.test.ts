/**
 * __tests__/preferenceMatcher.test.ts
 *
 * Tests du moteur de personnalisation allergies/régimes/sensibilités.
 *
 * CONTEXTE (audit #1) : cette logique est SAFETY-CRITICAL (Lot 17-02 —
 * bannière rouge anaphylaxie) et n'avait AUCUN test. L'audit a révélé que le
 * chemin backend ne l'appelait même pas → faux-safe en prod. Ces tests
 * garantissent que le moteur lui-même ne régresse jamais en silence :
 *   - une allergie déclarée qui matche un ingrédient DOIT bumper en 'danger'
 *   - le label d'allergie DOIT être attaché (matchedAllergies) pour la bannière
 *   - on ne downgrade JAMAIS un danger existant
 */
import type { MatchResult } from '@/types';

// Mock contrôlé des préférences utilisatrice (sinon lecture AsyncStorage réelle).
jest.mock('@/lib/userPreferences', () => ({
  getUserPreferences: jest.fn(),
}));

import { applyPersonalPreferences } from '../lib/preferenceMatcher';
import { getUserPreferences } from '@/lib/userPreferences';

const mockedGetPrefs = getUserPreferences as jest.MockedFunction<typeof getUserPreferences>;

function m(ingredientName: string, riskLevel: MatchResult['riskLevel'] = 'no_signal'): MatchResult {
  return { ingredientName, matched: riskLevel !== 'no_signal', riskLevel };
}

const NO_PREFS = { allergies: [], dietary: [], cosmetic_sensitivities: [], updated_at: '' };

beforeEach(() => {
  mockedGetPrefs.mockReset();
});

describe('applyPersonalPreferences — allergies (safety-critical)', () => {
  it('bumpe un ingrédient matchant une allergie déclarée en danger', async () => {
    mockedGetPrefs.mockResolvedValue({ ...NO_PREFS, allergies: ['Arachide'] });
    const { matches } = await applyPersonalPreferences([m('Huile d\'arachide', 'safe')]);
    expect(matches[0].riskLevel).toBe('danger');
    expect(matches[0].matchedAllergies).toContain('Arachide');
  });

  it('attache le label allergie même si le risque était déjà danger (pour la bannière)', async () => {
    mockedGetPrefs.mockResolvedValue({ ...NO_PREFS, allergies: ['Lait'] });
    const { matches } = await applyPersonalPreferences([m('Lactosérum (whey)', 'danger')]);
    expect(matches[0].riskLevel).toBe('danger');
    expect(matches[0].matchedAllergies).toContain('Lait');
  });

  it('matche via synonymes EN/FR (milk, lactose, caséine…)', async () => {
    mockedGetPrefs.mockResolvedValue({ ...NO_PREFS, allergies: ['Lait'] });
    for (const name of ['Milk powder', 'Lactose', 'Caséine de lait']) {
      const { matches } = await applyPersonalPreferences([m(name, 'no_signal')]);
      expect(matches[0].matchedAllergies).toContain('Lait');
    }
  });

  it('NE touche PAS un ingrédient non concerné par l\'allergie', async () => {
    mockedGetPrefs.mockResolvedValue({ ...NO_PREFS, allergies: ['Arachide'] });
    const { matches } = await applyPersonalPreferences([m('Eau / Aqua', 'safe')]);
    expect(matches[0].riskLevel).toBe('safe');
    expect(matches[0].matchedAllergies).toBeUndefined();
  });

  it('gère plusieurs allergies sur le même produit', async () => {
    mockedGetPrefs.mockResolvedValue({ ...NO_PREFS, allergies: ['Arachide', 'Soja'] });
    const { matches } = await applyPersonalPreferences([
      m('Huile d\'arachide', 'safe'),
      m('Lécithine de soja', 'safe'),
    ]);
    expect(matches[0].matchedAllergies).toContain('Arachide');
    expect(matches[1].matchedAllergies).toContain('Soja');
    expect(matches.every((x) => x.riskLevel === 'danger')).toBe(true);
  });
});

describe('applyPersonalPreferences — régimes & cosmétiques (caution)', () => {
  it('bumpe un régime alimentaire matchant en caution (pas danger)', async () => {
    mockedGetPrefs.mockResolvedValue({ ...NO_PREFS, dietary: ['Végan'] });
    const { matches } = await applyPersonalPreferences([m('Miel / Honey', 'safe')]);
    expect(matches[0].riskLevel).toBe('caution');
  });

  it('bumpe une sensibilité cosmétique matchante en caution', async () => {
    mockedGetPrefs.mockResolvedValue({ ...NO_PREFS, cosmetic_sensitivities: ['Parabens'] });
    const { matches } = await applyPersonalPreferences([m('Methylparaben', 'safe')]);
    expect(matches[0].riskLevel).toBe('caution');
  });
});

describe('applyPersonalPreferences — garde-fous', () => {
  it('passthrough si aucune préférence', async () => {
    mockedGetPrefs.mockResolvedValue(NO_PREFS);
    const input = [m('Aqua', 'safe')];
    const { matches } = await applyPersonalPreferences(input);
    expect(matches[0].riskLevel).toBe('safe');
    expect(matches[0].matchedAllergies).toBeUndefined();
  });

  it('passthrough si getUserPreferences renvoie null (jamais bloquer le scan)', async () => {
    mockedGetPrefs.mockResolvedValue(null);
    const { matches } = await applyPersonalPreferences([m('Huile d\'arachide', 'safe')]);
    expect(matches[0].riskLevel).toBe('safe');
  });

  it('ignore la valeur sentinelle "Aucune"', async () => {
    mockedGetPrefs.mockResolvedValue({ ...NO_PREFS, allergies: ['Aucune'] });
    const { matches } = await applyPersonalPreferences([m('Huile d\'arachide', 'safe')]);
    expect(matches[0].riskLevel).toBe('safe');
    expect(matches[0].matchedAllergies).toBeUndefined();
  });
});
