import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Circle, Line, G } from 'react-native-svg';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
import {
  AlternativeProduct,
  getAlternativesByBarcode,
  submitAlternativeSuggestion,
} from '@/lib/alternatives';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;
const CARD_GAP = 12;

function MagnifyingGlassIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      <Circle cx={50} cy={50} r={30} stroke={Colors.accent} strokeWidth={4} fill="none" />
      <Circle cx={50} cy={50} r={22} stroke={Colors.accentLight} strokeWidth={2} fill={Colors.accentLight} opacity={0.3} />
      <Line x1={72} y1={72} x2={100} y2={100} stroke={Colors.accent} strokeWidth={6} strokeLinecap="round" />
      <G>
        <Circle cx={42} cy={42} r={4} fill={Colors.accent} opacity={0.5} />
        <Circle cx={55} cy={38} r={3} fill={Colors.accent} opacity={0.3} />
      </G>
    </Svg>
  );
}

function OriginalProductHeader({ productName, productBrand }: { productName: string; productBrand: string }) {
  return (
    <Card style={styles.originalCard} padding={Spacing.lg}>
      <View style={styles.originalRow}>
        <View style={styles.originalIconCircle}>
          <Feather name="x-circle" size={20} color={Colors.danger} />
        </View>
        <View style={styles.originalInfo}>
          <ThemedText
            variant="bodyMedium"
            style={styles.struckText}
            numberOfLines={1}
          >
            {productName}
          </ThemedText>
          {productBrand ? (
            <ThemedText variant="bodySmall" color="textTertiary" numberOfLines={1}>
              {productBrand}
            </ThemedText>
          ) : null}
        </View>
        <Badge variant="danger">Déconseillé</Badge>
      </View>
    </Card>
  );
}

function AlternativeCard({
  alt,
  onViewDetail,
  onAddToList,
  locked,
  onUnlock,
}: {
  alt: AlternativeProduct;
  onViewDetail: () => void;
  onAddToList: () => void;
  locked?: boolean;
  onUnlock?: () => void;
}) {
  return (
    <View style={{ width: CARD_WIDTH }}>
      <Card style={styles.altCard} variant="elevated" padding={0}>
        <View style={styles.altImageContainer}>
          <View style={styles.altImagePlaceholder}>
            <Feather name="package" size={40} color={Colors.textTertiary} />
          </View>
        </View>

        <View style={styles.altContent}>
          <ThemedText variant="headlineMedium" numberOfLines={2}>
            {alt.name}
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" numberOfLines={1}>
            {alt.brand}
          </ThemedText>

          <View style={styles.altBadgeRow}>
            <Badge variant="safe">Compatible ✓</Badge>
            {alt.price_range ? <Badge variant="accent">{alt.price_range}</Badge> : null}
          </View>

          {alt.description_fr ? (
            <ThemedText
              variant="bodySmall"
              color="textSecondary"
              style={{ marginTop: Spacing.sm }}
              numberOfLines={2}
            >
              {alt.description_fr}
            </ThemedText>
          ) : null}

          <Divider style={{ marginVertical: Spacing.md }} />

          <View style={styles.altActions}>
            {alt.barcode ? (
              <Button variant="ghost" onPress={onViewDetail}>
                Voir le détail
              </Button>
            ) : null}
            <Button variant="secondary" onPress={onAddToList}>
              Ajouter à ma liste
            </Button>
          </View>
        </View>
      </Card>

      {locked ? (
        <BlurView intensity={28} tint="light" style={styles.lockOverlay}>
          <View style={styles.lockBadge}>
            <Feather name="lock" size={16} color={Colors.accent} />
            <ThemedText variant="bodySmall" color="accent" style={{ marginLeft: 6 }}>
              Premium
            </ThemedText>
          </View>
          <Button variant="primary" onPress={onUnlock}>
            Débloquer
          </Button>
        </BlurView>
      ) : null}
    </View>
  );
}

function DotIndicators({ count, activeIndex }: { count: number; activeIndex: number }) {
  if (count <= 1) return null;
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === activeIndex ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'cosmetic', label: 'Cosmétique' },
  { value: 'food', label: 'Alimentation' },
  { value: 'medication', label: 'Médicament' },
];

function SuggestionForm({ category: defaultCategory }: { category: string }) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !brand.trim()) {
      Alert.alert('Champs requis', 'Veuillez remplir le nom et la marque.');
      return;
    }
    setSubmitting(true);
    const result = await submitAlternativeSuggestion(name.trim(), brand.trim(), selectedCategory);
    setSubmitting(false);
    if (result.success) {
      setSubmitted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert('Erreur', result.error || 'Une erreur est survenue.');
    }
  };

  if (submitted) {
    return (
      <Card style={styles.suggestionCard} padding={Spacing.xl}>
        <View style={styles.suggestionSuccess}>
          <Feather name="check-circle" size={32} color={Colors.safe} />
          <ThemedText variant="bodyLarge" style={{ textAlign: 'center', marginTop: Spacing.md }}>
            Merci pour votre suggestion !
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.xs }}>
            Notre équipe la vérifiera prochainement.
          </ThemedText>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.suggestionCard} padding={Spacing.xl}>
      <ThemedText variant="bodyLarge" style={{ marginBottom: Spacing.md }}>
        Proposer une alternative
      </ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Nom du produit"
        placeholderTextColor={Colors.textTertiary}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Marque"
        placeholderTextColor={Colors.textTertiary}
        value={brand}
        onChangeText={setBrand}
      />
      <View style={styles.categoryRow}>
        {CATEGORY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.categoryChip,
              selectedCategory === opt.value && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(opt.value)}
          >
            <ThemedText
              variant="bodySmall"
              color={selectedCategory === opt.value ? 'accent' : 'textSecondary'}
            >
              {opt.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
      <Button
        variant="primary"
        fullWidth
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
      >
        Envoyer ma suggestion
      </Button>
    </Card>
  );
}

function EmptyState({ category }: { category: string }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <View style={styles.emptyContainer}>
      <MagnifyingGlassIllustration />
      <ThemedText variant="headlineMedium" style={{ textAlign: 'center', marginTop: Spacing.xl }}>
        Pas encore d'alternatives
      </ThemedText>
      <ThemedText variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.sm, paddingHorizontal: Spacing.xl }}>
        Pas d'alternative dans notre base. Scannez d'autres produits pour enrichir la communauté 🤍
      </ThemedText>

      {!showForm ? (
        <View style={{ marginTop: Spacing.xl }}>
          <Button variant="ghost" onPress={() => setShowForm(true)}>
            Suggérer une alternative
          </Button>
        </View>
      ) : (
        <View style={{ marginTop: Spacing.xl, width: '100%', paddingHorizontal: Spacing.lg }}>
          <SuggestionForm category={category} />
        </View>
      )}
    </View>
  );
}

export default function AlternativesScreen() {
  const params = useLocalSearchParams<{
    barcode: string;
    category: string;
    productName: string;
    productBrand: string;
    flagged: string;
  }>();

  const normalize = (v: string | string[] | undefined): string =>
    Array.isArray(v) ? v[0] ?? '' : v ?? '';

  const barcode = normalize(params.barcode);
  const category = normalize(params.category) || 'cosmetic';
  const productName = normalize(params.productName) || 'Produit';
  const productBrand = normalize(params.productBrand);
  const flaggedRaw = normalize(params.flagged);
  const flaggedNames = flaggedRaw ? flaggedRaw.split('|').filter(Boolean) : [];

  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const results = await getAlternativesByBarcode(barcode, flaggedNames, 2);
      setAlternatives(results);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcode, flaggedRaw]);

  const handleUnlock = useCallback(() => {
    router.push('/paywall');
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    setActiveIndex(index);
  }, []);

  const handleViewDetail = useCallback((barcode: string | null) => {
    if (barcode) {
      router.push(`/verdict/${encodeURIComponent(barcode)}`);
    }
  }, []);

  const handleAddToList = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Bientôt disponible', 'Cette fonctionnalité arrive prochainement !');
  }, []);

  const topPad = Platform.OS === 'web' ? 60 : insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: topPad }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Feather name="x" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="headlineMedium" style={styles.headerTitle}>
          The Swap
        </ThemedText>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <OriginalProductHeader productName={productName} productBrand={productBrand} />

        <ThemedText variant="bodyMedium" color="textSecondary" style={styles.subtitle}>
          Alternatives compatibles avec votre grossesse
        </ThemedText>

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCircle} />
            <ThemedText variant="bodyMedium" color="textSecondary">
              Recherche d'alternatives…
            </ThemedText>
          </View>
        ) : alternatives.length === 0 ? (
          <EmptyState category={category} />
        ) : (
          <>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled={false}
              snapToInterval={CARD_WIDTH + CARD_GAP}
              snapToAlignment="start"
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {alternatives.map((alt, idx) => {
                const locked = !isPremium && idx >= 1;
                return (
                  <AlternativeCard
                    key={alt.id}
                    alt={alt}
                    locked={locked}
                    onUnlock={handleUnlock}
                    onViewDetail={() => handleViewDetail(alt.barcode)}
                    onAddToList={handleAddToList}
                  />
                );
              })}
            </ScrollView>

            <DotIndicators count={alternatives.length} activeIndex={activeIndex} />

            {!isPremium && alternatives.length > 1 ? (
              <View style={styles.unlockCta}>
                <Button variant="primary" fullWidth onPress={handleUnlock}>
                  Débloquer toutes les alternatives — Premium
                </Button>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.massive,
  },
  originalCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    backgroundColor: Colors.dangerBg,
    borderWidth: 1,
    borderColor: Colors.dangerLight,
  },
  originalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  originalIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  originalInfo: {
    flex: 1,
  },
  struckText: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  subtitle: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  carouselContent: {
    paddingHorizontal: 32,
    gap: CARD_GAP,
  },
  altCard: {
    overflow: 'hidden',
  },
  altImageContainer: {
    height: 200,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  altImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
  },
  altContent: {
    padding: Spacing.xl,
    gap: Spacing.xs,
  },
  altBadgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  altPopularityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  altActions: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(255, 250, 245, 0.45)',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    ...Shadows.soft,
  },
  unlockCta: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Colors.accent,
  },
  dotInactive: {
    backgroundColor: Colors.borderLight,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.giant,
    gap: Spacing.lg,
  },
  loadingCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accentLight,
  },
  suggestionCard: {
    marginTop: Spacing.md,
  },
  suggestionSuccess: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  categoryChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  categoryChipActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
});
