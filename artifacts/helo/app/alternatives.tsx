import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Linking,
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

import { AffiliateButton } from '@/components/alternatives/AffiliateButton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
import { useProfile } from '@/hooks/useProfile';
import {
  AlternativeProduct,
  IngredientExplanation,
  OriginBadge,
  getAlternativesByBarcode,
  getIngredientExplanations,
  submitAlternativeSuggestion,
} from '@/lib/alternatives';
import { fetchAlternativesRemote } from '@/lib/api';
import { addToShoppingList } from '@/lib/shoppingList';
import { track } from '@/lib/analytics';
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
  userId,
  sourceBarcode,
  onViewDetail,
  onAddToList,
}: {
  alt: AlternativeProduct;
  isPremium: boolean;
  ingredientReasons: IngredientExplanation[];
  trimester: Trimester;
  userId?: string | null;
  sourceBarcode?: string | null;
  onViewDetail: () => void;
  onAddToList: () => void;
}) {
  return (
    <View style={{ width: CARD_WIDTH }}>
      <Card style={styles.altCard} variant="elevated" padding={0}>
        <View style={styles.altImageContainer}>
          {/* Audit module 2 : la photo produit (image_url fournie par le backend
              OFF/OBF) n'était jamais affichée — toujours l'icône placeholder.
              Or reconnaître l'alternative en rayon EST la valeur de l'écran. */}
          {alt.image_url ? (
            <Image
              source={{ uri: alt.image_url }}
              style={styles.altImage}
              contentFit="contain"
              transition={150}
            />
          ) : (
            <View style={styles.altImagePlaceholder}>
              <Feather name="package" size={40} color={Colors.textTertiary} />
            </View>
          )}
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

          {alt.reason ? (
            <View style={styles.reasonBox}>
              <Feather name="check-circle" size={12} color={Colors.safe} />
              <ThemedText
                variant="bodySmall"
                style={{ flex: 1, marginLeft: 6, fontStyle: 'italic', lineHeight: 16 }}
              >
                {alt.reason}
              </ThemedText>
            </View>
          ) : null}

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
                  Validé selon le CRAT — aucun ingrédient à risque détecté pour ton trimestre.
                </ThemedText>
              )}
            </View>
          ) : null}

          <Divider style={{ marginVertical: Spacing.md }} />

          {/* Lot 19-G1 — Liens d'achat affiliate avec tracking + analytics + in-app browser */}
          {alt.purchase_links && (alt.purchase_links.amazon || alt.purchase_links.drive || alt.purchase_links.brand) ? (
            <View style={styles.purchaseLinksRow}>
              {alt.purchase_links.drive ? (
                <AffiliateButton
                  merchant="monoprix"
                  url={alt.purchase_links.drive}
                  productId={alt.id}
                  sourceProductId={sourceBarcode ?? null}
                  userId={userId ?? null}
                  context="alternative_card"
                />
              ) : null}
              {alt.purchase_links.amazon ? (
                <AffiliateButton
                  merchant="amazon"
                  url={alt.purchase_links.amazon}
                  productId={alt.id}
                  sourceProductId={sourceBarcode ?? null}
                  userId={userId ?? null}
                  context="alternative_card"
                />
              ) : null}
              {alt.purchase_links.brand ? (
                <TouchableOpacity
                  style={styles.purchaseLinkBtn}
                  onPress={() => Linking.openURL(alt.purchase_links!.brand!).catch(() => undefined)}
                  activeOpacity={0.75}
                  accessibilityRole="link"
                  accessibilityLabel={`Ouvrir le site de ${alt.brand || 'la marque'}`}
                >
                  <Feather name="external-link" size={12} color={Colors.accent} />
                  <ThemedText variant="bodySmall" style={{ marginLeft: 4, color: Colors.accent }}>Marque</ThemedText>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

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
            Merci pour ta suggestion !
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
            accessibilityRole="button"
            accessibilityState={{ selected: selectedCategory === opt.value }}
            accessibilityLabel={`Catégorie ${opt.label}`}
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
  const { userId } = useProfile();
  const insets = useSafeAreaInsets();
  const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([]);
  const [explanations, setExplanations] = useState<{
    danger: IngredientExplanation[];
    caution: IngredientExplanation[];
  }>({ danger: [], caution: [] });
  const [loading, setLoading] = useState(true);
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  // v4 — état d'erreur backend visible côté UI quand un user premium a basculé
  // sur le fallback local (vs sur "vraiment rien trouvé"). Sans ça, un crash
  // backend silencieux donne l'impression à une payante qu'aucune alternative
  // n'existe → mauvaise note App Store.
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Stable keys for memo/effect deps that depend on flagged arrays
  const flaggedDangerKey = flaggedDanger.join('|');
  const flaggedCautionKey = flaggedCaution.join('|');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setRemoteError(null); // v4 — reset à chaque fetch

      // ── BACKEND-FIRST : on lance en parallèle l'appel backend ET les
      //    explications d'ingrédients (toujours via Supabase direct, c'est
      //    léger et indépendant).
      const [remote, dangerExpl, cautionExpl] = await Promise.all([
        fetchAlternativesRemote(barcode, trimester, isPremium),
        getIngredientExplanations(flaggedDanger),
        getIngredientExplanations(flaggedCaution),
      ]);
      if (cancelled) return;

      // Étape 3 — M1 : bouclier monétisation côté client.
      // Deux scénarios envoient un free user vers le paywall sans fallback :
      //   (a) le backend a explicitement répondu 403 premium_required ;
      //   (b) le backend est KO (network/5xx/unconfigured) ET l'utilisatrice
      //       n'est pas premium. Sans (b), un free user pourrait obtenir les
      //       alternatives via fallback local en cas de panne réseau —
      //       régression monétisation identifiée par la revue d'archi.
      //   Le fallback local reste actif UNIQUEMENT pour les premium (filet
      //   d'expérience : panne backend ≠ écran vide pour une payante).
      if (!remote.ok) {
        if (remote.error.kind === 'premium_required' || !isPremium) {
          setLoading(false);
          router.replace({
            pathname: '/paywall',
            params: { trigger: 'feature' },
          });
          return;
        }
      }

      let results: AlternativeProduct[];
      if (remote.ok) {
        // Backend a répondu (200) — y compris si data === [] (trappe de
        // sécurité côté serveur : aucun produit 100% safe en base). L'écran
        // basculera automatiquement sur l'empty state existant.
        //
        // ⚠️ Parité premium : le backend ne connaît pas le tier user (il
        // renverrait la liste si on l'exposait, sécu paywall côté serveur
        // possible plus tard). On enforce la limite ici comme le faisait le
        // pipeline local : 5 alternatives pour premium, 3 pour free.
        const limit = isPremium ? 5 : 3;
        results = remote.data.slice(0, limit);
      } else {
        // Erreur réseau / 5xx / timeout / backend non configuré → fallback
        // local. L'utilisatrice n'est jamais bloquée, l'UX reste identique
        // à l'expérience pré-backend.
        if (__DEV__) {
          console.warn(
            '[Hēlo alternatives] backend KO, fallback local:',
            remote.error.kind,
          );
        }
        // v4 — On expose l'erreur côté UI : un user premium voit un banner
        // "Mode dégradé · Réessayer" plutôt que "aucune alternative".
        setRemoteError(remote.error.kind);
        results = await getAlternativesByBarcode(
          barcode,
          { danger: flaggedDanger, caution: flaggedCaution },
          trimester,
          isPremium,
        );
        if (cancelled) return;
      }

      setAlternatives(results);
      setExplanations({ danger: dangerExpl, caution: cautionExpl });
      setLoading(false);
      track('alternative_viewed', {
        product_name: productName,
        barcode,
        alternatives_count: results.length,
        trimester,
        is_premium: isPremium,
      }).catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcode, isPremium, trimester, flaggedDangerKey, flaggedCautionKey, retryNonce]);

  const handleRetry = useCallback(() => {
    setRetryNonce((n) => n + 1);
  }, []);

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
    if (bc) {
      track('alternative_swap_tapped', { alternative_barcode: bc, original_barcode: barcode, product_name: productName }).catch(() => {});
      router.push(`/verdict/${encodeURIComponent(bc)}`);
    }
  }, [barcode, productName]);

  // Audit module 2 : n'est plus un stub. Persiste l'alternative dans la liste
  // de courses (lib/shoppingList) → visible dans l'onglet Placard › Ma Liste.
  const handleAddToList = useCallback(async (alt: AlternativeProduct) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const added = await addToShoppingList({ productName: alt.name, brand: alt.brand });
    track('alternative_added_to_list', { alternative_barcode: alt.barcode, original_barcode: barcode }).catch(() => {});
    Alert.alert(
      added ? 'Ajouté à ta liste ✓' : 'Déjà dans ta liste',
      added
        ? `${alt.name} est dans ta liste de courses (Placard › Ma Liste).`
        : `${alt.name} y est déjà.`,
    );
  }, [barcode]);

  const topPad = Platform.OS === 'web' ? 60 : insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: topPad }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Fermer">
          <Feather name="x" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="headlineMedium" style={styles.headerTitle}>
          Alternatives
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
          Alternatives compatibles avec ta grossesse (T{trimester})
        </ThemedText>

        {/* v4 — Banner d'erreur réseau : informe l'utilisatrice premium quand
            le backend a planté et qu'on est tombé sur le fallback local. Sans
            ça elle interprétait "aucune alternative" comme un fait métier au
            lieu d'un crash. Tap → retry. */}
        {remoteError && !loading ? (
          <TouchableOpacity onPress={handleRetry} style={styles.errorBanner} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Réessayer la recherche d'alternatives">
            <Feather name="wifi-off" size={14} color={Colors.caution} />
            <ThemedText
              variant="bodySmall"
              style={{ flex: 1, marginLeft: 8, color: Colors.textSecondary }}
            >
              Mode dégradé — résultats partiels. Touche pour réessayer.
            </ThemedText>
            <Feather name="rotate-cw" size={14} color={Colors.accent} />
          </TouchableOpacity>
        ) : null}

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
                  userId={userId}
                  sourceBarcode={barcode}
                  onViewDetail={() => handleViewDetail(alt.barcode)}
                  onAddToList={() => handleAddToList(alt)}
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
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
  altImage: {
    width: '100%',
    height: '100%',
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
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.safeBg ?? Colors.backgroundSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
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
  purchaseLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  purchaseLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accentLight,
    backgroundColor: Colors.surface,
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
