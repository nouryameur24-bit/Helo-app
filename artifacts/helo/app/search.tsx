import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

const { width: W } = Dimensions.get('window');
const PREMIUM_KEY = '@helo_is_premium';
const SEARCH_MIN_CHARS = 3;
const DEBOUNCE_MS = 300;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  brand: string;
  category: 'cosmetic' | 'food' | 'medication';
  overall_risk: 'safe' | 'caution' | 'danger' | 'unknown';
  barcode: string | null;
}

interface Category {
  id: string;
  label: string;
  emoji: string;
  dbCategory: 'cosmetic' | 'food' | 'medication';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: 'visage',      label: 'Soins visage',  emoji: '🧴', dbCategory: 'cosmetic' },
  { id: 'corps',       label: 'Corps',          emoji: '🧼', dbCategory: 'cosmetic' },
  { id: 'cheveux',     label: 'Cheveux',        emoji: '💇', dbCategory: 'cosmetic' },
  { id: 'maquillage',  label: 'Maquillage',     emoji: '💄', dbCategory: 'cosmetic' },
  { id: 'fromages',    label: 'Fromages',       emoji: '🧀', dbCategory: 'food' },
  { id: 'viandes',     label: 'Viandes',        emoji: '🥩', dbCategory: 'food' },
  { id: 'poissons',    label: 'Poissons',       emoji: '🐟', dbCategory: 'food' },
  { id: 'plats',       label: 'Plats',          emoji: '🥗', dbCategory: 'food' },
  { id: 'medicaments', label: 'Médicaments',    emoji: '💊', dbCategory: 'medication' },
  { id: 'complements', label: 'Compléments',    emoji: '🌿', dbCategory: 'medication' },
];

const RISK_CONFIG: Record<string, { label: string; variant: 'safe' | 'caution' | 'danger' | 'accent' }> = {
  safe:    { label: 'Compatible',  variant: 'safe' },
  caution: { label: 'Précaution', variant: 'caution' },
  danger:  { label: 'À éviter',   variant: 'danger' },
  unknown: { label: 'Inconnu',    variant: 'accent' },
};

// ─── Search Bar ───────────────────────────────────────────────────────────────

function SearchBar({
  value,
  onChangeText,
  onClear,
  onFocus,
  onBlur,
  focused,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onClear: () => void;
  onFocus: () => void;
  onBlur: () => void;
  focused: boolean;
}) {
  return (
    <View
      style={[
        bar.wrap,
        focused && { borderColor: Colors.accent },
      ]}
    >
      <Feather
        name="search"
        size={18}
        color={focused ? Colors.accent : Colors.textTertiary}
        style={bar.icon}
      />
      <TextInput
        style={bar.input}
        placeholder="Rechercher un produit ou une marque…"
        placeholderTextColor={Colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <Pressable onPress={onClear} style={bar.clear}>
          <Feather name="x-circle" size={16} color={Colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Category Grid ────────────────────────────────────────────────────────────

function CategoryGrid({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <View style={cat.wrap}>
      <ThemedText variant="labelLarge" color="textPrimary" style={cat.title}>
        Parcourir par catégorie
      </ThemedText>
      <View style={cat.grid}>
        {CATEGORIES.map((c) => {
          const isActive = selected === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => onSelect(isActive ? null : c.id)}
              style={({ pressed }) => [
                cat.item,
                isActive && cat.itemActive,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <ThemedText style={cat.emoji}>{c.emoji}</ThemedText>
              <ThemedText
                variant="bodySmall"
                style={[cat.label, isActive && cat.labelActive]}
                numberOfLines={2}
              >
                {c.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Product Card (search result) ─────────────────────────────────────────────

function ProductCard({
  product,
  inShelf,
  index,
}: {
  product: Product;
  inShelf: boolean;
  index: number;
}) {
  const risk = RISK_CONFIG[product.overall_risk] ?? RISK_CONFIG.unknown;
  const catEmoji = CATEGORIES.find((c) => c.dbCategory === product.category)?.emoji ?? '📦';
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <Pressable
        style={({ pressed }) => [
          pc.wrap,
          { opacity: pressed ? 0.88 : 1 },
        ]}
        onPress={() => {
          if (product.barcode) {
            router.push(`/verdict/${product.barcode}`);
          }
        }}
      >
        {/* Icon */}
        <View style={pc.iconWrap}>
          <ThemedText style={pc.iconEmoji}>{catEmoji}</ThemedText>
        </View>

        {/* Info */}
        <View style={pc.info}>
          <View style={pc.nameRow}>
            <ThemedText variant="labelLarge" color="textPrimary" numberOfLines={1} style={{ flex: 1 }}>
              {product.name}
            </ThemedText>
            {inShelf && (
              <Animated.View entering={FadeIn} style={pc.shelfBadge}>
                <Feather name="archive" size={10} color={Colors.accent} />
                <ThemedText style={pc.shelfText}>Placard</ThemedText>
              </Animated.View>
            )}
          </View>
          <ThemedText variant="bodySmall" color="textTertiary">{product.brand}</ThemedText>
        </View>

        {/* Verdict */}
        <Badge variant={risk.variant}>{risk.label}</Badge>
      </Pressable>
    </Animated.View>
  );
}

// ─── Top Safe Carousel ────────────────────────────────────────────────────────

function TopSafeCarousel({ shelfIds }: { shelfIds: Set<string> }) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    supabase
      .from('products')
      .select('id, name, brand, category, overall_risk, barcode')
      .eq('overall_risk', 'safe')
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        setItems((data as Product[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View style={top.root}>
        <ThemedText variant="labelLarge" color="textPrimary" style={top.title}>
          Top produits sûrs
        </ThemedText>
        <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.lg }} />
      </View>
    );
  }

  if (items.length === 0) return null;

  return (
    <View style={top.root}>
      <ThemedText variant="labelLarge" color="textPrimary" style={top.title}>
        Top produits sûrs ✓
      </ThemedText>
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={top.list}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const catEmoji = CATEGORIES.find((c) => c.dbCategory === item.category)?.emoji ?? '📦';
          const inShelf = shelfIds.has(item.id);
          return (
            <Pressable
              style={({ pressed }) => [top.card, { opacity: pressed ? 0.88 : 1 }]}
              onPress={() => item.barcode && router.push(`/verdict/${item.barcode}`)}
            >
              <View style={top.cardTop}>
                <ThemedText style={top.cardEmoji}>{catEmoji}</ThemedText>
                {inShelf && (
                  <View style={top.cardShelfDot}>
                    <Feather name="archive" size={8} color={Colors.accent} />
                  </View>
                )}
              </View>
              <ThemedText
                variant="labelLarge"
                color="textPrimary"
                numberOfLines={2}
                style={top.cardName}
              >
                {item.name}
              </ThemedText>
              <ThemedText
                variant="bodySmall"
                color="textTertiary"
                numberOfLines={1}
              >
                {item.brand}
              </ThemedText>
              <View style={top.cardBadge}>
                <View style={top.dot} />
                <ThemedText style={top.cardBadgeText}>Compatible</ThemedText>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

// ─── Paywall Overlay ──────────────────────────────────────────────────────────

function PremiumOverlay({ onUnlock }: { onUnlock: () => void }) {
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={pay.root}
      pointerEvents="box-none"
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,250,245,0.88)' }]} />
      )}
      <View style={pay.card}>
        <View style={pay.crown}>
          <ThemedText style={pay.crownEmoji}>👑</ThemedText>
        </View>
        <ThemedText variant="headlineMedium" color="textPrimary" style={pay.title}>
          Recherche Premium
        </ThemedText>
        <ThemedText variant="bodyMedium" color="textSecondary" style={pay.body}>
          La recherche par nom est réservée aux abonnées Hēlo Premium.{'\n'}
          Parcourez les catégories et les tops gratuitement.
        </ThemedText>
        <Pressable
          style={({ pressed }) => [pay.btn, { opacity: pressed ? 0.88 : 1 }]}
          onPress={onUnlock}
        >
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            style={pay.btnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ThemedText style={pay.btnText}>Découvrir Premium — 4,99 €/mois</ThemedText>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── Empty States ─────────────────────────────────────────────────────────────

function EmptyResults({ query }: { query: string }) {
  return (
    <View style={empty.root}>
      <ThemedText style={empty.icon}>🔍</ThemedText>
      <ThemedText variant="headlineMedium" color="textPrimary" style={empty.title}>
        Aucun résultat
      </ThemedText>
      <ThemedText variant="bodyMedium" color="textSecondary" style={empty.body}>
        Aucun produit trouvé pour « {query} »{'\n'}
        Essayez un autre terme ou scannez le code-barres.
      </ThemedText>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

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

  // ── Load premium status & shelf IDs on mount
  useEffect(() => {
    AsyncStorage.getItem(PREMIUM_KEY).then((v) => setIsPremium(v === 'true'));
  }, []);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    supabase
      .from('scan_history')
      .select('product_id')
      .eq('user_id', userId)
      .eq('in_shelf', true)
      .then(({ data }) => {
        if (data) {
          setShelfIds(new Set(data.map((r: { product_id: string }) => r.product_id)));
        }
      });
  }, [userId]);

  // ── Debounce query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // ── Fetch search results (premium only)
  useEffect(() => {
    if (!isPremium || debouncedQuery.length < SEARCH_MIN_CHARS) {
      setResults([]);
      return;
    }
    if (!isSupabaseConfigured) return;

    setLoading(true);
    const q = debouncedQuery;
    supabase
      .from('products')
      .select('id, name, brand, category, overall_risk, barcode')
      .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
      .order('overall_risk', { ascending: true })
      .limit(30)
      .then(({ data }) => {
        setResults((data as Product[]) ?? []);
        setLoading(false);
      });
  }, [debouncedQuery, isPremium]);

  // ── Fetch category results
  const selectedCategory = CATEGORIES.find((c) => c.id === selectedCategoryId) ?? null;

  useEffect(() => {
    if (!selectedCategory) { setCategoryResults([]); return; }
    if (!isSupabaseConfigured) return;

    setLoading(true);
    supabase
      .from('products')
      .select('id, name, brand, category, overall_risk, barcode')
      .eq('category', selectedCategory.dbCategory)
      .order('overall_risk', { ascending: true })
      .limit(30)
      .then(({ data }) => {
        setCategoryResults((data as Product[]) ?? []);
        setLoading(false);
      });
  }, [selectedCategoryId]);

  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    Keyboard.dismiss();
  }, []);

  const handleUnlockPremium = useCallback(async () => {
    // Stores premium flag locally; full RevenueCat paywall is in paywall.tsx
    await AsyncStorage.setItem(PREMIUM_KEY, 'true');
    setIsPremium(true);
  }, []);

  // ── Which list to show
  const showSearchResults = isPremium && debouncedQuery.length >= SEARCH_MIN_CHARS;
  const showCategoryResults = !!selectedCategory && !showSearchResults;
  const showPaywall = !isPremium && debouncedQuery.length >= SEARCH_MIN_CHARS;
  const showBrowse = !showSearchResults && !showCategoryResults;

  const displayList = showSearchResults ? results : showCategoryResults ? categoryResults : [];

  return (
    <View style={[scr.root, { backgroundColor: Colors.background }]}>
      {/* ── Sticky header ── */}
      <View
        style={[
          scr.header,
          { paddingTop: insets.top + Spacing.sm },
        ]}
      >
        <View style={scr.headerRow}>
          <Pressable onPress={() => router.back()} style={scr.backBtn}>
            <Feather name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <ThemedText variant="headlineMedium" color="textPrimary">Recherche</ThemedText>
          {isPremium ? (
            <View style={scr.premBadge}>
              <Feather name="star" size={12} color={Colors.accent} />
              <ThemedText style={scr.premText}>Premium</ThemedText>
            </View>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        {/* Search bar (sticky) */}
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

        {/* Hint */}
        {!isPremium && (
          <View style={scr.hint}>
            <Feather name="lock" size={12} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginLeft: 5 }}>
              La recherche par nom est réservée aux abonnées Premium
            </ThemedText>
          </View>
        )}
      </View>

      {/* ── Main content ── */}
      <View style={{ flex: 1 }}>
        {/* Browse mode */}
        {(showBrowse || showPaywall) && (
          <ScrollView
            contentContainerStyle={[
              scr.scroll,
              { paddingBottom: insets.bottom + 100 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <CategoryGrid
              selected={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
            <TopSafeCarousel shelfIds={shelfIds} />
          </ScrollView>
        )}

        {/* Search / category results */}
        {(showSearchResults || showCategoryResults) && (
          <View style={{ flex: 1 }}>
            {loading ? (
              <View style={scr.loadingWrap}>
                <ActivityIndicator color={Colors.accent} size="large" />
              </View>
            ) : displayList.length === 0 ? (
              <EmptyResults query={debouncedQuery || (selectedCategory?.label ?? '')} />
            ) : (
              <FlatList
                data={displayList}
                keyExtractor={(item) => item.id}
                maxToRenderPerBatch={10}
                initialNumToRender={8}
                removeClippedSubviews
                contentContainerStyle={[
                  scr.scroll,
                  { paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                  showCategoryResults && selectedCategory ? (
                    <View style={scr.catHeader}>
                      <ThemedText style={scr.catHeaderEmoji}>{selectedCategory.emoji}</ThemedText>
                      <ThemedText variant="headlineMedium" color="textPrimary">
                        {selectedCategory.label}
                      </ThemedText>
                      <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
                        {displayList.length} produit{displayList.length > 1 ? 's' : ''}
                      </ThemedText>
                    </View>
                  ) : null
                }
                renderItem={({ item, index }) => (
                  <ProductCard
                    product={item}
                    inShelf={shelfIds.has(item.id)}
                    index={index}
                  />
                )}
                ItemSeparatorComponent={() => <View style={scr.sep} />}
              />
            )}
          </View>
        )}

        {/* Premium paywall overlay — sits above browse content */}
        {showPaywall && (
          <PremiumOverlay onUnlock={handleUnlockPremium} />
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const scr = StyleSheet.create({
  root: { flex: 1 },
  header: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    zIndex: 10,
    ...Shadows.soft,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  premBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  premText: { ...Typography.labelSmall, color: Colors.accentDark },
  barWrap: { marginBottom: Spacing.xs },
  hint: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, gap: Spacing.xl },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  catHeader: { alignItems: 'center', paddingBottom: Spacing.xl },
  catHeaderEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  sep: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.xl },
});

const bar = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    height: 50,
    ...Shadows.soft,
  },
  icon: { marginRight: Spacing.sm },
  input: {
    flex: 1,
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    paddingVertical: 0,
    height: 50,
  },
  clear: { padding: Spacing.xs, marginLeft: Spacing.xs },
});

const cat = StyleSheet.create({
  wrap: {},
  title: { marginBottom: Spacing.md },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  item: {
    width: (W - Spacing.xl * 2 - Spacing.md * 4) / 5,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    ...Shadows.soft,
  },
  itemActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  emoji: { fontSize: 24, marginBottom: 4 },
  label: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 10,
  },
  labelActive: { color: Colors.accentDark },
});

const pc = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
  },
  iconWrap: {
    width: 46, height: 46,
    borderRadius: Radius.md,
    backgroundColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 22 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  shelfBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  shelfText: { ...Typography.labelSmall, color: Colors.accent, fontSize: 9 },
});

const top = StyleSheet.create({
  root: {},
  title: { marginBottom: Spacing.md },
  list: { gap: Spacing.md, paddingRight: Spacing.xl },
  card: {
    width: 140,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.soft,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardEmoji: { fontSize: 28 },
  cardShelfDot: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: { marginBottom: 2 },
  cardBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: Spacing.sm,
  },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: Colors.safe,
  },
  cardBadgeText: { ...Typography.labelSmall, color: Colors.safe, fontSize: 10 },
});

const pay = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    paddingHorizontal: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    width: '100%',
    alignItems: 'center',
    ...Shadows.elevated,
  },
  crown: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.accentLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  crownEmoji: { fontSize: 28 },
  title: { textAlign: 'center', marginBottom: Spacing.sm },
  body: { textAlign: 'center', marginBottom: Spacing.xxl, lineHeight: 22 },
  btn: { width: '100%', borderRadius: Radius.full, overflow: 'hidden' },
  btnGrad: {
    paddingVertical: 16, paddingHorizontal: 24,
    borderRadius: Radius.full, alignItems: 'center',
  },
  btnText: { ...Typography.labelLarge, color: '#fff' },
});

const empty = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  icon: { fontSize: 48, marginBottom: Spacing.lg },
  title: { textAlign: 'center', marginBottom: Spacing.sm },
  body: { textAlign: 'center', lineHeight: 22 },
});
