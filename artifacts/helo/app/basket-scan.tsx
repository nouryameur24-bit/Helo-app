// ─── Mode Mon Panier — Scan continu ──────────────────────────────────────────
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInUp,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { fetchProductByBarcode, matchIngredients, getVerdict } from '@/lib/productLookup';
import { getBreastfeedingMode } from '@/hooks/useBreastfeeding';
import type { Phase } from '@/types';
import { saveBasket, verdictLabel, type BasketItem } from '@/lib/basket';
import { useProfile } from '@/hooks/useProfile';
import type { Verdict } from '@/types';

import { FeatureDiscoverySheet } from '@/components/ui/FeatureDiscoverySheet';
import { useFeatureDiscovery } from "@/hooks/useFeatureDiscovery";
  

const { width: W, height: H } = Dimensions.get('window');
const VF_W = Math.min(W * 0.75, 300);
const VF_H = VF_W;
const ANTI_SPAM_MS = 2000;
const OVERLAY_DURATION_MS = 1500;

const VERDICT_COLORS: Record<Verdict, string> = {
  safe: Colors.safe,
  caution: Colors.caution,
  danger: Colors.danger,
};

const VERDICT_ICONS: Record<Verdict, keyof typeof Feather.glyphMap> = {
  safe: 'check-circle',
  caution: 'alert-triangle',
  danger: 'x-circle',
};

interface OverlayInfo {
  name: string;
  verdict: Verdict;
}

export default function BasketScanScreen() {
  const __discovery_basket = useFeatureDiscovery('basket');
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { trimester } = useProfile();

  const [items, setItems] = useState<BasketItem[]>([]);
  const [overlay, setOverlay] = useState<OverlayInfo | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const lastBarcodes = useRef<Map<string, number>>(new Map());
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashColor = useSharedValue(0);

  // ── Flash overlay animation ───────────────────────────────────────────────
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashColor.value * 0.18,
  }));

  // ── Handle barcode detection ──────────────────────────────────────────────
  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (!data) return;

      const now = Date.now();
      const lastSeen = lastBarcodes.current.get(data);
      if (lastSeen && now - lastSeen < ANTI_SPAM_MS) return;
      lastBarcodes.current.set(data, now);

      setIsLookingUp(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      flashColor.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 400 }),
      );

      try {
        const product = await fetchProductByBarcode(data);
        const name = product?.name ?? data;
        const brand = product?.brand ?? '';
        const isBF = await getBreastfeedingMode().catch(() => false);
        const phase: Phase = isBF ? 'breastfeeding' : ((trimester as 1 | 2 | 3 | null) ?? 2);

        const rawIngredients = product?.ingredientsList ?? [];
        const matches = rawIngredients.length > 0
          ? await matchIngredients(rawIngredients, phase)
          : [];
        const verdictResult = getVerdict(matches);
        const verdict = verdictResult.verdict;

        const scanId = encodeURIComponent(data);
        const item: BasketItem = {
          barcode: data,
          name,
          brand,
          verdict,
          verdictLabel: verdictLabel(verdict),
          scanId,
          scannedAt: Date.now(),
        };

        setItems((prev) => {
          const exists = prev.some((i) => i.barcode === data);
          return exists ? prev : [...prev, item];
        });

        // Show overlay
        if (overlayTimer.current) clearTimeout(overlayTimer.current);
        setOverlay({ name, verdict });
        overlayTimer.current = setTimeout(() => setOverlay(null), OVERLAY_DURATION_MS);
      } catch {
        // silent
      } finally {
        setIsLookingUp(false);
      }
    },
    [trimester, flashColor],
  );

  // ── Finish — save basket & navigate ──────────────────────────────────────
  const handleFinish = useCallback(async () => {
    if (items.length === 0) return;
    await saveBasket(items);
    router.replace('/basket-results');
  }, [items]);

  // ── Permission not granted ────────────────────────────────────────────────
  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + Spacing.xxxl }]}>
        <View style={styles.permCenter}>
          <Feather name="camera" size={48} color={Colors.accent} />
          <ThemedText variant="headlineMedium" style={styles.permTitle}>
            Accès à la caméra requis
          </ThemedText>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <ThemedText style={styles.permBtnText}>Autoriser</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const safeCount = items.filter((i) => i.verdict === 'safe').length;
  const cautionCount = items.filter((i) => i.verdict === 'caution').length;
  const dangerCount = items.filter((i) => i.verdict === 'danger').length;

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
      />

      {/* Flash overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.flashOverlay, flashStyle]} />

      {/* Dark vignette around viewfinder */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.vignetteTop} />
        <View style={styles.vignetteMiddle}>
          <View style={styles.vignetteLeft} />
          <View style={styles.viewfinder}>
            {/* Corners */}
            {[
              { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
              { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
              { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
              { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
            ].map((s, i) => (
              <View key={i} style={[styles.corner, s, { borderColor: Colors.accent }]} />
            ))}
          </View>
          <View style={styles.vignetteRight} />
        </View>
        <View style={styles.vignetteBottom} />
      </View>

      {/* Header */}
      <Animated.View
        entering={FadeInUp.duration(300)}
        style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
      >
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Feather name="x" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerTitle}>Mon Panier</ThemedText>
          {items.length > 0 && (
            <View style={styles.counterRow}>
              <View style={[styles.dot, { backgroundColor: Colors.safe }]} />
              <ThemedText style={styles.counterText}>{safeCount}</ThemedText>
              {cautionCount > 0 && <>
                <View style={[styles.dot, { backgroundColor: Colors.caution }]} />
                <ThemedText style={styles.counterText}>{cautionCount}</ThemedText>
              </>}
              {dangerCount > 0 && <>
                <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
                <ThemedText style={styles.counterText}>{dangerCount}</ThemedText>
              </>}
              <ThemedText style={styles.counterLabel}>
                · {items.length} produit{items.length > 1 ? 's' : ''}
              </ThemedText>
            </View>
          )}
        </View>

        {isLookingUp ? (
          <ActivityIndicator color="#FFFFFF" style={{ width: 36 }} />
        ) : (
          <View style={{ width: 36 }} />
        )}
      </Animated.View>

      {/* Hint */}
      <View style={styles.hintContainer} pointerEvents="none">
        <ThemedText style={styles.hintText}>
          Pointe sur un code-barres
        </ThemedText>
      </View>

      {/* Scan result overlay */}
      {overlay && (
        <Animated.View
          entering={SlideInUp.duration(200)}
          exiting={SlideOutDown.duration(300)}
          style={styles.overlayCard}
        >
          <View style={[styles.overlayDot, { backgroundColor: VERDICT_COLORS[overlay.verdict] }]}>
            <Feather
              name={VERDICT_ICONS[overlay.verdict]}
              size={16}
              color="#FFFFFF"
            />
          </View>
          <ThemedText style={styles.overlayName} numberOfLines={1}>
            {overlay.name}
          </ThemedText>
          <View style={[styles.overlayBadge, { backgroundColor: VERDICT_COLORS[overlay.verdict] + '33' }]}>
            <ThemedText style={[styles.overlayBadgeText, { color: VERDICT_COLORS[overlay.verdict] }]}>
              {verdictLabel(overlay.verdict)}
            </ThemedText>
          </View>
        </Animated.View>
      )}

      {/* Bottom — Terminer button */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {items.length > 0 ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <TouchableOpacity
              style={styles.finishBtn}
              onPress={handleFinish}
              activeOpacity={0.85}
            >
              <Feather name="shopping-bag" size={18} color={Colors.textPrimary} />
              <ThemedText style={styles.finishBtnText}>
                Terminer · {items.length} produit{items.length > 1 ? 's' : ''}
              </ThemedText>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <ThemedText style={styles.startHint}>
            Scanne ton premier produit pour commencer
          </ThemedText>
        )}
      </View>
    <FeatureDiscoverySheet {...__discovery_basket.sheetProps} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const VIGNETTE = 'rgba(0,0,0,0.58)';
const VF_TOP_Y = H * 0.3;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  flashOverlay: { backgroundColor: Colors.accent },

  // Vignette
  vignetteTop: { height: VF_TOP_Y, backgroundColor: VIGNETTE },
  vignetteMiddle: { flexDirection: 'row', height: VF_H },
  vignetteLeft: { flex: 1, backgroundColor: VIGNETTE },
  vignetteRight: { flex: 1, backgroundColor: VIGNETTE },
  vignetteBottom: { flex: 1, backgroundColor: VIGNETTE },
  viewfinder: {
    width: VF_W,
    height: VF_H,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: Colors.accent,
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  counterLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  // Hint
  hintContainer: {
    position: 'absolute',
    top: VF_TOP_Y + VF_H + Spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  // Overlay card
  overlayCard: {
    position: 'absolute',
    bottom: 140,
    left: Spacing.xl,
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.elevated,
  },
  overlayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  overlayName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  overlayBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    flexShrink: 0,
  },
  overlayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // Bottom
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.lg,
    ...Shadows.elevated,
  },
  finishBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  startHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  // Permission
  permCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  permTitle: { color: Colors.textPrimary, textAlign: 'center', marginTop: Spacing.xl, marginBottom: Spacing.xxxl },
  permBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.lg,
  },
  permBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.surface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});
