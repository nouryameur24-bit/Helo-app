import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { syncWidgetData, reloadWidgets } from '@/lib/widgetStorage';
import { calculateGlowScore } from '@/lib/glowscore';
import { calculateTrimester } from '@/lib/trimester';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { triggerGhostMode } from '../(tabs)/scan';
import { ScanDisclaimerBanner } from '@/components/ScanDisclaimerBanner';
import { ShareBottomSheet } from '@/components/share/ShareBottomSheet';
import { VerdictShareCard } from '@/components/share/VerdictShareCard';
import { Badge } from '@/components/ui/Badge';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';

import { LoadingScreen, ScoreCircle, VerdictLabel, Toast } from '@/components/verdict/VerdictAnimations';
import { VellumTexture } from '@/components/verdict/VellumTexture';
import { getContextualQuote } from '@/lib/contextualQuotes';
import { CircleShareRow } from '@/components/verdict/CircleShareRow';
import { IngredientsSection } from '@/components/verdict/IngredientsSection';
import { RecallAlertBanner } from '@/components/verdict/RecallAlertBanner';
import { ShelfBottomSheet } from '@/components/verdict/ShelfBottomSheet';
import { ReportBottomSheet } from '@/components/verdict/ReportBottomSheet';
import { GhostCaptureModal } from '@/components/verdict/GhostCaptureModal';
import { VerdictBottomBar } from '@/components/verdict/VerdictBottomBar';
import { VerdictErrorScreen } from '@/components/verdict/VerdictErrorScreen';
import {
  getVerdictColor,
  getVerdictBg,
  getVerdictLabel,
  getSourceAttribution,
  computeGlowScore,
  sortMatches,
  phaseLabel,
  BOTTOM_BAR_HEIGHT,
} from '@/components/verdict/verdictHelpers';
import styles from '@/components/verdict/verdictStyles';

import { SCAN_DISCLAIMER } from '@/constants/disclaimers';
import { Colors, Spacing } from '@/constants/theme';
import { useOffline } from '@/hooks/useOffline';
import { useProfile } from '@/hooks/useProfile';
import { usePremium } from '@/hooks/usePremium';
import { useScan } from '@/hooks/useScan';
import { getBreastfeedingMode } from '@/hooks/useBreastfeeding';
import { getBabyMode } from '@/hooks/useBabyMode';
import { sendShelfAddNotification } from '@/lib/notifications';
import { fetchRecallForBarcode } from '@/hooks/useRecallAlerts';
import { getCircle } from '@/lib/circleUtils';
import { matchIngredients, getVerdict } from '@/lib/productLookup';
import type { RappelConsoRecord } from '@/lib/rappelConso';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { MatchResult, Phase, VerdictResult } from '@/types';

export default function VerdictScreen() {
  const { scanId, ghostThanks } = useLocalSearchParams<{ scanId: string; ghostThanks?: string }>();
  const barcode = decodeURIComponent(scanId ?? '');
  const insets = useSafeAreaInsets();
  const { loading, product, matches, verdict, error, notFound, scanBarcode, setDirectResult } = useScan();
  const { isPremium, requirePremium } = usePremium();
  const { isOffline } = useOffline();

  const { role, userId, trimester: profileTrimester, linkedUserId, firstName } = useProfile();
  const isPartner = role === 'partner';
  const effectiveUserId = isPartner && linkedUserId ? linkedUserId : userId;
  const senderFirstName = firstName || 'Votre partenaire';
  const recipientUserId = linkedUserId ?? null;

  const [labelVisible, setLabelVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [recallMatch, setRecallMatch] = useState<RappelConsoRecord | null>(null);
  const [shareVisible, setShareVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('Ajouté à votre placard ✓');
  const ghostThanksShownRef = useRef(false);

  // ── Ghost Capture "merci" toast ─────────────────────────────────────────────
  // Triggered when the user arrives from the OCR review flow with ghostThanks=1.
  // Non-blocking, plays a success haptic and auto-hides after 3s.
  useEffect(() => {
    if (ghostThanks !== '1' || ghostThanksShownRef.current) return;
    if (loading) return;
    ghostThanksShownRef.current = true;
    setToastMessage("✨ Merci ! Vous venez d'aider la communauté Hēlo");
    setToastVisible(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const t = setTimeout(() => setToastVisible(false), 3000);
    return () => clearTimeout(t);
  }, [ghostThanks, loading]);
  const [phase, setPhase] = useState<Phase>(2);
  const [isOCRMode, setIsOCRMode] = useState(false);
  const [isPhotoMode, setIsPhotoMode] = useState(false);
  const [isBabyMode, setIsBabyMode] = useState(false);
  const [babyMatches, setBabyMatches] = useState<MatchResult[]>([]);
  const [babyVerdict, setBabyVerdict] = useState<VerdictResult | null>(null);
  const [activeTab, setActiveTab] = useState<'pregnancy' | 'baby'>('pregnancy');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevent double-scan: phase change (async profile load) must not re-trigger
  // a second concurrent fetchProductByBarcode that could timeout and overwrite success.
  const activeScanRef = useRef<string | null>(null);
  const phaseRef = useRef<Phase>(2);

  const [circleId, setCircleId] = useState<string | null>(null);
  const [sharedToCircle, setSharedToCircle] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [ghostVisible, setGhostVisible] = useState(false);
  const lastFailedBarcode = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    getCircle().then((data) => {
      setCircleId(data?.circle?.id ?? null);
    }).catch(() => {});
  }, [userId]);

  useEffect(() => {
    getBreastfeedingMode().then((isBF) => {
      if (isBF) {
        setPhase('breastfeeding');
        phaseRef.current = 'breastfeeding';
        return;
      }
      if (profileTrimester !== null && profileTrimester !== undefined) {
        setPhase(profileTrimester as Phase);
        phaseRef.current = profileTrimester as Phase;
      } else {
        AsyncStorage.getItem('user_profile').then((raw) => {
          if (raw) {
            const p = JSON.parse(raw);
            if (p.trimester) {
              setPhase(p.trimester as Phase);
              phaseRef.current = p.trimester as Phase;
            }
          }
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [profileTrimester]);

  useEffect(() => {
    if (!barcode) return;

    if (barcode.startsWith('ocr_')) {
      setIsOCRMode(true);
      const id = barcode.slice(4);
      AsyncStorage.getItem(`@helo_ocr_${id}`).then((raw) => {
        if (raw) {
          const data = JSON.parse(raw);
          setDirectResult(data.product, data.matches, data.verdict);
        }
      }).catch(() => {});
      return;
    }

    if (barcode === 'photo-scan') {
      setIsPhotoMode(true);
      AsyncStorage.getItem('@helo_photo_scan_result').then((raw) => {
        if (raw) {
          const data = JSON.parse(raw);
          setDirectResult(data.product, data.matches, data.verdict);
        }
      }).catch(() => {});
      return;
    }

    // Guard: fire only once per barcode — phase change (async profile load) must
    // not launch a second concurrent OFF fetch that could timeout + overwrite success.
    // activeScanRef is set INSIDE the timer so that a cleanup (phase changed before
    // the 50 ms elapsed) properly resets the guard and the next fire can schedule
    // its own timer with the correct phase.
    if (activeScanRef.current === barcode) return;

    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      // Mark as scanned only once the timer actually fires
      activeScanRef.current = barcode;
      scanBarcode(barcode, phaseRef.current, isOffline);
    }, 50);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // `scanBarcode` and `setDirectResult` are stable refs from useScan — intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcode, phase, isOffline]);

  useEffect(() => {
    getBabyMode().then(setIsBabyMode).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isBabyMode || !product || !product.ingredientsList || product.ingredientsList.length === 0) return;
    matchIngredients(product.ingredientsList, 'baby')
      .then((babyM) => {
        setBabyMatches(babyM);
        setBabyVerdict(getVerdict(babyM));
      })
      .catch(() => {});
  }, [isBabyMode, product]);

  useEffect(() => {
    if (!barcode || barcode.startsWith('ocr_') || barcode === 'photo-scan' || !isPremium) return;
    fetchRecallForBarcode(barcode)
      .then((r) => setRecallMatch(r))
      .catch(() => {});
  }, [barcode, isPremium]);

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
        ...(isBabyMode ? { baby_product: true } : {}),
      });
      await AsyncStorage.setItem('@helo_shelf', JSON.stringify(shelf));
      try {
        const { score } = calculateGlowScore(
          shelf.map((i: { verdict?: string }, idx: number) => ({
            id: String(idx),
            name: '',
            brand: '',
            verdict: (i.verdict ?? 'safe') as 'safe' | 'caution' | 'danger',
            verdictLabel: '',
            category: 'salle-de-bain' as const,
            verdictChanged: false,
          })),
        );
        const profileRaw = await AsyncStorage.getItem('user_profile');
        let weekOfPregnancy = 20;
        let trimesterNum = 2;
        if (profileRaw) {
          const profile = JSON.parse(profileRaw);
          if (profile.dueDate) {
            const info = calculateTrimester(profile.dueDate);
            weekOfPregnancy = info.weekOfPregnancy;
            trimesterNum = info.trimester;
          }
        }
        await syncWidgetData({ glowScore: score, weekOfPregnancy, trimester: trimesterNum });
        await reloadWidgets();
      } catch {
        // Widget sync failure is non-critical — home screen widget falls back to last known data
      }
    } catch {
      // Shelf AsyncStorage update failure — verdict still shown, widget update skipped
    }

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
          trimester: phase === 'breastfeeding' ? null : phase,
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
        if (__DEV__) console.warn('[verdict] shelf Supabase insert error:', err);
      }
    }

    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  }, [barcode, product, verdict, effectiveUserId, phase, recipientUserId, senderFirstName]);

  const handleShare = useCallback(() => {
    if (!product || !verdict) return;
    setShareVisible(true);
  }, [product, verdict]);

  const displayVerdict = isBabyMode && activeTab === 'baby' ? (babyVerdict ?? verdict) : verdict;
  const displayMatches = isBabyMode && activeTab === 'baby' ? babyMatches : matches;

  const verdictColor = getVerdictColor(displayVerdict?.verdict);
  const verdictBgColor = getVerdictBg(displayVerdict?.verdict);
  const glowScore = displayVerdict ? computeGlowScore(displayVerdict) : 0;
  const sorted = sortMatches(displayMatches);
  const flagged = sorted.filter((m) => m.riskLevel !== 'no_signal');
  const noSignal = sorted.filter((m) => m.riskLevel === 'no_signal');
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  if (loading) return <LoadingScreen />;

  if (error) {
    if (notFound) {
      return (
        <View style={styles.root}>
          <GhostCaptureModal
            visible
            barcode={barcode}
            onPhotograph={() => {
              lastFailedBarcode.current = barcode;
              triggerGhostMode();
              router.replace({
                pathname: '/(tabs)/scan',
                params: { ghostBarcode: barcode },
              });
            }}
            onDismiss={() => {
              router.back();
            }}
          />
        </View>
      );
    }
    return (
      <VerdictErrorScreen
        error={error}
        barcode={barcode}
        topInset={Platform.OS === 'web' ? 67 : insets.top}
      />
    );
  }

  if (!verdict || !product) return <LoadingScreen />;

  return (
    <View style={styles.root}>
      <Toast visible={toastVisible} message={toastMessage} />

      <ShelfBottomSheet
        visible={sheetVisible}
        onSelect={handleShelfSelect}
        onClose={() => setSheetVisible(false)}
        babyMode={isBabyMode}
      />

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
              phase={phase}
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
          {/* Texture papier vélin (~5% opacité) — Moment 1 brief v1.1 */}
          <VellumTexture />
          <TouchableOpacity
            style={[styles.backRow, { marginTop: (Platform.OS === 'web' ? 67 : insets.top) + Spacing.sm }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
            <ThemedText variant="bodyMedium" style={styles.backRowText}>Retour</ThemedText>
          </TouchableOpacity>

          <View style={styles.heroCenter}>
            <ScoreCircle
              score={glowScore}
              color={verdictColor}
              verdict={displayVerdict?.verdict ?? verdict.verdict}
              onAnimDone={() => setLabelVisible(true)}
            />
            <VerdictLabel
              label={getVerdictLabel(displayVerdict?.verdict ?? verdict.verdict)}
              color={verdictColor}
              visible={labelVisible}
            />
            {labelVisible && (() => {
              const quote = getContextualQuote(
                phase,
                (displayVerdict?.verdict ?? verdict.verdict) as 'safe' | 'caution' | 'danger',
              );
              return (
                <>
                  <View style={{ marginTop: Spacing.md, paddingHorizontal: Spacing.lg }}>
                    <ThemedText
                      variant="bodyMedium"
                      color="textSecondary"
                      style={{ textAlign: 'center', fontStyle: 'italic', lineHeight: 20 }}
                    >
                      « {quote.text} »
                    </ThemedText>
                    <ThemedText
                      variant="labelSmall"
                      color="textTertiary"
                      style={{ textAlign: 'center', marginTop: 4, letterSpacing: 0.5 }}
                    >
                      — Selon le {quote.source}
                    </ThemedText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: Spacing.sm, paddingHorizontal: Spacing.lg }}>
                    <Feather name="info" size={11} color={Colors.textTertiary} />
                    <ThemedText
                      variant="bodySmall"
                      color="textTertiary"
                      style={{ fontStyle: 'italic', textAlign: 'center', fontSize: 11 }}
                    >
                      {getSourceAttribution(product.source)}
                    </ThemedText>
                  </View>
                </>
              );
            })()}
          </View>

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
            ) : isPhotoMode ? (
              <Badge variant="accent">Identifié par photo 📷</Badge>
            ) : phase === 'breastfeeding' ? (
              <Badge variant="accent">Mode allaitement 🤱</Badge>
            ) : (
              <Badge variant="accent">Évalué pour votre {phaseLabel(phase)}</Badge>
            )}
          </View>
        </LinearGradient>

        {/* ── BABY MODE TABS ── */}
        {isBabyMode && (
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'pregnancy' && styles.tabBtnActive]}
              onPress={() => setActiveTab('pregnancy')}
              accessibilityRole="tab"
              accessibilityLabel="Grossesse"
              accessibilityState={{ selected: activeTab === 'pregnancy' }}
            >
              <ThemedText
                variant="labelLarge"
                style={activeTab === 'pregnancy' ? styles.tabBtnTextActive : styles.tabBtnText}
              >
                🤰 Ma grossesse
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'baby' && styles.tabBtnActive]}
              onPress={() => setActiveTab('baby')}
              accessibilityRole="tab"
              accessibilityLabel="Bébé"
              accessibilityState={{ selected: activeTab === 'baby' }}
            >
              <ThemedText
                variant="labelLarge"
                style={activeTab === 'baby' ? styles.tabBtnTextActive : styles.tabBtnText}
              >
                👶 Mon bébé
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* ── PHOTO IDENTIFICATION BANNER ── */}
        {product?.isPhotoIdentified && (
          <View style={styles.photoBanner}>
            <View style={styles.photoBannerIcon}>
              <Feather name="info" size={18} color={Colors.accent} />
            </View>
            <ThemedText variant="bodySmall" style={styles.photoBannerText}>
              Ce produit a été identifié visuellement. Pour un résultat plus précis, scannez le code-barres ou la liste d'ingrédients.
            </ThemedText>
          </View>
        )}

        {/* ── RECALL ALERT BANNER ── */}
        {recallMatch && <RecallAlertBanner recallMatch={recallMatch} />}

        {/* ── INGREDIENT DETAILS ── */}
        <IngredientsSection
          flagged={flagged}
          noSignal={noSignal}
          isPremium={isPremium}
          requirePremium={requirePremium}
          phase={phase}
          totalIngredientsCount={product?.ingredientsList?.length ?? 0}
        />

        {/* ── PARTAGER DANS MON CERCLE — V1: masqué, réactiver pour V2 ── */}
        {/* Réactiver pour V2 :
        {circleId && verdict && product && (
          <CircleShareRow
            circleId={circleId}
            isPartner={isPartner}
            verdict={verdict}
            product={product}
            firstName={firstName ?? ''}
            userId={userId}
            sharedToCircle={sharedToCircle}
            setSharedToCircle={setSharedToCircle}
          />
        )}
        */}

        {/* ── DISCLAIMER ── */}
        <View style={styles.disclaimerSection}>
          <Divider style={styles.sectionDivider} />
          <ThemedText variant="bodySmall" color="textTertiary" style={styles.disclaimerText}>
            {SCAN_DISCLAIMER}
          </ThemedText>
          <TouchableOpacity
            onPress={() => router.push('/methodology')}
            style={styles.methodologyLink}
            accessibilityRole="link"
            accessibilityLabel="Notre méthodologie"
          >
            <ThemedText variant="bodySmall" style={styles.methodologyLinkText}>
              Notre méthodologie →
            </ThemedText>
          </TouchableOpacity>
          <ScanDisclaimerBanner />
          <TouchableOpacity
            onPress={() => setReportVisible(true)}
            style={styles.methodologyLink}
            accessibilityRole="button"
            accessibilityLabel="Signaler une erreur"
          >
            <ThemedText variant="bodySmall" style={{ color: Colors.textTertiary, textAlign: 'center' }}>
              Signaler une erreur
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── BOTTOM ACTION BAR ── */}
      <VerdictBottomBar
        verdict={verdict}
        product={product}
        barcode={barcode}
        onShelf={() => setSheetVisible(true)}
        onShare={handleShare}
        bottomPad={bottomPad}
      />

      <ReportBottomSheet
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        userId={userId ?? null}
        scanId={barcode}
        productName={product?.name ?? ''}
      />
    </View>
  );
}
