import { swallow } from '@/lib/swallow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

import { IllustrationShelf } from '@/components/illustrations/IllustrationShelf';
import { FilterSheet, FilterState, DEFAULT_FILTERS } from '@/components/shelf/FilterSheet';
import { LongPressHint } from '@/components/shelf/LongPressHint';
import { ShelfCard, ShelfProduct } from '@/components/shelf/ShelfCard';
import { ShimmerCard } from '@/components/shelf/ShimmerCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { useShelfData } from '@/hooks/useShelfData';
import { getBabyMode } from '@/hooks/useBabyMode';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ShelfCategory } from '@/components/shelf/ShelfCard';
import type { VerdictFilter } from '@/components/shelf/FilterSheet';
import { STORAGE_KEYS } from '@/lib/storageKeys';

type ShelfHistoryVerdict = 'safe' | 'caution' | 'danger' | 'unknown';

type ShelfHistoryProduct = {
  id: string;
  name: string | null;
  brand: string | null;
};

type ShelfHistoryRow = {
  id: string;
  trimester: number | null;
  verdict_at_shelf_add: ShelfHistoryVerdict | null;
  shelf_category: ShelfCategory | null;
  products: ShelfHistoryProduct | ShelfHistoryProduct[] | null;
};

interface MonPlacardViewProps {
  highlightBarcode?: string;
}

type LocalShelfItem = {
  barcode: string;
  productName: string;
  brand?: string;
  category?: string;
  verdict?: string;
  savedAt: number;
  userId?: string;
  baby_product?: boolean;
};

export function MonPlacardView({ highlightBarcode }: MonPlacardViewProps) {
  const { userId, role, linkedUserId, linkedFirstName } = useProfile();
  const isPartner = role === 'partner' && !!linkedUserId;

  // Audit module 5 fix : la maman (non-partenaire) réutilise le hook partagé
  // useShelfData (Supabase scan_history + fallback AsyncStorage, déjà éprouvé
  // sur le home). AVANT, la branche `else` de l'effet de chargement faisait
  // `setProducts([])` sans JAMAIS lire son placard (et useProfile ne
  // destructurait même pas `userId`) → « Mon Placard » TOUJOURS vide pour la
  // persona principale. Le mode partenaire garde son chemin Supabase realtime.
  const { shelf: ownShelf, loading: ownLoading, reload: reloadOwnShelf } =
    useShelfData(isPartner ? undefined : userId);

  const [refreshing, setRefreshing] = useState(false);
  // Placard de la maman via Supabase realtime — mode partenaire uniquement.
  const [partnerProducts, setPartnerProducts] = useState<ShelfProduct[]>([]);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);
  const flatListRef = useRef<FlatList<ShelfProduct>>(null);
  const [isBabyMode, setIsBabyMode] = useState(false);
  const [babyProducts, setBabyProducts] = useState<LocalShelfItem[]>([]);

  // Source affichée selon le rôle.
  const products = isPartner ? partnerProducts : ownShelf;
  const isLoading = isPartner ? partnerLoading : ownLoading;

  useEffect(() => {
    getBabyMode().then(setIsBabyMode).catch(swallow);
  }, []);

  useEffect(() => {
    if (!isBabyMode) return;
    AsyncStorage.getItem(STORAGE_KEYS.shelf).then((raw) => {
      if (!raw) return;
      const all: LocalShelfItem[] = JSON.parse(raw);
      setBabyProducts(all.filter((item) => item.baby_product === true));
    }).catch(swallow);
  }, [isBabyMode]);

  useEffect(() => {
    // Mode maman : les données viennent de useShelfData (ci-dessus), rien à
    // faire ici. On ne gère que le placard partagé du partenaire + realtime.
    if (!(isPartner && isSupabaseConfigured && linkedUserId)) return;
    setPartnerLoading(true);
    loadMotherShelf(linkedUserId);
    const channel = supabase
      .channel(`shelf:${linkedUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scan_history',
          filter: `user_id=eq.${linkedUserId}`,
        },
        () => {
          loadMotherShelf(linkedUserId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isPartner, linkedUserId]);

  const loadMotherShelf = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('scan_history')
        .select(`
          id,
          trimester,
          verdict_at_shelf_add,
          shelf_category,
          products (
            id,
            name,
            brand
          )
        `)
        .eq('user_id', userId)
        .eq('in_shelf', true)
        .order('scanned_at', { ascending: false });

      if (error) throw error;

      const shelfProducts: ShelfProduct[] = ((data ?? []) as unknown as ShelfHistoryRow[])
        .map((row) => {
          const prod = Array.isArray(row.products) ? row.products[0] : row.products;
          return {
            id: row.id,
            name: prod?.name ?? 'Produit',
            brand: prod?.brand ?? '',
            verdict: row.verdict_at_shelf_add ?? 'unknown',
            verdictLabel: verdictLabel(row.verdict_at_shelf_add),
            category: row.shelf_category ?? undefined,
            verdictChanged: false,
          };
        });

      setPartnerProducts(shelfProducts);
    } catch (err) {
      if (__DEV__) console.warn('[MonPlacardView] loadMotherShelf error:', err);
    } finally {
      setPartnerLoading(false);
    }
  };

  useEffect(() => {
    if (!highlightBarcode || isLoading || products.length === 0) return;
    const idx = products.findIndex((p) => p.id === highlightBarcode);
    if (idx !== -1) {
      const rowIndex = Math.floor(idx / 2);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: rowIndex, animated: true, viewPosition: 0.3 });
      }, 400);
    }
  }, [highlightBarcode, isLoading, products]);

  const filteredProducts = React.useMemo(() => {
    let result = products;
    if (!filters.verdicts.includes('tous')) {
      result = result.filter((p) => filters.verdicts.includes(p.verdict as VerdictFilter));
    }
    if (filters.categories.length > 0) {
      result = result.filter((p) => p.category && filters.categories.includes(p.category));
    }
    result = [...result].sort((a, b) => {
      if (filters.sort === 'oldest') return a.id.localeCompare(b.id);
      return b.id.localeCompare(a.id);
    });
    return result;
  }, [products, filters]);

  // Lot 16-02 — Pull-to-refresh : recharge le shelf (partner = Supabase,
  // mom = local AsyncStorage déjà mémorisé par le hook parent).
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (isPartner && linkedUserId) {
        await loadMotherShelf(linkedUserId);
      } else {
        // Audit module 5 : vraie recharge via le hook (avant : un simple
        // setTimeout 600ms décoratif qui ne rechargeait rien).
        await reloadOwnShelf();
      }
    } finally {
      setRefreshing(false);
    }
  }, [isPartner, linkedUserId, reloadOwnShelf]);

  const compatibleCount = products.filter((p) => p.verdict === 'safe').length;
  const compatiblePercent = products.length > 0 ? Math.round((compatibleCount / products.length) * 100) : 0;

  const handlePress = useCallback((product: ShelfProduct) => {
    router.push(`/verdict/${encodeURIComponent(product.id)}`);
  }, []);

  const handleRemove = useCallback((product: ShelfProduct) => {
    if (isPartner) return;
    // Audit module 5 : la suppression est maintenant PERSISTÉE dans
    // AsyncStorage (avant : simple mutation du state local perdue au remount,
    // le produit "supprimé" réapparaissait). ShelfProduct.id === barcode.
    (async () => {
      try {
        const raw = (await AsyncStorage.getItem(STORAGE_KEYS.shelf)) ?? '[]';
        const all: LocalShelfItem[] = JSON.parse(raw);
        const next = all.filter((i) => i.barcode !== product.id);
        await AsyncStorage.setItem(STORAGE_KEYS.shelf, JSON.stringify(next));
      } catch (err) {
        swallow(err);
      }
      await reloadOwnShelf();
    })();
  }, [isPartner, reloadOwnShelf]);

  const handleChangeCategory = useCallback((_product: ShelfProduct) => {
  }, []);

  const noopRemove = useCallback((_product: ShelfProduct) => {}, []);

  const renderItem = useCallback(({ item }: { item: ShelfProduct }) => {
    const isHighlighted = !!highlightBarcode && item.id === highlightBarcode;
    const highlightStyle: ViewStyle = isHighlighted
      ? { borderWidth: 2, borderColor: Colors.accent, borderRadius: 12 }
      : {};
    return (
      <View style={[styles.cardWrapper, highlightStyle]}>
        <ShelfCard
          product={item}
          onPress={handlePress}
          onRemove={isPartner ? noopRemove : handleRemove}
          onChangeCategory={handleChangeCategory}
        />
      </View>
    );
  }, [handlePress, handleRemove, handleChangeCategory, highlightBarcode, isPartner, noopRemove]);


  const renderShimmer = useCallback(({ item }: { item: number }) => (
    <View style={styles.cardWrapper}>
      <ShimmerCard />
    </View>
  ), []);

  if (isLoading) {
    return (
      <View style={styles.root}>
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          renderItem={renderShimmer}
          keyExtractor={(item) => String(item)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, gap: Spacing.md }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.emptyRoot}>
        <IllustrationShelf size={180} />
        <ThemedText variant="headlineLarge" color="textPrimary" style={styles.emptyTitle}>
          {isPartner ? `Le placard de ${linkedFirstName ?? 'ta moitié'} est vide` : 'Ton placard est vide'}
        </ThemedText>
        <ThemedText variant="bodyMedium" color="textSecondary" style={styles.emptyBody}>
          {isPartner
            ? `Scanne des produits pour ${linkedFirstName ?? 'ta moitié'} et ajoute-les à son placard.`
            : 'Scanne tes produits et ajoute-les à ton placard pour les retrouver ici.'}
        </ThemedText>
        <Button variant="primary" onPress={() => router.push('/(tabs)/scan')}>
          Scanner un produit
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        ref={flatListRef}
        data={filteredProducts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{
          paddingHorizontal: Spacing.xl,
          paddingBottom: 120,
          gap: Spacing.md,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {isPartner && (
              <View style={styles.partnerLabel}>
                <Feather name="heart" size={14} color={Colors.accent} />
                <ThemedText variant="labelSmall" color="accent">
                  Placard de {linkedFirstName ?? 'ton proche'}
                </ThemedText>
              </View>
            )}
            <View style={styles.headerTop}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="displayMedium" color="textPrimary">
                  {isPartner ? `Placard de ${linkedFirstName ?? 'ton proche'}` : 'Mon Placard'}
                </ThemedText>
                <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: 4 }}>
                  {products.length} produits · {compatiblePercent}% compatibles
                </ThemedText>
              </View>
              <IconButton onPress={() => setFilterVisible(true)}>
                <Feather name="sliders" size={20} color={Colors.textSecondary} />
              </IconButton>
            </View>
          </View>
        }
      />

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={filters}
        onApply={setFilters}
      />

      {isBabyMode && babyProducts.length > 0 && (
        <View style={styles.babySection}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.babySectionLabel}>
            👶 PRODUITS BÉBÉ
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.babyScroll}>
            {babyProducts.map((item, i) => (
              <Card key={`${item.barcode}-${i}`} padding={Spacing.md} style={styles.babyCard}>
                <View style={[styles.babyVerdictDot, {
                  backgroundColor: item.verdict === 'safe' ? Colors.safe : item.verdict === 'danger' ? Colors.danger : Colors.caution,
                }]} />
                <ThemedText variant="bodyMedium" numberOfLines={2} style={{ flex: 1 }}>
                  {item.productName}
                </ThemedText>
                {item.brand ? (
                  <ThemedText variant="bodySmall" color="textTertiary" numberOfLines={1}>{item.brand}</ThemedText>
                ) : null}
              </Card>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Lot 16-13 — Hint discret pour éduquer au geste long-press.
          Affiché une seule fois (AsyncStorage flag), auto-dismiss 5s. */}
      <LongPressHint enabled={products.length > 0} />
    </View>
  );
}

function verdictLabel(verdict: string | null): string {
  switch (verdict) {
    case 'safe': return 'Sûr';
    case 'caution': return 'Vigilance';
    case 'danger': return 'Déconseillé';
    default: return 'Inconnu';
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  partnerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accentLight,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  row: {
    gap: Spacing.md,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: '50%',
  },
  emptyRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
    lineHeight: 22,
  },
  babySection: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    marginTop: Spacing.lg,
  },
  babySectionLabel: {
    marginBottom: Spacing.md,
  },
  babyScroll: {
    gap: Spacing.md,
    paddingRight: Spacing.xl,
  },
  babyCard: {
    width: 140,
    gap: Spacing.xs,
  },
  babyVerdictDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignSelf: 'flex-end',
  },
});
