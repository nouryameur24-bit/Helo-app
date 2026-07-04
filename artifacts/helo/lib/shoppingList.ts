/**
 * lib/shoppingList.ts — Liste de courses "À acheter" (persistée localement).
 *
 * Audit module 2 : avant, `MaListeView` était un `useState([])` sans persistance
 * ni writer — feature visible mais morte. Et le bouton "Ajouter à ma liste" de
 * l'écran Alternatives était un stub "Bientôt disponible". Cette lib branche les
 * deux : ajout depuis Alternatives → persistance AsyncStorage → lecture par
 * MaListeView. Zéro backend, zéro RLS (100 % local, comme le placard).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/lib/storageKeys';
import { logError } from '@/lib/logger';

export interface ShoppingItem {
  id: string;
  productName: string;
  brand: string;
  checked: boolean;
  addedAt: number;
}

export async function getShoppingList(): Promise<ShoppingItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.shoppingList);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    logError('shoppingList.get', err);
    return [];
  }
}

export async function saveShoppingList(items: ShoppingItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.shoppingList, JSON.stringify(items));
  } catch (err) {
    logError('shoppingList.save', err, { count: items.length });
  }
}

/**
 * Ajoute un produit à la liste. Dédoublonne par (nom+marque) insensible à la
 * casse pour éviter les doublons quand on ajoute deux fois la même alternative.
 * Renvoie `true` si ajouté, `false` si déjà présent.
 */
export async function addToShoppingList(product: {
  productName: string;
  brand?: string | null;
}): Promise<boolean> {
  const name = product.productName.trim();
  if (!name) return false;
  const brand = (product.brand ?? '').trim();
  const items = await getShoppingList();
  const key = `${name.toLowerCase()}|${brand.toLowerCase()}`;
  if (items.some((i) => `${i.productName.toLowerCase()}|${i.brand.toLowerCase()}` === key)) {
    return false; // déjà dans la liste
  }
  const next: ShoppingItem[] = [
    {
      id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      productName: name,
      brand,
      checked: false,
      addedAt: Date.now(),
    },
    ...items,
  ];
  await saveShoppingList(next);
  return true;
}
