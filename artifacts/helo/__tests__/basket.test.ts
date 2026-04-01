/**
 * Tests for lib/basket.ts
 * Uses the AsyncStorage mock from __tests__/mocks/async-storage.ts
 */

import {
  saveBasket,
  loadLatestBasket,
  clearBasket,
  verdictLabel,
  BasketItem,
} from '../lib/basket';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeItem(override: Partial<BasketItem> = {}): BasketItem {
  return {
    barcode: '3017620422003',
    name: 'Nutella',
    brand: 'Ferrero',
    verdict: 'caution',
    verdictLabel: 'Vigilance',
    scanId: 'scan-1',
    scannedAt: Date.now(),
    ...override,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('basket persistence', () => {
  beforeEach(async () => {
    await clearBasket();
  });

  test('loadLatestBasket returns null when empty', async () => {
    const basket = await loadLatestBasket();
    expect(basket).toBeNull();
  });

  test('saveBasket + loadLatestBasket round-trips items', async () => {
    const items = [makeItem(), makeItem({ barcode: '5000159407236', name: 'Kit Kat', verdict: 'safe' })];
    await saveBasket(items);

    const loaded = await loadLatestBasket();
    expect(loaded).not.toBeNull();
    expect(loaded!.items).toHaveLength(2);
    expect(loaded!.items[0].barcode).toBe('3017620422003');
    expect(loaded!.items[1].name).toBe('Kit Kat');
  });

  test('saveBasket sets createdAt ISO timestamp', async () => {
    await saveBasket([makeItem()]);
    const loaded = await loadLatestBasket();
    expect(loaded!.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('clearBasket removes stored basket', async () => {
    await saveBasket([makeItem()]);
    await clearBasket();
    const loaded = await loadLatestBasket();
    expect(loaded).toBeNull();
  });

  test('saving empty array is stored correctly', async () => {
    await saveBasket([]);
    const loaded = await loadLatestBasket();
    expect(loaded!.items).toEqual([]);
  });

  test('overwriting basket replaces previous session', async () => {
    await saveBasket([makeItem({ name: 'Produit A' })]);
    await saveBasket([makeItem({ name: 'Produit B' }), makeItem({ name: 'Produit C' })]);
    const loaded = await loadLatestBasket();
    expect(loaded!.items).toHaveLength(2);
    expect(loaded!.items[0].name).toBe('Produit B');
  });
});

describe('verdictLabel', () => {
  test('danger → Déconseillé', () => {
    expect(verdictLabel('danger')).toBe('Déconseillé');
  });

  test('caution → Vigilance', () => {
    expect(verdictLabel('caution')).toBe('Vigilance');
  });

  test('safe → Sûr', () => {
    expect(verdictLabel('safe')).toBe('Sûr');
  });

});
