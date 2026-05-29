/**
 * __tests__/eNumberAliases.test.ts
 *
 * Audit #11 (CONFIRMÉ) : resolveENumber faisait `.toUpperCase()` mais les clés
 * du record ont un suffixe lettre MINUSCULE (E150d, E160b…) → les E-numbers à
 * suffixe ne résolvaient JAMAIS (dont E150d = caramel Coca, critique gotcha #2).
 * Ces tests verrouillent la normalisation.
 */
import { resolveENumber } from '../lib/eNumberAliases';

describe('resolveENumber', () => {
  it('résout un E-number simple (sans suffixe)', () => {
    expect(resolveENumber('E951')).toBe('aspartame');
  });

  it('résout un E-number à suffixe lettre — LE bug #11', () => {
    expect(resolveENumber('E150d')).toBe('caramel au sulfite ammoniacal');
    expect(resolveENumber('E160b')).toBe('rocou');
  });

  it('est insensible à la casse en entrée (E150D, e150d, E150d)', () => {
    expect(resolveENumber('E150D')).toBe('caramel au sulfite ammoniacal');
    expect(resolveENumber('e150d')).toBe('caramel au sulfite ammoniacal');
    expect(resolveENumber(' E150d ')).toBe('caramel au sulfite ammoniacal');
  });

  it('renvoie null pour un nom d\'ingrédient normal', () => {
    expect(resolveENumber('Aspartame')).toBeNull();
    expect(resolveENumber('Aqua')).toBeNull();
  });

  it('renvoie null pour un E-number inconnu ou malformé', () => {
    expect(resolveENumber('E999999')).toBeNull();
    expect(resolveENumber('')).toBeNull();
    expect(resolveENumber('E12')).toBeNull();
  });
});
