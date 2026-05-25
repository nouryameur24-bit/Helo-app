import { swallow } from '@/lib/swallow';
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
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ScanDisclaimerBanner } from '@/components/ScanDisclaimerBanner';
import { ShareBottomSheet } from '@/components/share/ShareBottomSheet';
import { VerdictShareCard } from '@/components/share/VerdictShareCard';
import { Badge } from '@/components/ui/Badge';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';

import { LoadingScreen, ScoreCircle, VerdictLabel, Toast } from '@/components/verdict/VerdictAnimations';
import { ContributionRewardToast } from '@/components/verdict/ContributionRewardToast';
import { VellumTexture } from '@/components/verdict/VellumTexture';
import { getContextualQuote } from '@/lib/contextualQuotes';
import { CircleShareRow } from '@/components/verdict/CircleShareRow';
import { IngredientsSection } from '@/components/verdict/IngredientsSection';
import { RecallAlertBanner } from '@/components/verdict/RecallAlertBanner';
import { ShelfBottomSheet } from '@/components/verdict/ShelfBottomSheet';
import { ReportBottomSheet } from '@/components/verdict/ReportBottomSheet';
import { GhostCaptureModal } from '@/components/verdict/GhostCaptureModal';
import { GhostContributionCard } from '@/components/verdict/GhostContributionCard';
import { VerdictBottomBar } from '@/components/verdict/VerdictBottomBar';
import { OverrideBanner, AcceptOverrideButton } from '@/components/verdict/AcceptOverrideSheet';
import { VerdictErrorScreen } from '@/components/verdict/VerdictErrorScreen';
import { OnboardingCompleteModal } from '@/components/onboarding/OnboardingCompleteModal';
import { AllergyWarningBanner } from '@/components/verdict/AllergyWarningBanner';
import { PregnancyRisksBanner } from '@/components/verdict/PregnancyRisksBanner';
import { UnknownCompositionBanner } from '@/components/verdict/UnknownCompositionBanner';
import { useSafeBack } from '@/hooks/useSafeBack';
import { BlurView } from 'expo-blur';
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
import { Colors, Radius, Spacing } from '@/constants/theme';
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
import { STORAGE_KEYS, ocrResultKey } from '@/lib/storageKeys';
import { track } from '@/lib/analytics';

export default function VerdictScreen() {
  const {
    scanId,
    ghostThanks,
    ghostBarcode: ghostBarcodeParam,
    ghostContribCount: ghostContribCountParam,
  } = useLocalSearchParams<{
    scanId: string;
    ghostThanks?: string;
    ghostBarcode?: string;
    ghostContribCount?: string;
  }>();
  const ghostBarcode = ghostBarcodeParam ? decodeURIComponent(ghostBarcodeParam) : '';
  const ghostContribCount = (() => {
    if (!ghostContribCountParam) return 0;
    const n = parseInt(ghostContribCountParam, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  })();
  const barcode = decodeURIComponent(scanId ?? '');
  const insets = useSafeAreaInsets();
  const { loading, product, matches, verdict, error, notFound, scanBarcode, setDirectResult } = useScan();
  const { isPremium, requirePremium } = usePremium();
  const { isOffline } = useOffline();
  // Lot 15B2 — back centralisé : si pas d'historique (deep-link, cold start),
  // route vers le scan tab plutôt que de no-op silencieux.
  const safeBack = useSafeBack('/(tabs)/scan');

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
  const [rewardToastVisible, setRewardToastVisible] = useState(false);
  const ghostThanksShownRef = useRef(false);
  // Lot 15A1 — célébration "🎉 Setup terminé" affichée UNE SEULE FOIS après
  // le verdict du tout premier scan (entrée via onboarding/first-scan).
  const [onboardingCelebrationVisible, setOnboardingCelebrationVisible] = useState(false);
  const onboardingCelebrationShownRef = useRef(false);
  // Lot 17-06 — Timeout safeguard. Si verdict + product restent null pendant
  // 10s (matcher gelé, Anthropic down, Supabase lag), on bascule en error
  // au lieu de laisser le spinner tourner indéfiniment. Pour une app
  // grossesse, "j'ai abandonné après 30s" = retour utilisateur très négatif.
  const [scanTimedOut, setScanTimedOut] = useState(false);

  // ── Ghost Capture "merci" celebration ───────────────────────────────────────
  // Triggered when the user arrives from the OCR review flow with ghostThanks=1.
  // Two paths:
  //   • ghostContribCount > 0 → render the dedicated ContributionRewardToast
  //     (rich, dismissable, includes ordinal — the reciprocity moment).
  //   • count == 0 (legacy entry without param) → fall back to the generic
  //     single-line Toast so older deep links don't regress.
  // Both play a success haptic exactly once per navigation.
  useEffect(() => {
    if (ghostThanks !== '1' || ghostThanksShownRef.current) return;
    if (loading) return;
    ghostThanksShownRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(swallow);
    if (ghostContribCount > 0) {
      setRewardToastVisible(true);
    } else {
      setToastMessage("✨ Merci ! Vous venez d'aider la communauté Hēlo");
      setToastVisible(true);
      const t = setTimeout(() => setToastVisible(false), 3000);
      return () => clearTimeout(t);
    }
  }, [ghostThanks, ghostContribCount, loading]);
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
    }).catch(swallow);
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
        AsyncStorage.getItem(STORAGE_KEYS.profile).then((raw) => {
          if (raw) {
            const p = JSON.parse(raw);
            if (p.trimester) {
              setPhase(p.trimester as Phase);
              phaseRef.current = p.trimester as Phase;
            }
          }
        }).catch(swallow);
      }
    }).catch(swallow);
  }, [profileTrimester]);

  useEffect(() => {
    if (!barcode) return;

    if (barcode.startsWith('ocr_')) {
      setIsOCRMode(true);
      const id = barcode.slice(4);
      AsyncStorage.getItem(ocrResultKey(id)).then((raw) => {
        if (raw) {
          const data = JSON.parse(raw);
          setDirectResult(data.product, data.matches, data.verdict);
        }
      }).catch(swallow);
      return;
    }

    if (barcode === 'photo-scan') {
      setIsPhotoMode(true);
      AsyncStorage.getItem(STORAGE_KEYS.photoScanResult).then((raw) => {
        if (raw) {
          const data = JSON.parse(raw);
          setDirectResult(data.product, data.matches, data.verdict);
        }
      }).catch(swallow);
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
    getBabyMode().then(setIsBabyMode).catch(swallow);
  }, []);

  useEffect(() => {
    if (!isBabyMode || !product || !product.ingredientsList || product.ingredientsList.length === 0) return;
    matchIngredients(product.ingredientsList, 'baby')
      .then((babyM) => {
        setBabyMatches(babyM);
        setBabyVerdict(getVerdict(babyM));
      })
      .catch(swallow);
  }, [isBabyMode, product]);

  useEffect(() => {
    // Lot 17-09 — Recall RappelConso pour TOUS les users (free + premium).
    // Les rappels conso sont safety-critical (produits potentiellement
    // dangereux retirés du marché). Premium gardera plus tard l'accès à
    // l'historique étendu + push notifications, mais le check du produit
    // scanné en cours est gratuit pour tous.
    if (!barcode || barcode.startsWith('ocr_') || barcode === 'photo-scan') return;
    fetchRecallForBarcode(barcode)
      .then((r) => setRecallMatch(r))
      .catch(swallow);
  }, [barcode]);

  useEffect(() => {
    if (!verdict) return;
    if (verdict.verdict === 'safe') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (verdict.verdict === 'caution') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    track('scan_verdict_shown', {
      verdict: verdict.verdict,
      product_name: product?.name,
      phase: String(phase),
      is_ocr: isOCRMode,
      is_photo: isPhotoMode,
      glow_score: verdict.glowScoreRemote ?? null,
    }).catch(() => {});
  }, [verdict]);

  // ── Lot 17-06 — Timeout safeguard 10s ─────────────────────────────────────
  // Démarre un timer à chaque nouveau barcode. Si on n'a toujours pas de
  // verdict+product à T+10s, on bascule en mode timeout et affiche un
  // VerdictErrorScreen "Le scan est trop lent". Cleanup à chaque ré-arm.
  useEffect(() => {
    if (verdict && product) {
      setScanTimedOut(false);
      return;
    }
    if (error || notFound) return; // déjà géré par les écrans d'erreur
    const t = setTimeout(() => setScanTimedOut(true), 10_000);
    return () => clearTimeout(t);
  }, [verdict, product, error, notFound, barcode]);

  // ── Lot 15A1 — célébration "Setup terminé" après le 1er scan ───────────────
  // Déclenchée UNE SEULE FOIS : à l'arrivée sur le verdict du tout premier
  // scan (lancé via onboarding/first-scan), on affiche la modale OnboardingComplete
  // avec un mini-tour des onglets. Le drapeau `firstScanCompleted` empêche
  // toute ré-affichage les scans suivants.
  useEffect(() => {
    if (!verdict || onboardingCelebrationShownRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const [pending, alreadyDone] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.pendingFirstScan),
          AsyncStorage.getItem(STORAGE_KEYS.firstScanCompleted),
        ]);
        if (cancelled) return;
        if (pending !== '1' || alreadyDone === '1') return;
        onboardingCelebrationShownRef.current = true;
        // Laisser respirer le verdict animations (~700ms) avant de pop la modale
        // pour que l'utilisatrice voie d'abord son score puis la célébration.
        setTimeout(() => {
          if (!cancelled) setOnboardingCelebrationVisible(true);
        }, 750);
        // Consume + persist : flag pending = utilisé, flag completed = définitif
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.pendingFirstScan, ''],
          [STORAGE_KEYS.firstScanCompleted, '1'],
        ]);
        track('onboarding_first_scan_celebrated', {
          verdict: verdict.verdict,
        }).catch(() => {});
      } catch (err) {
        if (__DEV__) console.warn('[verdict] first-scan celebration check failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [verdict]);

  const handleShelfSelect = useCallback(async (category: string) => {
    setSheetVisible(false);

    // Lot 16-06 — Haptic Success quand le produit atterrit dans le placard.
    // Avant : pure silence côté tactile, l'action semblait ne "rien faire".
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const shelfUserId = effectiveUserId;
    const productName = product?.name ?? 'Produit';

    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEYS.shelf) ?? '[]';
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
      await AsyncStorage.setItem(STORAGE_KEYS.shelf, JSON.stringify(shelf));
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
        const profileRaw = await AsyncStorage.getItem(STORAGE_KEYS.profile);
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

    track('product_added_to_shelf', {
      category,
      verdict: verdict?.verdict,
      product_name: product?.name,
      phase: String(phase),
    }).catch(() => {});

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
  // Le backend est désormais l'autorité du score quand disponible (online path).
  // En offline pur, on retombe sur le calcul local déterministe.
  const glowScore = displayVerdict
    ? (displayVerdict.glowScoreRemote ?? computeGlowScore(displayVerdict))
    : 0;
  const sorted = sortMatches(displayMatches);
  const flagged = sorted.filter((m) => m.riskLevel !== 'no_signal');
  const noSignal = sorted.filter((m) => m.riskLevel === 'no_signal');
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  // Lot 17-06 — Timeout > 10s : on n'attend plus, on affiche une erreur
  // claire pour permettre à l'utilisatrice de retry ou de revenir au scan.
  if (scanTimedOut && (!verdict || !product) && !notFound) {
    return (
      <VerdictErrorScreen
        error="Le scan prend trop de temps. Vérifie ta connexion et réessaie."
        barcode={barcode}
        topInset={Platform.OS === 'web' ? 67 : insets.top}
      />
    );
  }

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
              router.replace({
                pathname: '/(tabs)/scan',
                params: { ghostBarcode: barcode, ghostMode: '1' },
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

      <ContributionRewardToast
        visible={rewardToastVisible}
        count={ghostContribCount}
        onDismiss={() => setRewardToastVisible(false)}
      />

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

      {/* ── Lot 15B2 — Sticky header ──
          Avant : l'écran verdict n'avait QU'UN bouton retour caché dans
          le hero gradient → scroll → disparaît → l'utilisatrice ne sait
          plus comment sortir ni quel produit elle regarde. Maintenant
          ce header reste TOUJOURS visible en haut avec :
          (chevron retour | nom du produit centré | espace pour menu).
          BlurView pour rester lisible par-dessus n'importe quel fond. */}
      <View
        style={[
          stickyHeaderStyles.wrap,
          { paddingTop: (Platform.OS === 'web' ? 67 : insets.top) },
        ]}
        pointerEvents="box-none"
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 60 : 80}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <View style={stickyHeaderStyles.row}>
          <TouchableOpacity
            onPress={safeBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            style={stickyHeaderStyles.backBtn}
          >
            <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          <ThemedText
            variant="labelLarge"
            color="textPrimary"
            numberOfLines={1}
            style={stickyHeaderStyles.title}
          >
            {product?.name ?? 'Analyse du produit'}
          </ThemedText>

          <TouchableOpacity
            onPress={handleShare}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Partager"
            style={stickyHeaderStyles.menuBtn}
          >
            <Feather name="share" size={18} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

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
          style={[
            styles.hero,
            // Lot 15B2 — padding-top = safe-area + hauteur du sticky header
            // (~60px) pour que le contenu du hero démarre juste sous celui-ci.
            { paddingTop: (Platform.OS === 'web' ? 67 : insets.top) + 64 },
          ]}
        >
          {/* Texture papier vélin (~5% opacité) — Moment 1 brief v1.1 */}
          <VellumTexture />
          {/* Lot 15B2 — La back-row interne est supprimée car redondante
              avec le sticky header au-dessus. Le hero commence directement
              avec un padding-top compensant la hauteur du sticky header. */}

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
            {(() => {
              // Carte "Provenance de l'analyse" — design premium différencié
              // par source (IA = lavande subtile, déterministe = vert sauge).
              // Affichée uniquement quand l'explication backend est présente
              // (mode online). En offline pur, rien n'est rendu (zéro régression).
              const explanation = displayVerdict?.aiExplanation?.trim();
              if (!labelVisible || !explanation) return null;
              const isAi = displayVerdict?.aiSource === 'ai';

              // Palette dédiée — pas dans le thème (usage local et ciblé).
              // Choisi pour : (a) contraste WCAG AA sur fond clair, (b) cohésion
              // avec la palette nude/cream/gold sans la concurrencer.
              const palette = isAi
                ? {
                    bg: '#F4F0FB',       // lavande très pâle
                    border: '#D4C7EC',   // lavande douce
                    accent: '#6B5B9C',   // violet profond (header + emoji wrap)
                    emoji: '✨',
                    label: 'Analysé par Hēlo IA',
                  }
                : {
                    bg: '#EEF7F0',       // sauge très pâle
                    border: '#BFD9C8',   // sauge douce
                    accent: '#4F8068',   // vert médical profond
                    emoji: '🛡️',
                    label: 'Vérifié via nos sources médicales',
                  };

              return (
                <View
                  style={{
                    marginTop: Spacing.md,
                    marginHorizontal: Spacing.lg,
                    paddingVertical: Spacing.md,
                    paddingHorizontal: Spacing.lg,
                    backgroundColor: palette.bg,
                    borderRadius: Radius.lg,
                    borderWidth: 1,
                    borderColor: palette.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <ThemedText style={{ fontSize: 14 }}>{palette.emoji}</ThemedText>
                    <ThemedText
                      variant="labelSmall"
                      style={{
                        color: palette.accent,
                        letterSpacing: 0.4,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {palette.label}
                    </ThemedText>
                  </View>
                  <ThemedText
                    variant="bodyMedium"
                    style={{
                      lineHeight: 22,
                      textAlign: 'left',
                      color: Colors.textPrimary,
                    }}
                  >
                    {explanation}
                  </ThemedText>
                </View>
              );
            })()}
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

          {/* v4 Lot 12 — Banner si l'utilisatrice a déjà accepté ce produit
              auparavant. Le composant s'auto-cache si pas d'override. */}
          <OverrideBanner barcode={barcode} />

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

        {/* ── Lot 18-06 — Badge "X mamas ont contribué" ──
            Affiché UNIQUEMENT pour les produits issus du ghost capture
            communautaire. Construit la confiance dans le verdict en
            montrant que d'autres utilisatrices ont déjà scanné ce produit. */}
        {product?.source === 'community' && product.communityContributionCount && product.communityContributionCount > 0 && (
          <View style={communityBadgeStyles.wrap}>
            <View style={communityBadgeStyles.iconWrap}>
              <ThemedText style={{ fontSize: 14 }}>💛</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="labelLarge" color="textPrimary">
                {product.communityContributionCount === 1
                  ? '1 maman a contribué'
                  : `${product.communityContributionCount} mamans ont contribué`}
              </ThemedText>
              <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
                Verdict construit grâce à la communauté Hēlo
                {product.communityContributionCount >= 5 ? ' · validé' : ' · en cours de validation'}
              </ThemedText>
            </View>
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

        {/* ── Lot 17-02 — Bannière ROUGE allergène déclaré (TOP PRIORITY) ──
            Affichée AVANT le recall, car c'est l'alerte la + critique :
            risque vital pour l'utilisatrice qui a déclaré une allergie. */}
        <AllergyWarningBanner allergyWarnings={verdict.allergyWarnings} />

        {/* ── Lot 19-D1 — Bannière risques pregnancy-specific ──
            Affiche les tags pré-calculés Supabase (listeria, toxo,
            mercure, alcool, caféine, etc.). Verdicts précis et
            contextuels pour les aliments. */}
        <PregnancyRisksBanner risks={product?.pregnancyRisks} />

        {/* ── RECALL ALERT BANNER ── */}
        {recallMatch && <RecallAlertBanner recallMatch={recallMatch} />}

        {/* ── Lot 17-01 — Bannière "composition (partiellement) inconnue" ──
            Affichée si tous OU >50% des ingrédients ne sont pas dans notre
            DB. Évite l'illusion de "tout va bien" trompeuse pour les
            produits rares (tisanes, herbes, marques niche). */}
        {verdict && (verdict.allIngredientsUnknown || (verdict.unknownRatio !== undefined && verdict.unknownRatio > 0.5)) && (
          <UnknownCompositionBanner
            totalCount={verdict.totalCount ?? 0}
            noSignalCount={verdict.noSignalCount}
            allUnknown={verdict.allIngredientsUnknown ?? false}
          />
        )}

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

        {/* ── GHOST CAPTURE CONTRIBUTION CARD ── */}
        {/* Only shown for ghost-capture flows (user came from OCR review with    */}
        {/* an unknown barcode). Appears 1s after verdict to create a reciprocity */}
        {/* moment — she got her value, now she can give back optionally.        */}
        {ghostThanks === '1' && ghostBarcode ? (
          <GhostContributionCard
            barcode={ghostBarcode}
            onSubmitted={(msg) => {
              setToastMessage(msg);
              setToastVisible(true);
              if (toastTimer.current) clearTimeout(toastTimer.current);
              toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
            }}
          />
        ) : null}

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

          {/* v4 Lot 12 — "J'achète quand même" pour les verdicts caution/danger.
              Le composant s'auto-cache si déjà overridden (le banner suffit). */}
          {(displayVerdict?.verdict ?? verdict.verdict) !== 'safe' && (
            <AcceptOverrideButton
              barcode={barcode}
              verdict={(displayVerdict?.verdict ?? verdict.verdict) as 'caution' | 'danger'}
            />
          )}
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

      {/* Lot 15A1 — Célébration "🎉 Setup terminé" après le 1er scan.
          Affichée UNE SEULE FOIS (drapeau AsyncStorage `firstScanCompleted`).
          CTA principal "Découvrir mon placard" route vers /(tabs)/shelf. */}
      <OnboardingCompleteModal
        visible={onboardingCelebrationVisible}
        onClose={() => setOnboardingCelebrationVisible(false)}
        firstName={firstName}
      />
    </View>
  );
}

// Lot 18-06 — Badge "X mamas ont contribué" pour les produits community.
const communityBadgeStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.accentLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '33',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Lot 15B2 — Styles du header sticky du verdict screen.
// Positionné absolute + zIndex haut pour rester au-dessus de tous les
// éléments du hero. BlurView lui donne le voile iOS-style.
const stickyHeaderStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: Spacing.xs,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
