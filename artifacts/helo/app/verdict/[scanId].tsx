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
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

import { LoadingScreen, ScoreCircle, VerdictLabel, Toast } from '@/components/verdict/VerdictAnimations';
import { IngredientCard } from '@/components/verdict/IngredientCard';
import { ShelfBottomSheet } from '@/components/verdict/ShelfBottomSheet';
import {
  getVerdictColor,
  getVerdictBg,
  getVerdictLabel,
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
import { sendShelfAddNotification, sendCircleScanNotification } from '@/lib/notifications';
import { fetchRecallForBarcode } from '@/hooks/useRecallAlerts';
import { getCircle, postScanToCircle } from '@/lib/circleUtils';
import { matchIngredients, getVerdict } from '@/lib/productLookup';
import type { RappelConsoRecord } from '@/lib/rappelConso';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { MatchResult, Phase, VerdictResult } from '@/types';

export default function VerdictScreen() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const barcode = decodeURIComponent(scanId ?? '');
  const insets = useSafeAreaInsets();
  const { loading, product, matches, verdict, error, scanBarcode, setDirectResult } = useScan();
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
  const [phase, setPhase] = useState<Phase>(2);
  const [isOCRMode, setIsOCRMode] = useState(false);
  const [isPhotoMode, setIsPhotoMode] = useState(false);
  const [isBabyMode, setIsBabyMode] = useState(false);
  const [babyMatches, setBabyMatches] = useState<MatchResult[]>([]);
  const [babyVerdict, setBabyVerdict] = useState<VerdictResult | null>(null);
  const [activeTab, setActiveTab] = useState<'pregnancy' | 'baby'>('pregnancy');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [circleId, setCircleId] = useState<string | null>(null);
  const [sharedToCircle, setSharedToCircle] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getCircle(userId).then((data) => {
      setCircleId(data?.circle?.id ?? null);
    }).catch(() => {});
  }, [userId]);

  useEffect(() => {
    getBreastfeedingMode().then((isBF) => {
      if (isBF) {
        setPhase('breastfeeding');
        return;
      }
      if (profileTrimester !== null && profileTrimester !== undefined) {
        setPhase(profileTrimester as Phase);
      } else {
        AsyncStorage.getItem('user_profile').then((raw) => {
          if (raw) {
            const p = JSON.parse(raw);
            if (p.trimester) setPhase(p.trimester as Phase);
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

    scanBarcode(barcode, phase, isOffline);
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
    const isNotFound = error.startsWith('Produit non trouvé');
    return (
      <View style={[styles.root, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          <ThemedText variant="bodyMedium" style={{ marginLeft: 8 }}>Retour</ThemedText>
        </TouchableOpacity>
        <View style={styles.errorCenter}>
          <View style={[styles.iconCircle, { backgroundColor: isNotFound ? Colors.cautionBg : Colors.dangerLight }]}>
            <Feather name={isNotFound ? 'search' : 'wifi-off'} size={32} color={isNotFound ? Colors.caution : Colors.danger} />
          </View>
          <ThemedText variant="headlineMedium" style={styles.centeredText}>
            {isNotFound ? 'Produit non trouvé' : 'Erreur de chargement'}
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={[styles.centeredText, { marginTop: Spacing.sm }]}>
            {isNotFound
              ? 'Ce produit n\'est pas encore dans notre base de données.'
              : error}
          </ThemedText>
          <View style={{ marginTop: Spacing.xl, width: '100%', gap: Spacing.md }}>
            {isNotFound && (
              <Button
                variant="primary"
                fullWidth
                onPress={() => {
                  router.push({
                    pathname: '/submit-product',
                    params: { barcode },
                  } as never);
                }}
              >
                Contribuer — ajouter ce produit ✦
              </Button>
            )}
            <Button variant={isNotFound ? 'secondary' : 'primary'} fullWidth onPress={() => router.back()}>
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
      <Toast visible={toastVisible} message="Ajouté à votre placard ✓" />

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
          <TouchableOpacity
            style={[styles.backRow, { marginTop: (Platform.OS === 'web' ? 67 : insets.top) + Spacing.sm }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
            <ThemedText variant="bodyMedium" style={{ marginLeft: 8 }}>Retour</ThemedText>
          </TouchableOpacity>

          <View style={styles.heroCenter}>
            <ScoreCircle
              score={glowScore}
              color={verdictColor}
              onAnimDone={() => setLabelVisible(true)}
            />
            <VerdictLabel
              label={getVerdictLabel(displayVerdict?.verdict ?? verdict.verdict)}
              color={verdictColor}
              visible={labelVisible}
            />
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
                style={{ color: activeTab === 'pregnancy' ? Colors.accent : Colors.textSecondary }}
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
                style={{ color: activeTab === 'baby' ? Colors.accent : Colors.textSecondary }}
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
        {recallMatch && (
          <Pressable
            style={styles.recallBanner}
            onPress={() => Linking.openURL(recallMatch.lien_vers_la_fiche_rappel).catch(() => {})}
            accessibilityRole="button"
            accessibilityLabel="Voir le rappel officiel"
          >
            <View style={styles.recallBannerIcon}>
              <Feather name="alert-triangle" size={20} color={Colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="labelLarge" style={{ color: Colors.danger }}>
                RAPPEL OFFICIEL EN COURS
              </ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 2 }} numberOfLines={2}>
                {recallMatch.motif_rappel}
              </ThemedText>
            </View>
            <Feather name="external-link" size={16} color={Colors.danger + '88'} />
          </Pressable>
        )}

        {/* ── INGREDIENT DETAILS ── */}
        {(flagged.length > 0 || noSignal.length > 0) && (
          <View style={{ position: 'relative' }}>
            {flagged.length > 0 && (
              <View style={styles.section}>
                <ThemedText variant="headlineMedium" style={styles.sectionTitle}>
                  Ingrédients analysés
                </ThemedText>
                {(isPremium ? flagged : flagged.slice(0, 2)).map((m) => (
                  <IngredientCard key={m.ingredientName} match={m} />
                ))}
              </View>
            )}

            {isPremium && noSignal.length > 0 && (
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

            {!isPremium && (
              <View style={styles.premiumGate}>
                <View style={styles.premiumGateCard}>
                  <ThemedText style={styles.premiumGateEmoji}>🔍</ThemedText>
                  <ThemedText variant="headlineMedium" color="textPrimary" style={styles.premiumGateTitle}>
                    Détails ingrédients
                  </ThemedText>
                  <ThemedText variant="bodyMedium" color="textSecondary" style={styles.premiumGateBody}>
                    Accédez à l'analyse complète de tous les ingrédients, leurs risques par trimestre et les sources scientifiques.
                  </ThemedText>
                  <Pressable
                    onPress={() => requirePremium('feature')}
                    style={({ pressed }) => [styles.premiumGateBtn, { opacity: pressed ? 0.88 : 1 }]}
                    accessibilityRole="button"
                    accessibilityLabel="Voir les détails avec Premium"
                  >
                    <ThemedText style={styles.premiumGateBtnText}>Voir les détails — Premium</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── PARTAGER DANS MON CERCLE ── */}
        {circleId && !isPartner && verdict && product && (
          <View style={styles.circleSectionWrap}>
            <Divider style={{ marginVertical: Spacing.lg }} />
            <View style={styles.circleShareRow}>
              <View style={styles.circleShareIcon}>
                <Feather name="users" size={18} color={Colors.accentDark} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="bodyLarge" color="textPrimary">Partager dans mon cercle</ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary">
                  {sharedToCircle ? 'Partagé ! Vos proches ont été notifiées.' : 'Notifie vos proches de ce scan'}
                </ThemedText>
              </View>
              <Switch
                value={sharedToCircle}
                onValueChange={async (val) => {
                  if (val && !sharedToCircle) {
                    const scanVerdict = (verdict.verdict ?? 'safe') as 'safe' | 'caution' | 'danger';
                    const senderName = firstName || 'Anonyme';
                    try {
                      await postScanToCircle({
                        circleId: circleId,
                        userId,
                        firstName: senderName,
                        productName: product.name,
                        verdict: scanVerdict,
                      });
                      setSharedToCircle(true);
                      sendCircleScanNotification({
                        senderFirstName: senderName,
                        productName: product.name,
                        verdict: scanVerdict,
                        circleId: circleId,
                        senderUserId: userId,
                      }).catch(() => {});
                    } catch {
                      setSharedToCircle(false);
                    }
                  }
                }}
                trackColor={{ false: Colors.borderLight, true: Colors.accent }}
                thumbColor={sharedToCircle ? Colors.accentDark : '#f4f3f4'}
                disabled={sharedToCircle}
              />
            </View>
          </View>
        )}

        {/* ── DISCLAIMER ── */}
        <View style={styles.disclaimerSection}>
          <Divider style={{ marginVertical: Spacing.lg }} />
          <ThemedText variant="bodySmall" color="textTertiary" style={styles.disclaimerText}>
            {SCAN_DISCLAIMER}
          </ThemedText>
          <TouchableOpacity
            onPress={() => router.push('/methodology')}
            style={{ marginTop: Spacing.sm }}
            accessibilityRole="link"
            accessibilityLabel="Notre méthodologie"
          >
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
          <IconButton onPress={handleShare} size={44} accessibilityLabel="Partager">
            <Feather name="share-2" size={18} color={Colors.textSecondary} />
          </IconButton>
          <IconButton
            onPress={() =>
              router.push({
                pathname: '/compare',
                params: { barcode, slot: 'A' },
              } as never)
            }
            size={44}
            accessibilityLabel="Comparer"
          >
            <Feather name="git-branch" size={18} color={Colors.textSecondary} />
          </IconButton>
          <IconButton onPress={() => router.back()} size={44} accessibilityLabel="Scanner un autre produit">
            <Feather name="camera" size={18} color={Colors.textSecondary} />
          </IconButton>
        </View>
      </View>
    </View>
  );
}
