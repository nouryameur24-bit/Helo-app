import { swallow } from '@/lib/swallow';
/**
 * useShelfData — Gestion du placard produits avec fallback local.
 *
 * Stratégie de lecture (cascade) :
 *  1. Supabase `scan_history` (si configuré et connecté) — source de vérité distante
 *  2. AsyncStorage `@helo_shelf` — fallback hors-ligne / dev
 *
 * Après chaque chargement, synchronise automatiquement le widget iOS via syncWidgetData()
 * afin que le Glow Score sur l'écran d'accueil reste à jour sans action utilisateur.
 *
 * @param userId - ID utilisateur (null = placard vide, pas d'erreur)
 * @returns {{ shelf, loading, reload }}
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ShelfProduct, ShelfCategory } from '@/components/shelf/ShelfCard';
import { calculateGlowScore } from '@/lib/glowscore';
import { calculateTrimester } from '@/lib/trimester';
import { syncWidgetData, reloadWidgets } from '@/lib/widgetStorage';

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
        ? 'À éviter'
        : raw.verdict === 'caution'
        ? 'Vigilance'
        : 'Compatible',
    category: (raw.category ?? 'salle-de-bain') as ShelfCategory,
    verdictChanged: false,
  };
}

async function syncWidgetFromShelf(products: ShelfProduct[]): Promise<void> {
  try {
    const { score } = calculateGlowScore(products);
    const profileRaw = await AsyncStorage.getItem('user_profile');
    let weekOfPregnancy = 20;
    let trimester = 2;
    if (profileRaw) {
      const profile = JSON.parse(profileRaw);
      if (profile.dueDate) {
        const info = calculateTrimester(profile.dueDate);
        weekOfPregnancy = info.weekOfPregnancy;
        trimester = info.trimester;
      }
    }
    await syncWidgetData({ glowScore: score, weekOfPregnancy, trimester });
    await reloadWidgets();
  } catch {
  }
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
                  ? 'À éviter'
                  : row.verdict_at_shelf_add === 'caution'
                  ? 'Vigilance'
                  : 'Compatible',
              category: (row.shelf_category ?? 'salle-de-bain') as ShelfCategory,
              verdictChanged: false,
            };
          });
          setShelf(items);
          setLoading(false);
          syncWidgetFromShelf(items).catch(swallow);
          return;
        }
      } catch {
      }
    }

    try {
      const raw = await AsyncStorage.getItem('@helo_shelf') ?? '[]';
      const all: RawShelfItem[] = JSON.parse(raw);
      const filtered = all.filter((i) => !i.userId || i.userId === userId);
      const items = filtered.map(mapRawToShelf);
      setShelf(items);
      syncWidgetFromShelf(items).catch(swallow);
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
