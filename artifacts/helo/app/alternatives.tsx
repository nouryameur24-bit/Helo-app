import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
import {
  AlternativeProduct,
  IngredientExplanation,
  OriginBadge,
  getAlternativesByBarcode,
  getIngredientExplanations,
  submitAlternativeSuggestion,
} from '@/lib/alternatives';
import type { Trimester } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;
const CARD_GAP = 12;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function safeParseStringArray(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return raw.split('|').filter(Boolean);
  }
}

function originBadgeMeta(badge: OriginBadge): { emoji: string; label: string; color: string } | null {
  switch (badge) {
    case 'pharmacy': return { emoji: '💊', label: 'Pharmacie', color: Colors.accent };
    case 'french':   return { emoji: '🇫🇷', label: 'Marque française', color: Colors.textSecondary };
    case 'bio':      return { emoji: '🌿', label: 'Bio', color: Colors.safe };
    default:         return null;
  }
}

function buildIngredientReasons(
  flaggedExplanations: IngredientExplanation[],
): IngredientExplanation[] {
  return flaggedExplanations.filter((e) => e.description && e.description.length > 0).slice(0, 3);
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function OriginBadgePill({ badge }: { badge: OriginBadge }) {
  const meta = originBadgeMeta(badge);
  if (!meta) return null;
  return (
    <View style={[styles.originPill, { borderColor: meta.color }]}>
      <ThemedText variant="bodySmall" style={{ color: meta.color }}>
        {meta.emoji} {meta.label}
      </ThemedText>
    </View>
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
          <ThemedText variant="bodyMedium" style={styles.struckText} numberOfLines={1}>
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
  isPremium,
  ingredientReasons,
  trimester,
  onViewDetail,
  onAddToList,
}: {
  alt: AlternativeProduct;
  isPremium: boolean;
  ingredientReasons: IngredientExplanation[];
  trimester: Trimester;
  onViewDetail: () => void;
  onAddToList: () => void;
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
            <Badge variant={alt.overall_risk === 'safe' ? 'safe' : 'caution'}>
              {alt.overall_risk === 'safe' ? 'Compatible ✓' : 'À surveiller'}
            </Badge>
            <OriginBadgePill badge={alt.origin_badge} />
          </View>

          {isPremium ? (
            <View style={styles.premiumExplanationBox}>
              <View style={styles.premiumExplanationHeader}>
                <Feather name="shield" size={14} color={Colors.accent} />
                <ThemedText
                  variant="bodySmall"
                  style={{ marginLeft: 6, fontWeight: '600', color: Colors.accent }}
                >
                  Pourquoi c&apos;est compatible · T{trimester}
                </ThemedText>
              </View>
              {ingredientReasons.length > 0 ? (
                ingredientReasons.map((r) => (
                  <View key={r.name} style={styles.premiumReasonRow}>
                    <Feather name="check" size={12} color={Colors.safe} style={{ marginTop: 3 }} />
                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <ThemedText variant="bodySmall" style={{ fontWeight: '600' }}>
                        Sans {r.name}
                      </ThemedText>
                      <ThemedText
                        variant="bodySmall"
                        color="textSecondary"
                        style={{ lineHeight: 16, marginTop: 2 }}
                      >
                        {r.description}
                      </ThemedText>
                    </View>
                  </View>
                ))
              ) : (
                <ThemedText
                  variant="bodySmall"
                  color="textSecondary"
                  style={{ marginTop: 4, lineHeight: 16 }}
                >
                  Validé selon le CRAT — aucun ingrédient à risque détecté pour votre trimestre.
                </ThemedText>
              )}
            </View>
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
          style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
        />
      ))}
    </View>
  );
}

function PremiumUpgradeCard({ trimester, onPress }: { trimester: Trimester; onPress: () => void }) {
  return (
    <Card style={styles.premiumCard} padding={Spacing.xl}>
      <View style={styles.premiumHeader}>
        <ThemedText variant="headlineMedium">💎 Avec Premium</ThemedText>
      </View>
      <View style={styles.premiumBenefit}>
        <Feather name="check" size={16} color={Colors.accent} />
        <ThemedText variant="bodyMedium" style={styles.premiumBenefitText}>
          Explication détaillée par ingrédient (sources CRAT)
        </ThemedText>
      </View>
      <View style={styles.premiumBenefit}>
        <Feather name="check" size={16} color={Colors.accent} />
        <ThemedText variant="bodyMedium" style={styles.premiumBenefitText}>
          Filtrage adapté à ton trimestre actuel (T{trimester})
        </ThemedText>
      </View>
      <View style={styles.premiumBenefit}>
        <Feather name="check" size={16} color={Colors.accent} />
        <ThemedText variant="bodyMedium" style={styles.premiumBenefitText}>
          Jusqu&apos;à 5 alternatives au lieu de 3
        </ThemedText>
      </View>
      <View style={{ height: Spacing.md }} />
      <Button variant="primary" fullWidth onPress={onPress}>
        Essayer 7 jours gratuit →
      </Button>
    </Card>
  );
}

// ─── EDUCATIONAL EMPTY STATE ──────────────────────────────────────────────────

function IngredientExplanationCard({
  ingredient,
  level,
}: {
  ingredient: IngredientExplanation;
  level: 'danger' | 'caution';
}) {
  const isDanger = level === 'danger';
  const cardStyle = {
    backgroundColor: isDanger ? Colors.dangerBg : Colors.backgroundSecondary,
    borderColor: isDanger ? Colors.dangerLight : Colors.borderLight,
    borderWidth: 1,
  };
  return (
    <Card style={cardStyle} padding={Spacing.md}>
      <View style={styles.explanationHeader}>
        <Feather
          name={isDanger ? 'x-octagon' : 'alert-triangle'}
          size={16}
          color={isDanger ? Colors.danger : Colors.textSecondary}
        />
        <ThemedText
          variant="bodyMedium"
          style={{ marginLeft: 6, fontWeight: '600', flex: 1 }}
          numberOfLines={1}
        >
          {ingredient.name}
        </ThemedText>
      </View>
      {ingredient.description ? (
        <ThemedText
          variant="bodySmall"
          color="textSecondary"
          style={{ marginTop: 4, lineHeight: 18 }}
        >
          {ingredient.description}
        </ThemedText>
      ) : (
        <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 4, fontStyle: 'italic' }}>
          À éviter pendant la grossesse selon nos sources.
        </ThemedText>
      )}
    </Card>
  );
}

function EducationalEmptyState({
  dangerExplanations,
  cautionExplanations,
  onSuggest,
  showForm,
  category,
}: {
  dangerExplanations: IngredientExplanation[];
  cautionExplanations: IngredientExplanation[];
  onSuggest: () => void;
  showForm: boolean;
  category: string;
}) {
  const hasAny = dangerExplanations.length > 0 || cautionExplanations.length > 0;
  return (
    <View style={styles.emptyContainer}>
      <ThemedText variant="headlineMedium" style={{ textAlign: 'center' }}>
        📋 Pas d&apos;alternative dans notre base
      </ThemedText>
      <ThemedText
        variant="bodyMedium"
        color="textSecondary"
        style={{ textAlign: 'center', marginTop: Spacing.sm, paddingHorizontal: Spacing.lg }}
      >
        {hasAny
          ? 'Pour t\'aider à choisir, voici les ingrédients à éviter sur les autres produits de cette catégorie :'
          : 'Scanne d\'autres produits pour enrichir la base communautaire.'}
      </ThemedText>

      {dangerExplanations.length > 0 ? (
        <View style={styles.explanationList}>
          {dangerExplanations.map((ing) => (
            <IngredientExplanationCard key={`d-${ing.name}`} ingredient={ing} level="danger" />
          ))}
        </View>
      ) : null}

      {cautionExplanations.length > 0 ? (
        <View style={styles.explanationList}>
          {cautionExplanations.map((ing) => (
            <IngredientExplanationCard key={`c-${ing.name}`} ingredient={ing} level="caution" />
          ))}
        </View>
      ) : null}

      <ThemedText
        variant="bodySmall"
        color="textSecondary"
        style={{ textAlign: 'center', marginTop: Spacing.xl, paddingHorizontal: Spacing.lg }}
      >
        Scanne d&apos;autres produits — tu enrichis la communauté à chaque scan 🤍
      </ThemedText>

      <View style={{ marginTop: Spacing.xl, width: '100%', paddingHorizontal: Spacing.lg, gap: Spacing.sm }}>
        <Button variant="primary" fullWidth onPress={() => router.back()}>
          Continuer à scanner →
        </Button>
        {!showForm ? (
          <Button variant="ghost" onPress={onSuggest}>
            Suggérer une alternative
          </Button>
        ) : (
          <SuggestionForm category={category} />
        )}
      </View>
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
            style={[styles.categoryChip, selectedCategory === opt.value && styles.categoryChipActive]}
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
      <Button variant="primary" fullWidth onPress={handleSubmit} loading={submitting} disabled={submitting}>
        Envoyer ma suggestion
      </Button>
    </Card>
  );
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────

export default function AlternativesScreen() {
  const params = useLocalSearchParams<{
    barcode: string;
    category: string;
    productName: string;
    productBrand: string;
    flaggedDanger: string;
    flaggedCaution: string;
    trimester: string;
  }>();

  const normalize = (v: string | string[] | undefined): string =>
    Array.isArray(v) ? v[0] ?? '' : v ?? '';

  const barcode = normalize(params.barcode);
  const category = normalize(params.category) || 'cosmetic';
  const productName = normalize(params.productName) || 'Produit';
  const productBrand = normalize(params.productBrand);

  const flaggedDanger = useMemo(
    () => safeParseStringArray(normalize(params.flaggedDanger)),
    [params.flaggedDanger],
  );
  const flaggedCaution = useMemo(
    () => safeParseStringArray(normalize(params.flaggedCaution)),
    [params.flaggedCaution],
  );
  const trimester = useMemo<Trimester>(() => {
    const raw = parseInt(normalize(params.trimester), 10);
    return (raw === 1 || raw === 2 || raw === 3 ? raw : 2) as Trimester;
  }, [params.trimester]);

  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([]);
  const [explanations, setExplanations] = useState<{
    danger: IngredientExplanation[];
    caution: IngredientExplanation[];
  }>({ danger: [], caution: [] });
  const [loading, setLoading] = useState(true);
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Stable keys for memo/effect deps that depend on flagged arrays
  const flaggedDangerKey = flaggedDanger.join('|');
  const flaggedCautionKey = flaggedCaution.join('|');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [results, dangerExpl, cautionExpl] = await Promise.all([
        getAlternativesByBarcode(
          barcode,
          { danger: flaggedDanger, caution: flaggedCaution },
          trimester,
          isPremium,
        ),
        // Always fetch danger explanations: used by premium cards AND by educational empty state.
        getIngredientExplanations(flaggedDanger),
        // Caution explanations are only used in the educational empty state.
        getIngredientExplanations(flaggedCaution),
      ]);
      if (cancelled) return;
      setAlternatives(results);
      setExplanations({ danger: dangerExpl, caution: cautionExpl });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcode, isPremium, trimester, flaggedDangerKey, flaggedCautionKey]);

  const ingredientReasons = useMemo(
    () => buildIngredientReasons(explanations.danger),
    [explanations.danger],
  );

  const handleUnlock = useCallback(() => {
    router.push('/paywall');
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    setActiveIndex(index);
  }, []);

  const handleViewDetail = useCallback((bc: string | null) => {
    if (bc) router.push(`/verdict/${encodeURIComponent(bc)}`);
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
          Alternatives compatibles avec votre grossesse (T{trimester})
        </ThemedText>

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCircle} />
            <ThemedText variant="bodyMedium" color="textSecondary">
              Recherche d&apos;alternatives…
            </ThemedText>
          </View>
        ) : alternatives.length === 0 ? (
          <EducationalEmptyState
            dangerExplanations={explanations.danger}
            cautionExplanations={explanations.caution}
            onSuggest={() => setShowSuggestionForm(true)}
            showForm={showSuggestionForm}
            category={category}
          />
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
              {alternatives.map((alt) => (
                <AlternativeCard
                  key={alt.id}
                  alt={alt}
                  isPremium={isPremium}
                  ingredientReasons={ingredientReasons}
                  trimester={trimester}
                  onViewDetail={() => handleViewDetail(alt.barcode)}
                  onAddToList={handleAddToList}
                />
              ))}
            </ScrollView>

            <DotIndicators count={alternatives.length} activeIndex={activeIndex} />

            {!isPremium ? (
              <View style={styles.premiumCardWrapper}>
                <PremiumUpgradeCard trimester={trimester} onPress={handleUnlock} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

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
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  originPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: Colors.surface,
  },
  premiumExplanationBox: {
    backgroundColor: Colors.accentLight,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    marginTop: Spacing.md,
  },
  premiumExplanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  premiumReasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.xs,
  },
  altActions: {
    gap: Spacing.sm,
    alignItems: 'center',
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
  premiumCardWrapper: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  premiumCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  premiumHeader: {
    marginBottom: Spacing.md,
  },
  premiumBenefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  premiumBenefitText: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  explanationList: {
    width: '100%',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  explanationCard: {
    borderWidth: 1,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
