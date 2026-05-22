import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

import SearchBar from '@/components/search/SearchBar';
import CategoryGrid from '@/components/search/CategoryGrid';
import ProductCard from '@/components/search/ProductCard';
import TopSafeCarousel from '@/components/search/TopSafeCarousel';
import PremiumOverlay from '@/components/search/PremiumOverlay';
import { scr, empty, CATEGORIES, type Product } from '@/components/search/searchStyles';
import { STORAGE_KEYS } from '@/lib/storageKeys';

const PREMIUM_KEY = STORAGE_KEYS.isPremium;
const SEARCH_MIN_CHARS = 3;
const DEBOUNCE_MS = 300;

function EmptyResults({ query }: { query: string }) {
  return (
    <View style={empty.root}>
      <ThemedText style={empty.icon}>🔍</ThemedText>
      <ThemedText variant="headlineMedium" color="textPrimary" style={empty.title}>Aucun résultat</ThemedText>
      <ThemedText variant="bodyMedium" color="textSecondary" style={empty.body}>
        Aucun produit trouvé pour « {query} »{'\n'}
        Essayez un autre terme ou scannez le code-barres.
      </ThemedText>
    </View>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useProfile();

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [categoryResults, setCategoryResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [shelfIds, setShelfIds] = useState<Set<string>>(new Set());
  const [isPremium, setIsPremium] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { AsyncStorage.getItem(PREMIUM_KEY).then((v) => setIsPremium(v === 'true')); }, []);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    supabase
      .from('scan_history').select('product_id').eq('user_id', userId).eq('in_shelf', true)
      .then(({ data }) => { if (data) setShelfIds(new Set(data.map((r: { product_id: string }) => r.product_id))); });
  }, [userId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    if (!isPremium || debouncedQuery.length < SEARCH_MIN_CHARS) { setResults([]); return; }
    if (!isSupabaseConfigured) return;
    setLoading(true);
    supabase.from('products').select('id, name, brand, category, overall_risk, barcode')
      .or(`name.ilike.%${debouncedQuery}%,brand.ilike.%${debouncedQuery}%`)
      .order('overall_risk', { ascending: true }).limit(30)
      .then(({ data }) => { setResults((data as Product[]) ?? []); setLoading(false); });
  }, [debouncedQuery, isPremium]);

  const selectedCategory = CATEGORIES.find((c) => c.id === selectedCategoryId) ?? null;

  useEffect(() => {
    if (!selectedCategory) { setCategoryResults([]); return; }
    if (!isSupabaseConfigured) return;
    setLoading(true);
    supabase.from('products').select('id, name, brand, category, overall_risk, barcode')
      .eq('category', selectedCategory.dbCategory).order('overall_risk', { ascending: true }).limit(30)
      .then(({ data }) => { setCategoryResults((data as Product[]) ?? []); setLoading(false); });
  }, [selectedCategoryId]);

  const handleClear = useCallback(() => { setQuery(''); setDebouncedQuery(''); setResults([]); Keyboard.dismiss(); }, []);
  const handleUnlockPremium = useCallback(async () => { await AsyncStorage.setItem(PREMIUM_KEY, 'true'); setIsPremium(true); }, []);

  const showSearchResults = isPremium && debouncedQuery.length >= SEARCH_MIN_CHARS;
  const showCategoryResults = !!selectedCategory && !showSearchResults;
  const showPaywall = !isPremium && debouncedQuery.length >= SEARCH_MIN_CHARS;
  const displayList = showSearchResults ? results : showCategoryResults ? categoryResults : [];

  return (
    <View style={[scr.root, { backgroundColor: Colors.background }]}>
      <View style={[scr.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={scr.headerRow}>
          <Pressable onPress={() => router.back()} style={scr.backBtn} accessibilityRole="button" accessibilityLabel="Retour">
            <Feather name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <ThemedText variant="headlineMedium" color="textPrimary">Recherche</ThemedText>
          {isPremium ? (
            <View style={scr.premBadge}>
              <Feather name="star" size={12} color={Colors.accent} />
              <ThemedText style={scr.premText}>Premium</ThemedText>
            </View>
          ) : <View style={{ width: 44 }} />}
        </View>
        <View style={scr.barWrap}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onClear={handleClear}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            focused={focused}
          />
        </View>
        {!isPremium && (
          <View style={scr.hint}>
            <Feather name="lock" size={12} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginLeft: 5 }}>
              La recherche par nom est réservée aux abonnées Premium
            </ThemedText>
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        {(showPaywall || (!showSearchResults && !showCategoryResults)) && (
          <ScrollView
            contentContainerStyle={[scr.scroll, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <CategoryGrid selected={selectedCategoryId} onSelect={setSelectedCategoryId} />
            <TopSafeCarousel shelfIds={shelfIds} />
          </ScrollView>
        )}

        {(showSearchResults || showCategoryResults) && (
          <View style={{ flex: 1 }}>
            {loading ? (
              <View style={scr.loadingWrap}><ActivityIndicator color={Colors.accent} size="large" /></View>
            ) : displayList.length === 0 ? (
              <EmptyResults query={debouncedQuery || (selectedCategory?.label ?? '')} />
            ) : (
              <FlatList
                data={displayList}
                keyExtractor={(item) => item.id}
                maxToRenderPerBatch={10}
                initialNumToRender={8}
                removeClippedSubviews
                contentContainerStyle={[scr.scroll, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                  showCategoryResults && selectedCategory ? (
                    <View style={scr.catHeader}>
                      <ThemedText style={scr.catHeaderEmoji}>{selectedCategory.emoji}</ThemedText>
                      <ThemedText variant="headlineMedium" color="textPrimary">{selectedCategory.label}</ThemedText>
                      <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
                        {displayList.length} produit{displayList.length > 1 ? 's' : ''}
                      </ThemedText>
                    </View>
                  ) : null
                }
                renderItem={({ item, index }) => (
                  <ProductCard product={item} inShelf={shelfIds.has(item.id)} index={index} />
                )}
                ItemSeparatorComponent={() => <View style={scr.sep} />}
              />
            )}
          </View>
        )}

        {showPaywall && <PremiumOverlay onUnlock={handleUnlockPremium} />}
      </View>
    </View>
  );
}
