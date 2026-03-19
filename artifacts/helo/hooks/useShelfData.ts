import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ShelfProduct, ShelfCategory } from '@/components/shelf/ShelfCard';

type RawShelfItem = {
  barcode?: string;
  productName?: string;
  brand?: string;
  category?: string;
  verdict?: string;
  savedAt?: number;
  userId?: string;
};

function mapRawToShelf(raw: RawShelfItem, index: number): ShelfProduct {
  return {
    id: raw.barcode ?? String(index),
    name: raw.productName ?? 'Produit',
    brand: raw.brand ?? '',
    verdict: (raw.verdict ?? 'safe') as ShelfProduct['verdict'],
    verdictLabel:
      raw.verdict === 'danger'
        ? 'Déconseillé'
        : raw.verdict === 'caution'
        ? 'Vigilance'
        : 'Sûr',
    category: (raw.category ?? 'salle-de-bain') as ShelfCategory,
    verdictChanged: false,
  };
}

export function useShelfData(userId?: string | null) {
  const [shelf, setShelf] = useState<ShelfProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setShelf([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('scan_history')
          .select('id, shelf_category, verdict_at_shelf_add, products(name, brand)')
          .eq('user_id', userId)
          .eq('in_shelf', true)
          .order('scanned_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const items: ShelfProduct[] = (data as unknown as Array<{
            id: string;
            shelf_category: string | null;
            verdict_at_shelf_add: string | null;
            products: { name: string | null; brand: string | null } | { name: string | null; brand: string | null }[] | null;
          }>).map((row) => {
            const prod = Array.isArray(row.products) ? row.products[0] : row.products;
            return {
              id: String(row.id),
              name: prod?.name ?? 'Produit',
              brand: prod?.brand ?? '',
              verdict: (row.verdict_at_shelf_add ?? 'safe') as ShelfProduct['verdict'],
              verdictLabel:
                row.verdict_at_shelf_add === 'danger'
                  ? 'Déconseillé'
                  : row.verdict_at_shelf_add === 'caution'
                  ? 'Vigilance'
                  : 'Sûr',
              category: (row.shelf_category ?? 'salle-de-bain') as ShelfCategory,
              verdictChanged: false,
            };
          });
          setShelf(items);
          setLoading(false);
          return;
        }
      } catch {
      }
    }

    try {
      const raw = await AsyncStorage.getItem('@helo_shelf') ?? '[]';
      const all: RawShelfItem[] = JSON.parse(raw);
      const filtered = all.filter((i) => !i.userId || i.userId === userId);
      setShelf(filtered.map(mapRawToShelf));
    } catch {
      setShelf([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { shelf, loading, reload: load };
}
