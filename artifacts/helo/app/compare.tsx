// ─── Comparateur de produits ──────────────────────────────────────────────────
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { CompareShareCard } from '@/components/share/CompareShareCard';
import { ShareBottomSheet } from '@/components/share/ShareBottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { logError } from '@/lib/logger';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import {
  fetchProductByBarcode,
  getVerdict,
  matchIngredients,
} from '@/lib/productLookup';
import type { Trimester } from '@/types';

import { CameraModal } from '@/components/compare/CameraModal';
import { EmptySlot, LoadingSlot } from '@/components/compare/SlotViews';
import { FilledSlotCard } from '@/components/compare/FilledSlotCard';
import { IngredientRows } from '@/components/compare/IngredientRows';
import { buildAvis, computeScore, type SlotData } from '@/components/compare/compareHelpers';

// ─── Main screen ──────────────────────────────────────────────────────────────
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
      } catch (err) {
        // Leave slot empty on error
        logError('compare.loadSlot', err, { barcode, slot });
      } finally {
        setLoadingSlot(null);
      }
    },
    [trimester],
  );

  useEffect(() => {
    if (paramBarcode && paramSlot === 'A') {
      handleBarcodeScan(paramBarcode, 'A');
    } else if (paramBarcode && paramSlot === 'B') {
      handleBarcodeScan(paramBarcode, 'B');
    }
    // Runs once on mount to pre-load barcode from navigation params
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const worseSlot = bothFilled
    ? slotA.score <= slotB.score ? slotA : slotB
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

            <View style={styles.section}>
              <ThemedText variant="headlineMedium" style={styles.sectionTitle}>
                Ingrédients à risque
              </ThemedText>
              <IngredientRows matchesA={slotA.matches} matchesB={slotB.matches} />
            </View>

            <Divider style={{ marginVertical: Spacing.lg }} />

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
