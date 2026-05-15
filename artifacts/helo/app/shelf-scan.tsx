// ─── Scan d'Étagère — Capture photo multi-produits ───────────────────────────
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
import { scanShelf } from '@/lib/visionScan';
import type { ShelfDetectedProduct } from '@/lib/visionScan';

import { FeatureDiscoverySheet } from '@/components/ui/FeatureDiscoverySheet';
import { useFeatureDiscovery } from "@/hooks/useFeatureDiscovery";
  

const { width: W, height: H } = Dimensions.get('window');

const VF_W = W - Spacing.xxl * 2;
const VF_H = VF_W * (9 / 16);

export default function ShelfScanScreen() {
  const __discovery_shelf = useFeatureDiscovery('shelf');
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { requirePremium, isPremium, isLoading } = usePremium();
  const cameraRef = useRef<CameraView>(null);

  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0, { duration: 1200 }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const cornerStyle = useAnimatedStyle(() => ({
    borderColor: Colors.accentLight,
    opacity: 0.6 + pulse.value * 0.4,
  }));

  // ── Premium gate ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (!isPremium) {
      requirePremium('shelf_scan');
      router.back();
    }
  }, [isPremium, isLoading, requirePremium]);

  // ── Capture & analyze ─────────────────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    if (capturing || analyzing || !cameraRef.current) return;
    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });
      if (!photo?.base64) {
        throw new Error('Impossible de capturer la photo.');
      }

      setCapturing(false);
      setAnalyzing(true);

      const products: ShelfDetectedProduct[] = await scanShelf(photo.base64);

      if (products.length === 0) {
        setAnalyzing(false);
        router.replace({
          pathname: '/shelf-results',
          params: {
            products: JSON.stringify([]),
            photoBase64: encodeURIComponent(photo.base64),
          },
        } as never);
        return;
      }

      router.replace({
        pathname: '/shelf-results',
        params: {
          products: JSON.stringify(products),
          photoBase64: encodeURIComponent(photo.base64),
        },
      } as never);
    } catch (err: unknown) {
      setCapturing(false);
      setAnalyzing(false);
      const msg = err instanceof Error ? err.message : "Erreur lors de l'analyse.";
      router.replace({
        pathname: '/shelf-results',
        params: {
          products: JSON.stringify([]),
          error: msg,
        },
      } as never);
    }
  }, [capturing, analyzing]);

  // ── Loader while analyzing ────────────────────────────────────────────────
  if (analyzing) {
    return (
      <View style={[styles.root, styles.loaderRoot]}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <ThemedText variant="headlineMedium" style={styles.loaderTitle}>
          Analyse en cours…
        </ThemedText>
        <ThemedText variant="bodyMedium" color="textSecondary" style={styles.loaderSub}>
          Claude identifie tous les produits de votre étagère
        </ThemedText>
      </View>
    );
  }

  // ── Permission not granted ────────────────────────────────────────────────
  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.permRoot, { paddingTop: insets.top + Spacing.xxxl }]}>
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

  const VF_TOP = (H - VF_H) / 2 - 40;

  return (
    <View style={styles.root}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      {/* Dark vignette */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.vTop, { height: VF_TOP }]} />
        <View style={{ flexDirection: 'row', height: VF_H }}>
          <View style={styles.vSide} />
          {/* Viewfinder */}
          <View style={{ width: VF_W }}>
            {/* Animated corner brackets */}
            {[
              { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
              { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
              { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
              { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
            ].map((s, i) => (
              <Animated.View key={i} style={[styles.corner, s, cornerStyle]} />
            ))}
          </View>
          <View style={styles.vSide} />
        </View>
        <View style={styles.vBottom} />
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
          <ThemedText style={styles.headerTitle}>Scanner une étagère</ThemedText>
          {!isPremium && (
            <View style={styles.premiumBadge}>
              <Feather name="star" size={10} color={Colors.accentDark} />
              <ThemedText style={styles.premiumBadgeText}>PREMIUM</ThemedText>
            </View>
          )}
        </View>
        <View style={{ width: 44 }} />
      </Animated.View>

      {/* Guide text */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(300)}
        style={[styles.guideContainer, { top: VF_TOP + VF_H + Spacing.xl }]}
        pointerEvents="none"
      >
        <Feather name="layers" size={16} color="rgba(255,255,255,0.8)" />
        <ThemedText style={styles.guideText}>
          Photographiez votre étagère
        </ThemedText>
      </Animated.View>

      {/* Capture button */}
      <Animated.View
        entering={FadeInDown.delay(300).duration(300)}
        style={[styles.captureArea, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <TouchableOpacity
          style={[styles.captureBtn, capturing && styles.captureBtnActive]}
          onPress={handleCapture}
          activeOpacity={0.85}
          disabled={capturing}
        >
          {capturing ? (
            <ActivityIndicator color={Colors.accentDark} />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>
      </Animated.View>
    <FeatureDiscoverySheet {...__discovery_shelf.sheetProps} />
    </View>
  );
}

const VIGNETTE = 'rgba(0,0,0,0.62)';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  loaderRoot: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
  },
  loaderTitle: { textAlign: 'center' },
  loaderSub: { textAlign: 'center' },

  permRoot: { backgroundColor: Colors.background },
  permCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
    gap: Spacing.xl,
  },
  permTitle: {
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  permBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.lg,
  },
  permBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  vTop: { backgroundColor: VIGNETTE, width: '100%' },
  vSide: { flex: 1, backgroundColor: VIGNETTE },
  vBottom: { flex: 1, backgroundColor: VIGNETTE },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
  },

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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.accentDark,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.5,
  },

  guideContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  guideText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  captureArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 4,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.elevated,
  },
  captureBtnActive: {
    backgroundColor: Colors.accentLight,
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.accent,
  },
});
