// ─── Comparateur de produits ──────────────────────────────────────────────────
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';

import { GlowScoreCircle } from '@/components/GlowScoreCircle';
import { CompareShareCard } from '@/components/share/CompareShareCard';
import { ShareBottomSheet } from '@/components/share/ShareBottomSheet';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import {
  fetchProductByBarcode,
  getVerdict,
  matchIngredients,
} from '@/lib/productLookup';
import type { MatchResult, ProductData, VerdictResult, Trimester } from '@/types';

const { width: W, height: H } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
type VerdictKind = 'safe' | 'caution' | 'danger';

interface SlotData {
  barcode: string;
  product: ProductData;
  matches: MatchResult[];
  verdict: VerdictResult;
  score: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function computeScore(verdict: VerdictResult): number {
  const danger = verdict.flaggedIngredients.filter((m) => m.riskLevel === 'danger').length;
  const caution = verdict.flaggedIngredients.filter((m) => m.riskLevel === 'caution').length;
  const penaltyD = Math.min(danger * 25, 65);
  const penaltyC = Math.min(caution * 10, 30);
  return Math.max(10, 100 - penaltyD - penaltyC);
}

function verdictColor(v: VerdictKind): string {
  if (v === 'danger') return Colors.danger;
  if (v === 'caution') return Colors.caution;
  return Colors.safe;
}

function verdictBg(v: VerdictKind): string {
  if (v === 'danger') return Colors.dangerBg;
  if (v === 'caution') return Colors.cautionBg;
  return Colors.safeBg;
}

function verdictLabel(v: VerdictKind): string {
  if (v === 'danger') return 'À éviter';
  if (v === 'caution') return 'Précaution';
  return 'Compatible';
}

function trimesterLabel(t: number): string {
  if (t === 1) return '1er trimestre';
  if (t === 2) return '2ème trimestre';
  return '3ème trimestre';
}

function buildAvis(
  slotA: SlotData,
  slotB: SlotData,
  trimester: number,
): string {
  const trim = trimesterLabel(trimester);
  const nameA = slotA.product.name;
  const nameB = slotB.product.name;
  const vA = slotA.verdict.verdict;
  const vB = slotB.verdict.verdict;

  if (vA === 'safe' && vB === 'safe') {
    return `Les deux produits ne présentent aucun signalement identifié pour votre ${trim}. Vous pouvez utiliser l'un ou l'autre en toute sérénité.`;
  }
  if (vA === 'safe' && vB !== 'safe') {
    return `Pour votre ${trim}, ${nameA} ne présente aucun signalement contrairement à ${nameB}. Nous vous recommandons d'opter pour ${nameA}. Consultez votre professionnel de santé si besoin.`;
  }
  if (vA !== 'safe' && vB === 'safe') {
    return `Pour votre ${trim}, ${nameB} ne présente aucun signalement contrairement à ${nameA}. Nous vous recommandons d'opter pour ${nameB}. Consultez votre professionnel de santé si besoin.`;
  }
  if (vA === 'danger' && vB === 'danger') {
    return `Les deux produits contiennent des ingrédients signalés pour votre ${trim}. Nous vous suggérons de consulter des alternatives sécurisées. Parlez-en à votre professionnel de santé.`;
  }
  // Both caution, or mixed caution/danger
  if (slotA.score >= slotB.score) {
    return `Pour votre ${trim}, ${nameA} présente moins d'ingrédients à surveiller que ${nameB}. Les deux nécessitent une attention particulière — consultez votre professionnel de santé.`;
  }
  return `Pour votre ${trim}, ${nameB} présente moins d'ingrédients à surveiller que ${nameA}. Les deux nécessitent une attention particulière — consultez votre professionnel de santé.`;
}

// ─── Camera modal ─────────────────────────────────────────────────────────────
function CameraModal({
  visible,
  onClose,
  onScan,
}: {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const lastScan = useRef<number>(0);

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!data) return;
      const now = Date.now();
      if (now - lastScan.current < 1500) return;
      lastScan.current = now;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onScan(data);
    },
    [onScan],
  );

  useEffect(() => {
    if (visible && permission && !permission.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  if (!visible) return null;

  const vfSize = Math.min(W * 0.7, 280);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={cam.root}>
        {/* Header */}
        <View style={cam.header}>
          <TouchableOpacity style={cam.closeBtn} onPress={onClose}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
          <ThemedText variant="headlineMedium" style={cam.headerTitle}>
            Scanner un produit
          </ThemedText>
        </View>

        {/* Camera */}
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        ) : (
          <View style={cam.noPermission}>
            <Feather name="camera-off" size={40} color={Colors.textTertiary} />
            <ThemedText variant="bodyMedium" color="textTertiary" style={{ marginTop: Spacing.md }}>
              Autorisation caméra requise
            </ThemedText>
            <TouchableOpacity onPress={requestPermission} style={{ marginTop: Spacing.lg }}>
              <ThemedText variant="labelLarge" style={{ color: Colors.accent }}>
                Autoriser
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Viewfinder overlay */}
        {permission?.granted && (
          <View style={cam.overlay} pointerEvents="none">
            <View style={[cam.vf, { width: vfSize, height: vfSize }]}>
              <View style={[cam.corner, cam.tl]} />
              <View style={[cam.corner, cam.tr]} />
              <View style={[cam.corner, cam.bl]} />
              <View style={[cam.corner, cam.br]} />
            </View>
            <View style={cam.hint}>
              <ThemedText variant="bodySmall" style={cam.hintText}>
                Placez le code-barres dans le cadre
              </ThemedText>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Empty slot placeholder ────────────────────────────────────────────────────
function EmptySlot({
  label,
  onScan,
}: {
  label: string;
  onScan: () => void;
}) {
  return (
    <View style={slot.root}>
      <View style={slot.badge}>
        <ThemedText variant="labelSmall" color="textTertiary">{label}</ThemedText>
      </View>
      <View style={slot.iconCircle}>
        <Feather name="package" size={32} color={Colors.textTertiary} />
      </View>
      <ThemedText variant="bodyMedium" color="textTertiary" style={slot.hint}>
        Scannez un produit
      </ThemedText>
      <TouchableOpacity style={slot.scanBtn} onPress={onScan} activeOpacity={0.8}>
        <Feather name="camera" size={18} color="#fff" style={{ marginRight: 6 }} />
        <ThemedText variant="labelLarge" style={slot.scanBtnText}>Scanner</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

// ─── Loading slot ─────────────────────────────────────────────────────────────
function LoadingSlot({ label }: { label: string }) {
  return (
    <View style={slot.root}>
      <View style={slot.badge}>
        <ThemedText variant="labelSmall" color="textTertiary">{label}</ThemedText>
      </View>
      <ActivityIndicator size="large" color={Colors.accent} />
      <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: Spacing.md }}>
        Analyse en cours…
      </ThemedText>
    </View>
  );
}

// ─── Filled slot summary card (used in split view) ────────────────────────────
function FilledSlotCard({
  data,
  label,
  onRescan,
}: {
  data: SlotData;
  label: string;
  onRescan: () => void;
}) {
  const color = verdictColor(data.verdict.verdict);
  const bg = verdictBg(data.verdict.verdict);

  return (
    <View style={[filled.root, { backgroundColor: bg }]}>
      <View style={filled.topRow}>
        <View style={[filled.badge, { backgroundColor: Colors.accent }]}>
          <ThemedText variant="labelSmall" style={{ color: '#fff', textTransform: 'uppercase' }}>
            {label}
          </ThemedText>
        </View>
        <TouchableOpacity onPress={onRescan} style={filled.rescanBtn}>
          <Feather name="refresh-cw" size={14} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {data.product.imageUrl ? (
        <Image
          source={{ uri: data.product.imageUrl }}
          style={filled.productImage}
          contentFit="contain"
        />
      ) : (
        <View style={filled.productImagePlaceholder}>
          <Feather name="package" size={20} color={Colors.textTertiary} />
        </View>
      )}

      <GlowScoreCircle score={data.score} size="small" animated />

      <View style={[filled.verdictBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
        <ThemedText variant="labelSmall" style={{ color, textTransform: 'uppercase' }}>
          {verdictLabel(data.verdict.verdict)}
        </ThemedText>
      </View>

      <ThemedText variant="bodySmall" color="textPrimary" style={filled.productName} numberOfLines={2}>
        {data.product.name}
      </ThemedText>
      {data.product.brand ? (
        <ThemedText variant="bodySmall" color="textTertiary" numberOfLines={1}>
          {data.product.brand}
        </ThemedText>
      ) : null}
    </View>
  );
}

// ─── Ingredient comparison row ────────────────────────────────────────────────
function IngredientRows({
  matchesA,
  matchesB,
}: {
  matchesA: MatchResult[];
  matchesB: MatchResult[];
}) {
  const flaggedA = matchesA.filter((m) => m.riskLevel !== 'no_signal' && m.riskLevel !== 'safe');
  const flaggedB = matchesB.filter((m) => m.riskLevel !== 'no_signal' && m.riskLevel !== 'safe');

  if (flaggedA.length === 0 && flaggedB.length === 0) {
    return (
      <View style={ingr.emptyRow}>
        <Feather name="check-circle" size={18} color={Colors.safe} />
        <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginLeft: Spacing.sm }}>
          Aucun ingrédient signalé dans les deux produits
        </ThemedText>
      </View>
    );
  }

  const maxLen = Math.max(flaggedA.length, flaggedB.length);

  return (
    <View style={ingr.root}>
      {/* Header */}
      <View style={ingr.headerRow}>
        <ThemedText variant="labelSmall" color="textTertiary" style={ingr.cell}>
          PRODUIT A
        </ThemedText>
        <ThemedText variant="labelSmall" color="textTertiary" style={ingr.cell}>
          PRODUIT B
        </ThemedText>
      </View>
      {Array.from({ length: maxLen }).map((_, i) => {
        const mA = flaggedA[i];
        const mB = flaggedB[i];
        return (
          <View key={i} style={ingr.row}>
            {mA ? (
              <View style={[ingr.cell, ingr.ingredientCell, { borderColor: verdictColor(mA.riskLevel as VerdictKind) + '44' }]}>
                <View style={[ingr.dot, { backgroundColor: verdictColor(mA.riskLevel as VerdictKind) }]} />
                <ThemedText variant="bodySmall" color="textPrimary" style={{ flex: 1 }} numberOfLines={2}>
                  {mA.ingredientName}
                </ThemedText>
              </View>
            ) : (
              <View style={[ingr.cell, ingr.emptyCell]} />
            )}
            {mB ? (
              <View style={[ingr.cell, ingr.ingredientCell, { borderColor: verdictColor(mB.riskLevel as VerdictKind) + '44' }]}>
                <View style={[ingr.dot, { backgroundColor: verdictColor(mB.riskLevel as VerdictKind) }]} />
                <ThemedText variant="bodySmall" color="textPrimary" style={{ flex: 1 }} numberOfLines={2}>
                  {mB.ingredientName}
                </ThemedText>
              </View>
            ) : (
              <View style={[ingr.cell, ingr.emptyCell]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function CompareScreen() {
  const insets = useSafeAreaInsets();
  const { barcode: paramBarcode, slot: paramSlot } = useLocalSearchParams<{
    barcode?: string;
    slot?: string;
  }>();
  const { trimester: profileTrimester } = useProfile();
  const trimester = (profileTrimester ?? 2) as Trimester;

  const [slotA, setSlotA] = useState<SlotData | null>(null);
  const [slotB, setSlotB] = useState<SlotData | null>(null);
  const [loadingSlot, setLoadingSlot] = useState<'A' | 'B' | null>(null);
  const [scanningSlot, setScanningSlot] = useState<'A' | 'B' | null>(null);
  const [shareVisible, setShareVisible] = useState(false);

  const bothFilled = slotA !== null && slotB !== null;

  // ── Scan a barcode into a slot ─────────────────────────────────────────────
  const handleBarcodeScan = useCallback(
    async (barcode: string, slot: 'A' | 'B') => {
      setScanningSlot(null);
      setLoadingSlot(slot);
      try {
        const product = await fetchProductByBarcode(barcode);
        if (!product) throw new Error('Produit non trouvé');
        const matches = await matchIngredients(product.ingredientsList, trimester);
        const verdict = getVerdict(matches);
        const score = computeScore(verdict);
        const data: SlotData = { barcode, product, matches, verdict, score };
        if (slot === 'A') setSlotA(data);
        else setSlotB(data);
      } catch {
        // On error just leave slot empty
      } finally {
        setLoadingSlot(null);
      }
    },
    [trimester],
  );

  // ── Pre-populate from router params (coming from verdict screen) ───────────
  useEffect(() => {
    if (paramBarcode && paramSlot === 'A') {
      handleBarcodeScan(paramBarcode, 'A');
    } else if (paramBarcode && paramSlot === 'B') {
      handleBarcodeScan(paramBarcode, 'B');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCamera = useCallback((slot: 'A' | 'B') => {
    setScanningSlot(slot);
  }, []);

  const handleCameraClose = useCallback(() => setScanningSlot(null), []);

  const handleCameraScan = useCallback(
    (barcode: string) => {
      if (!scanningSlot) return;
      handleBarcodeScan(barcode, scanningSlot);
    },
    [scanningSlot, handleBarcodeScan],
  );

  const hasAnyDanger = bothFilled &&
    (slotA.verdict.verdict !== 'safe' || slotB.verdict.verdict !== 'safe');

  // ── Better slot for "voir alternatives" ───────────────────────────────────
  const worseSlot = bothFilled
    ? slotA.score <= slotB.score
      ? slotA
      : slotB
    : null;

  return (
    <View style={styles.root}>
      {/* ── Camera modal ── */}
      <CameraModal
        visible={scanningSlot !== null}
        onClose={handleCameraClose}
        onScan={handleCameraScan}
      />

      {/* ── Share modal ── */}
      {bothFilled && shareVisible && (
        <ShareBottomSheet
          visible={shareVisible}
          onClose={() => setShareVisible(false)}
          card={
            <CompareShareCard
              slotA={{
                productName: slotA.product.name,
                brand: slotA.product.brand,
                verdict: slotA.verdict.verdict,
                score: slotA.score,
              }}
              slotB={{
                productName: slotB.product.name,
                brand: slotB.product.brand,
                verdict: slotB.verdict.verdict,
                score: slotB.score,
              }}
            />
          }
        />
      )}

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: (Platform.OS === 'web' ? 20 : insets.top) + Spacing.sm }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="headlineMedium">Comparateur</ThemedText>
        {bothFilled && (
          <TouchableOpacity style={styles.shareIconBtn} onPress={() => setShareVisible(true)}>
            <Feather name="share-2" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Split columns ── */}
      <View style={styles.splitRow}>
        {loadingSlot === 'A' ? (
          <LoadingSlot label="Produit A" />
        ) : slotA ? (
          <Animated.View entering={FadeIn} style={styles.slotWrapper}>
            <FilledSlotCard data={slotA} label="Produit A" onRescan={() => openCamera('A')} />
          </Animated.View>
        ) : (
          <EmptySlot label="Produit A" onScan={() => openCamera('A')} />
        )}

        <View style={styles.vertDivider}>
          <View style={styles.vertLine} />
          <View style={styles.vsBadge}>
            <ThemedText variant="labelSmall" color="textTertiary">VS</ThemedText>
          </View>
          <View style={styles.vertLine} />
        </View>

        {loadingSlot === 'B' ? (
          <LoadingSlot label="Produit B" />
        ) : slotB ? (
          <Animated.View entering={FadeIn} style={styles.slotWrapper}>
            <FilledSlotCard data={slotB} label="Produit B" onRescan={() => openCamera('B')} />
          </Animated.View>
        ) : (
          <EmptySlot label="Produit B" onScan={() => openCamera('B')} />
        )}
      </View>

      {/* ── Comparison details ── */}
      {bothFilled && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + Spacing.huge },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Divider style={{ marginVertical: Spacing.lg }} />

            {/* ── Ingredients comparison ── */}
            <View style={styles.section}>
              <ThemedText variant="headlineMedium" style={styles.sectionTitle}>
                Ingrédients à risque
              </ThemedText>
              <IngredientRows matchesA={slotA.matches} matchesB={slotB.matches} />
            </View>

            <Divider style={{ marginVertical: Spacing.lg }} />

            {/* ── Notre avis ── */}
            <View style={styles.section}>
              <View style={styles.avisHeader}>
                <View style={styles.avisIconWrap}>
                  <Feather name="star" size={16} color={Colors.accent} />
                </View>
                <ThemedText variant="headlineMedium">Notre avis</ThemedText>
              </View>
              <Card style={styles.avisCard} padding={Spacing.lg}>
                <ThemedText variant="bodyMedium" color="textPrimary" style={{ lineHeight: 24 }}>
                  {buildAvis(slotA, slotB, trimester)}
                </ThemedText>
              </Card>
            </View>

            {/* ── CTAs ── */}
            <View style={styles.section}>
              {hasAnyDanger && worseSlot && (
                <Button
                  variant="primary"
                  fullWidth
                  onPress={() =>
                    router.push({
                      pathname: '/alternatives',
                      params: {
                        barcode: worseSlot.barcode,
                        category: 'cosmetic',
                        productName: worseSlot.product.name,
                        productBrand: worseSlot.product.brand ?? '',
                      },
                    } as never)
                  }
                >
                  Voir des alternatives →
                </Button>
              )}
              <View style={{ height: Spacing.sm }} />
              <Button variant="secondary" fullWidth onPress={() => setShareVisible(true)}>
                Partager la comparaison
              </Button>
            </View>
          </Animated.View>
        </ScrollView>
      )}

      {/* ── Empty state hint ── */}
      {!bothFilled && !loadingSlot && (
        <View style={styles.hint}>
          <Feather name="info" size={14} color={Colors.textTertiary} />
          <ThemedText variant="bodySmall" color="textTertiary" style={{ marginLeft: Spacing.xs, flex: 1 }}>
            Scannez deux produits pour comparer leur sécurité côte à côte
          </ThemedText>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    ...Shadows.soft,
  },
  shareIconBtn: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    ...Shadows.soft,
  },
  splitRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 0,
    height: 320,
  },
  slotWrapper: {
    flex: 1,
  },
  vertDivider: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  vertLine: {
    flex: 1,
    width: 1,
    backgroundColor: Colors.border,
  },
  vsBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  avisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avisIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentLight + '55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avisCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    ...Shadows.soft,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
});

// ─── Slot styles ──────────────────────────────────────────────────────────────
const slot = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.sm,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  hint: {
    textAlign: 'center',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    ...Shadows.soft,
  },
  scanBtnText: {
    color: '#fff',
  },
});

// ─── Filled slot styles ───────────────────────────────────────────────────────
const filled = StyleSheet.create({
  root: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    margin: Spacing.xs,
    ...Shadows.soft,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  rescanBtn: {
    padding: 4,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: Radius.sm,
  },
  productImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: Radius.sm,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdictBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  productName: {
    textAlign: 'center',
    lineHeight: 18,
  },
});

// ─── Ingredient comparison styles ─────────────────────────────────────────────
const ingr = StyleSheet.create({
  root: { gap: Spacing.sm },
  headerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cell: {
    flex: 1,
  },
  ingredientCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
  },
  emptyCell: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.sm,
    height: 36,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.safeBg,
    borderRadius: Radius.md,
  },
});

// ─── Camera styles ────────────────────────────────────────────────────────────
const cam = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
  },
  noPermission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vf: {
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#fff',
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  hint: {
    position: 'absolute',
    bottom: -40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
