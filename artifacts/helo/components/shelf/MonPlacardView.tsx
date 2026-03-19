import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

import { IllustrationShelf } from '@/components/illustrations/IllustrationShelf';
import { FilterSheet, FilterState, DEFAULT_FILTERS } from '@/components/shelf/FilterSheet';
import { ShelfCard, ShelfProduct } from '@/components/shelf/ShelfCard';
import { ShimmerCard } from '@/components/shelf/ShimmerCard';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';

interface MonPlacardViewProps {
  highlightBarcode?: string;
}

const MOCK_PRODUCTS: ShelfProduct[] = [
  { id: '1', name: 'Crème hydratante Nuxe', brand: 'NUXE', verdict: 'safe', verdictLabel: 'Sûr', category: 'salle-de-bain', verdictChanged: false },
  { id: '2', name: 'Shampooing doux', brand: 'KLORANE', verdict: 'caution', verdictLabel: 'Vigilance', category: 'salle-de-bain', verdictChanged: true },
  { id: '3', name: 'Gel douche aloe vera', brand: 'GARNIER', verdict: 'safe', verdictLabel: 'Sûr', category: 'salle-de-bain', verdictChanged: false },
  { id: '4', name: 'Sérum vitamine C', brand: 'VICHY', verdict: 'safe', verdictLabel: 'Sûr', category: 'pharmacie', verdictChanged: false },
  { id: '5', name: 'Fond de teint Bourjois', brand: 'BOURJOIS', verdict: 'danger', verdictLabel: 'Déconseillé', category: 'salle-de-bain', verdictChanged: true },
  { id: '6', name: 'Huile de coco bio', brand: 'NATURALIA', verdict: 'safe', verdictLabel: 'Sûr', category: 'cuisine', verdictChanged: false },
];

export function MonPlacardView({ highlightBarcode }: MonPlacardViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<ShelfProduct[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);
  const flatListRef = useRef<FlatList<ShelfProduct>>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setProducts(MOCK_PRODUCTS);
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

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
      result = result.filter((p) => filters.verdicts.includes(p.verdict as any));
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

  const compatibleCount = products.filter((p) => p.verdict === 'safe').length;
  const compatiblePercent = products.length > 0 ? Math.round((compatibleCount / products.length) * 100) : 0;

  const handlePress = useCallback((product: ShelfProduct) => {
    router.push(`/verdict/${encodeURIComponent(product.id)}`);
  }, []);

  const handleRemove = useCallback((product: ShelfProduct) => {
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
  }, []);

  const handleChangeCategory = useCallback((_product: ShelfProduct) => {
  }, []);

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
          onRemove={handleRemove}
          onChangeCategory={handleChangeCategory}
        />
      </View>
    );
  }, [handlePress, handleRemove, handleChangeCategory, highlightBarcode]);

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
          Votre placard est vide
        </ThemedText>
        <ThemedText variant="bodyMedium" color="textSecondary" style={styles.emptyBody}>
          Scannez vos produits et ajoutez-les à votre placard pour les retrouver ici.
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
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="displayMedium" color="textPrimary">
                  Mon Placard
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.lg,
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
});
