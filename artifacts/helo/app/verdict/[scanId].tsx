import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Circle, Svg } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

import { ScanDisclaimerBanner } from '@/components/ScanDisclaimerBanner';
import { ShareBottomSheet } from '@/components/share/ShareBottomSheet';
import { VerdictShareCard } from '@/components/share/VerdictShareCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { IconButton } from '@/components/ui/IconButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { SCAN_DISCLAIMER } from '@/constants/disclaimers';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { useScan } from '@/hooks/useScan';
import { sendShelfAddNotification } from '@/lib/notifications';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { MatchResult, RiskLevel, VerdictResult } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────
const CIRCLE_RADIUS = 60;
const CIRCLE_STROKE = 8;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const BOTTOM_BAR_HEIGHT = 120;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getVerdictColor(v?: string) {
  if (v === 'danger') return Colors.danger;
  if (v === 'caution') return Colors.caution;
  return Colors.safe;
}
function getVerdictBg(v?: string) {
  if (v === 'danger') return Colors.dangerBg;
  if (v === 'caution') return Colors.cautionBg;
  return Colors.safeBg;
}
function getVerdictLabel(v?: string) {
  if (v === 'danger') return 'À éviter';
  if (v === 'caution') return 'Précaution';
  return 'Compatible';
}
function getRiskColor(r: RiskLevel) {
  if (r === 'danger') return Colors.danger;
  if (r === 'caution') return Colors.caution;
  if (r === 'safe') return Colors.safe;
  return Colors.textTertiary;
}
function getRiskVariant(r: RiskLevel): 'danger' | 'caution' | 'safe' | 'accent' {
  if (r === 'danger') return 'danger';
  if (r === 'caution') return 'caution';
  if (r === 'safe') return 'safe';
  return 'accent';
}
function getRiskBadgeLabel(r: RiskLevel) {
  if (r === 'danger') return 'À éviter';
  if (r === 'caution') return 'Précaution';
  if (r === 'safe') return 'Compatible';
  return 'Aucun signal';
}
function computeGlowScore(verdict: VerdictResult): number {
  const danger = verdict.flaggedIngredients.filter((m) => m.riskLevel === 'danger').length;
  const caution = verdict.flaggedIngredients.filter((m) => m.riskLevel === 'caution').length;
  const penaltyD = Math.min(danger * 25, 65);
  const penaltyC = Math.min(caution * 10, 30);
  return Math.max(10, 100 - penaltyD - penaltyC);
}
function sortMatches(matches: MatchResult[]): MatchResult[] {
  const order: Record<RiskLevel, number> = { danger: 0, caution: 1, safe: 2, no_signal: 3 };
  return [...matches].sort((a, b) => order[a.riskLevel] - order[b.riskLevel]);
}
function trimesterLabel(t: number) {
  if (t === 1) return '1er trimestre';
  if (t === 2) return '2ème trimestre';
  return '3ème trimestre';
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withTiming(1.15, { duration: 900 });
    opacity.value = withTiming(1, { duration: 900 });
    const interval = setInterval(() => {
      scale.value = withTiming(scale.value > 1.05 ? 1 : 1.15, { duration: 900 });
      opacity.value = withTiming(opacity.value > 0.8 ? 0.6 : 1, { duration: 900 });
    }, 900);
    return () => clearInterval(interval);
  }, [scale, opacity]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <View style={styles.loadingRoot}>
      <Animated.View style={[styles.loadingCircle, animStyle]} />
      <ThemedText variant="bodyMedium" color="textSecondary" style={styles.loadingText}>
        Analyse en cours…
      </ThemedText>
    </View>
  );
}

// ─── SVG score circle ─────────────────────────────────────────────────────────
function ScoreCircle({
  score,
  color,
  onAnimDone,
}: {
  score: number;
  color: string;
  onAnimDone: () => void;
}) {
  const circleOpacity = useSharedValue(0);
  const strokeProgress = useSharedValue(0); // 0 → 1
  const scoreOpacity = useSharedValue(0);

  const circleStyle = useAnimatedStyle(() => ({ opacity: circleOpacity.value }));

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - strokeProgress.value),
  }));

  useEffect(() => {
    // Phase 1: circle appears (0–0.5s)
    circleOpacity.value = withTiming(1, { duration: 400 });

    // Phase 2: fill (0.5–1.2s)
    strokeProgress.value = withDelay(
      500,
      withTiming(1, { duration: 700 }, (finished) => {
        if (finished) {
          scoreOpacity.value = withTiming(1, { duration: 200 }, (f2) => {
            if (f2) runOnJS(onAnimDone)();
          });
        }
      }),
    );
  }, [circleOpacity, strokeProgress, scoreOpacity, onAnimDone]);

  const scoreStyle = useAnimatedStyle(() => ({ opacity: scoreOpacity.value }));

  return (
    <Animated.View style={[styles.scoreCircleWrapper, circleStyle]}>
      <Svg width={CIRCLE_RADIUS * 2 + CIRCLE_STROKE * 2} height={CIRCLE_RADIUS * 2 + CIRCLE_STROKE * 2}>
        {/* Track */}
        <Circle
          cx={CIRCLE_RADIUS + CIRCLE_STROKE}
          cy={CIRCLE_RADIUS + CIRCLE_STROKE}
          r={CIRCLE_RADIUS}
          stroke={Colors.borderLight}
          strokeWidth={CIRCLE_STROKE}
          fill="none"
        />
        {/* Animated fill */}
        <AnimatedCircle
          cx={CIRCLE_RADIUS + CIRCLE_STROKE}
          cy={CIRCLE_RADIUS + CIRCLE_STROKE}
          r={CIRCLE_RADIUS}
          stroke={color}
          strokeWidth={CIRCLE_STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeLinecap="round"
          rotation="-90"
          origin={`${CIRCLE_RADIUS + CIRCLE_STROKE}, ${CIRCLE_RADIUS + CIRCLE_STROKE}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <Animated.View style={[styles.scoreCenter, scoreStyle]}>
        <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Verdict label (Phase 3) ──────────────────────────────────────────────────
function VerdictLabel({ label, color, visible }: { label: string; color: string; visible: boolean }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);
  useEffect(() => {
    if (visible) {
      opacity.value = withDelay(0, withTiming(1, { duration: 250 }));
      translateY.value = withDelay(0, withTiming(0, { duration: 250 }));
    }
  }, [visible, opacity, translateY]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return (
    <Animated.View style={style}>
      <Text style={[styles.verdictLabel, { color }]}>{label}</Text>
    </Animated.View>
  );
}

// ─── Ingredient card (expandable) ────────────────────────────────────────────
function IngredientCard({ match }: { match: MatchResult }) {
  const [expanded, setExpanded] = useState(false);
  const dotColor = getRiskColor(match.riskLevel);

  if (match.riskLevel === 'no_signal') return null; // rendered separately

  return (
    <Card style={styles.ingredientCard} padding={Spacing.lg}>
      <Pressable onPress={() => setExpanded((v) => !v)}>
        <View style={styles.ingredientRow}>
          <View style={[styles.riskDot, { backgroundColor: dotColor }]} />
          <View style={styles.ingredientMeta}>
            <ThemedText variant="bodyLarge" style={{ flex: 1 }}>{match.ingredientName}</ThemedText>
            <Badge variant={getRiskVariant(match.riskLevel)}>
              {getRiskBadgeLabel(match.riskLevel)}
            </Badge>
          </View>
        </View>
        {match.ingredient?.description_fr && (
          <ThemedText
            variant="bodySmall"
            color="textSecondary"
            style={styles.ingredientDesc}
            numberOfLines={expanded ? undefined : 2}
          >
            {match.ingredient.description_fr}
          </ThemedText>
        )}
        {expanded && match.ingredient?.source && (
          <View style={styles.sourceRow}>
            <Feather name="book-open" size={12} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginLeft: 4 }}>
              {match.ingredient.source}
            </ThemedText>
            {match.ingredient.source_url && (
              <Pressable onPress={() => Linking.openURL(match.ingredient!.source_url!)}>
                <ThemedText variant="bodySmall" style={{ color: Colors.accent, marginLeft: 8 }}>
                  Voir →
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}
        {match.ingredient?.description_fr && match.ingredient.description_fr.length > 80 && (
          <ThemedText variant="bodySmall" style={{ color: Colors.accent, marginTop: 4 }}>
            {expanded ? 'Moins ▲' : 'Plus ▼'}
          </ThemedText>
        )}
      </Pressable>
    </Card>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ visible, message }: { visible: boolean; message: string }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);
  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(-20, { duration: 300 });
    }
  }, [visible, opacity, translateY]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return (
    <Animated.View style={[styles.toast, style]} pointerEvents="none">
      <Feather name="check-circle" size={16} color="#fff" style={{ marginRight: 8 }} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Shelf bottom sheet ───────────────────────────────────────────────────────
const SHELF_OPTIONS = [
  { key: 'salle-de-bain', label: 'Salle de bain', icon: 'droplet' as const },
  { key: 'cuisine',       label: 'Cuisine',       icon: 'coffee'  as const },
  { key: 'pharmacie',     label: 'Pharmacie',     icon: 'plus-circle' as const },
] as const;

function ShelfBottomSheet({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (category: string) => void;
  onClose: () => void;
}) {
  const checkScale = useSharedValue(0);
  const [chosen, setChosen] = useState<string | null>(null);

  const handleSelect = (cat: string) => {
    setChosen(cat);
    checkScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      onSelect(cat);
      setChosen(null);
      checkScale.value = 0;
    }, 700);
  };

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose} />
      <View style={styles.sheetContainer}>
        <View style={styles.sheetHandle} />
        <ThemedText variant="headlineMedium" style={styles.sheetTitle}>
          Ajouter au placard
        </ThemedText>
        {chosen ? (
          <View style={styles.sheetSuccess}>
            <Animated.View style={checkStyle}>
              <Feather name="check-circle" size={52} color={Colors.safe} />
            </Animated.View>
          </View>
        ) : (
          <View style={styles.sheetOptions}>
            {SHELF_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.sheetOption}
                onPress={() => handleSelect(opt.key)}
                activeOpacity={0.75}
              >
                <View style={styles.sheetOptionIcon}>
                  <Feather name={opt.icon} size={22} color={Colors.accent} />
                </View>
                <ThemedText variant="bodyLarge">{opt.label}</ThemedText>
                <Feather name="chevron-right" size={18} color={Colors.textTertiary} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity onPress={onClose} style={styles.sheetCancel}>
          <ThemedText variant="bodyMedium" color="textSecondary">Annuler</ThemedText>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function VerdictScreen() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const barcode = decodeURIComponent(scanId ?? '');
  const insets = useSafeAreaInsets();
  const { loading, product, matches, verdict, error, scanBarcode, setDirectResult } = useScan();

  const { role, userId, trimester: profileTrimester, linkedUserId, firstName } = useProfile();
  const isPartner = role === 'partner';
  const effectiveUserId = isPartner && linkedUserId ? linkedUserId : userId;
  const senderFirstName = firstName || 'Votre partenaire';
  const recipientUserId = linkedUserId ?? null;

  const [labelVisible, setLabelVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [trimester, setTrimester] = useState(2);
  const [isOCRMode, setIsOCRMode] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load trimester: use mother's trimester for partner, else local profile
  useEffect(() => {
    if (profileTrimester !== null && profileTrimester !== undefined) {
      setTrimester(profileTrimester);
    } else {
      AsyncStorage.getItem('user_profile').then((raw) => {
        if (raw) {
          const p = JSON.parse(raw);
          if (p.trimester) setTrimester(p.trimester);
        }
      }).catch(() => {});
    }
  }, [profileTrimester]);

  useEffect(() => {
    if (!barcode) return;

    // OCR mode: load pre-computed result from AsyncStorage
    if (barcode.startsWith('ocr_')) {
      setIsOCRMode(true);
      const id = barcode.slice(4); // strip 'ocr_'
      AsyncStorage.getItem(`@helo_ocr_${id}`).then((raw) => {
        if (raw) {
          const data = JSON.parse(raw);
          setDirectResult(data.product, data.matches, data.verdict);
        }
      }).catch(() => {});
      return;
    }

    scanBarcode(barcode, trimester as 1 | 2 | 3);
  }, [barcode, trimester]); // eslint-disable-line react-hooks/exhaustive-deps

  // Haptic when verdict arrives
  useEffect(() => {
    if (!verdict) return;
    if (verdict.verdict === 'safe') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (verdict.verdict === 'caution') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [verdict]);

  const handleShelfSelect = useCallback(async (category: string) => {
    setSheetVisible(false);

    const shelfUserId = effectiveUserId;
    const productName = product?.name ?? 'Produit';

    try {
      const existing = await AsyncStorage.getItem('@helo_shelf') ?? '[]';
      const shelf = JSON.parse(existing);
      shelf.push({
        barcode,
        productName,
        brand: product?.brand,
        category,
        verdict: verdict?.verdict,
        savedAt: Date.now(),
        userId: shelfUserId,
      });
      await AsyncStorage.setItem('@helo_shelf', JSON.stringify(shelf));
    } catch {}

    if (isSupabaseConfigured && shelfUserId) {
      try {
        const { data: productRow } = await supabase
          .from('products')
          .select('id')
          .eq('barcode', barcode)
          .maybeSingle();

        const productId = productRow?.id ?? null;

        await supabase.from('scan_history').insert({
          user_id: shelfUserId,
          product_id: productId,
          trimester,
          in_shelf: true,
          shelf_category: category,
          verdict_at_shelf_add: verdict?.verdict ?? null,
        });

        if (recipientUserId) {
          await sendShelfAddNotification({
            firstName: senderFirstName,
            productName,
            recipientUserId,
          });
        }
      } catch (err) {
        console.warn('[verdict] shelf Supabase insert error:', err);
      }
    }

    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  }, [barcode, product, verdict, effectiveUserId, trimester, recipientUserId, senderFirstName]);

  const handleShare = useCallback(() => {
    if (!product || !verdict) return;
    setShareVisible(true);
  }, [product, verdict]);

  const verdictColor = getVerdictColor(verdict?.verdict);
  const verdictBgColor = getVerdictBg(verdict?.verdict);
  const glowScore = verdict ? computeGlowScore(verdict) : 0;
  const sorted = sortMatches(matches);
  const flagged = sorted.filter((m) => m.riskLevel !== 'no_signal');
  const noSignal = sorted.filter((m) => m.riskLevel === 'no_signal');
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  // ── Loading ──
  if (loading) return <LoadingScreen />;

  // ── Error ──
  if (error) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          <ThemedText variant="bodyMedium" style={{ marginLeft: 8 }}>Retour</ThemedText>
        </TouchableOpacity>
        <View style={styles.errorCenter}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.dangerLight }]}>
            <Feather name="search" size={32} color={Colors.danger} />
          </View>
          <ThemedText variant="headlineMedium" style={styles.centeredText}>Produit introuvable</ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={[styles.centeredText, { marginTop: Spacing.sm }]}>
            {error}
          </ThemedText>
          <View style={{ marginTop: Spacing.xl, width: '100%' }}>
            <Button variant="primary" fullWidth onPress={() => router.back()}>
              Scanner un autre produit
            </Button>
          </View>
        </View>
      </View>
    );
  }

  if (!verdict || !product) return <LoadingScreen />;

  return (
    <View style={styles.root}>
      {/* Toast */}
      <Toast visible={toastVisible} message="Ajouté à votre placard ✓" />

      {/* Shelf bottom sheet */}
      <ShelfBottomSheet
        visible={sheetVisible}
        onSelect={handleShelfSelect}
        onClose={() => setSheetVisible(false)}
      />

      {/* Share bottom sheet */}
      {shareVisible && product && verdict && (
        <ShareBottomSheet
          visible={shareVisible}
          onClose={() => setShareVisible(false)}
          card={
            <VerdictShareCard
              productName={product.name}
              brand={product.brand ?? undefined}
              verdict={verdict.verdict as 'safe' | 'caution' | 'danger'}
              score={glowScore}
              trimester={trimester}
            />
          }
        />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: BOTTOM_BAR_HEIGHT + bottomPad + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO ── */}
        <LinearGradient
          colors={[verdictBgColor, Colors.background]}
          style={styles.hero}
        >
          {/* Back button */}
          <TouchableOpacity
            style={[styles.backRow, { marginTop: (Platform.OS === 'web' ? 67 : insets.top) + Spacing.sm }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
            <ThemedText variant="bodyMedium" style={{ marginLeft: 8 }}>Retour</ThemedText>
          </TouchableOpacity>

          {/* Score circle + label */}
          <View style={styles.heroCenter}>
            <ScoreCircle
              score={glowScore}
              color={verdictColor}
              onAnimDone={() => setLabelVisible(true)}
            />
            <VerdictLabel
              label={getVerdictLabel(verdict.verdict)}
              color={verdictColor}
              visible={labelVisible}
            />
          </View>

          {/* Product info */}
          <View style={styles.productRow}>
            {product.imageUrl ? (
              <Image
                source={{ uri: product.imageUrl }}
                style={styles.productImage}
                contentFit="contain"
              />
            ) : (
              <View style={[styles.productImage, styles.productImagePlaceholder]}>
                <Feather name="package" size={18} color={Colors.textTertiary} />
              </View>
            )}
            <View style={styles.productInfo}>
              <ThemedText variant="headlineMedium" numberOfLines={2}>{product.name}</ThemedText>
              {product.brand ? (
                <ThemedText variant="bodyMedium" color="textSecondary">{product.brand}</ThemedText>
              ) : null}
            </View>
          </View>

          <View style={styles.trimesterBadgeRow}>
            {isOCRMode ? (
              <Badge variant="accent">Analysé par lecture d'ingrédients</Badge>
            ) : (
              <Badge variant="accent">Évalué pour votre {trimesterLabel(trimester)}</Badge>
            )}
          </View>
        </LinearGradient>

        {/* ── INGREDIENTS SIGNALÉS ── */}
        {flagged.length > 0 && (
          <View style={styles.section}>
            <ThemedText variant="headlineMedium" style={styles.sectionTitle}>
              Ingrédients analysés
            </ThemedText>
            {flagged.map((m) => (
              <IngredientCard key={m.ingredientName} match={m} />
            ))}
          </View>
        )}

        {/* ── NO SIGNAL ── */}
        {noSignal.length > 0 && (
          <View style={styles.section}>
            <ThemedText variant="labelSmall" color="textTertiary" style={styles.noSignalTitle}>
              AUCUN SIGNALEMENT CONNU ({noSignal.length})
            </ThemedText>
            <Card style={styles.noSignalCard} padding={Spacing.lg}>
              {noSignal.map((m, i) => (
                <View key={m.ingredientName}>
                  <ThemedText variant="bodySmall" color="textSecondary" style={styles.noSignalItem}>
                    {m.ingredientName}
                  </ThemedText>
                  {i < noSignal.length - 1 && (
                    <Divider style={{ marginVertical: Spacing.xs }} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* ── DISCLAIMER ── */}
        <View style={styles.disclaimerSection}>
          <Divider style={{ marginVertical: Spacing.lg }} />
          <ThemedText variant="bodySmall" color="textTertiary" style={styles.disclaimerText}>
            {SCAN_DISCLAIMER}
          </ThemedText>
          <TouchableOpacity onPress={() => router.push('/methodology')} style={{ marginTop: Spacing.sm }}>
            <ThemedText variant="bodySmall" style={{ color: Colors.accent }}>
              Notre méthodologie →
            </ThemedText>
          </TouchableOpacity>
          <ScanDisclaimerBanner />
        </View>
      </ScrollView>

      {/* ── BOTTOM ACTION BAR ── */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: bottomPad + Spacing.lg },
          Shadows.medium,
        ]}
      >
        <View style={styles.bottomActions}>
          {verdict.verdict !== 'safe' ? (
            <>
              <View style={styles.bottomBtn}>
                <Button variant="primary" fullWidth onPress={() => {
                  router.push({
                    pathname: '/alternatives',
                    params: {
                      barcode,
                      category: 'cosmetic',
                      productName: product.name,
                      productBrand: product.brand ?? '',
                    },
                  });
                }}>
                  Voir les alternatives →
                </Button>
              </View>
              <View style={styles.bottomBtn}>
                <Button variant="secondary" fullWidth onPress={() => setSheetVisible(true)}>
                  Ajouter au placard
                </Button>
              </View>
            </>
          ) : (
            <Button
              variant="primary"
              fullWidth
              onPress={() => setSheetVisible(true)}
            >
              Ajouter au placard
            </Button>
          )}
        </View>
        <View style={styles.iconRow}>
          <IconButton onPress={handleShare} size={44}>
            <Feather name="share-2" size={18} color={Colors.textSecondary} />
          </IconButton>
          <IconButton onPress={() => router.back()} size={44}>
            <Feather name="camera" size={18} color={Colors.textSecondary} />
          </IconButton>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Loading
  loadingRoot: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  loadingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentLight,
  },
  loadingText: { marginTop: Spacing.md },

  // Error
  errorCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.massive,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredText: { textAlign: 'center' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {},

  // Hero
  hero: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    alignSelf: 'flex-start',
  },
  heroCenter: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },

  // Score circle
  scoreCircleWrapper: {
    width: (CIRCLE_RADIUS + CIRCLE_STROKE) * 2,
    height: (CIRCLE_RADIUS + CIRCLE_STROKE) * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 40,
    letterSpacing: -1,
  },

  // Verdict label
  verdictLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: Typography.displayMedium.fontSize,
    letterSpacing: Typography.displayMedium.letterSpacing,
    textAlign: 'center',
  },

  // Product info
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productInfo: { flex: 1, gap: 2 },
  trimesterBadgeRow: { alignItems: 'flex-start' },

  // Sections
  section: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  sectionTitle: { marginBottom: Spacing.sm },

  // Ingredient card
  ingredientCard: { marginBottom: Spacing.sm },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
  },
  ingredientMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  ingredientDesc: {
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
  },

  // No signal
  noSignalTitle: { marginBottom: Spacing.sm },
  noSignalCard: {},
  noSignalItem: { paddingVertical: Spacing.xs },

  // Disclaimer
  disclaimerSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  disclaimerText: { lineHeight: 18 },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  bottomBtn: { flex: 1 },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
  },

  // Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  sheetContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.massive,
    paddingTop: Spacing.md,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  sheetTitle: {
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  sheetOptions: { gap: Spacing.md },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  sheetOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSuccess: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },

  // Toast
  toast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.safe,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    zIndex: 999,
    ...Shadows.elevated,
  },
  toastText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: Typography.bodyMedium.fontSize,
    color: '#fff',
  },
});
