import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROUTES } from '@/types/routes';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { isFeatureEnabled } from '@/constants/featureFlags';
import { ComingSoonScreen } from '@/components/ComingSoonScreen';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import ViewShot from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
import type { ProductData, VerdictResult } from '@/types';

import Halo from '@/components/ar-mirror/Halo';
import QuickScanResult from '@/components/ar-mirror/QuickScanResult';
import styles from '@/components/ar-mirror/arMirrorStyles';

import { FeatureDiscoverySheet } from '@/components/ui/FeatureDiscoverySheet';
import { useFeatureDiscovery } from "@/hooks/useFeatureDiscovery";
  
import { STORAGE_KEYS } from '@/lib/storageKeys';
import {
  BARCODE_TYPES,
  FADE_START_MS,
  LOOKUP_DEBOUNCE_MS,
  REMOVE_MS,
  SW,
  SH,
  VERDICT_COLOR,
  VERDICT_LABEL_FR,
  normaliseBounds,
  type CachedLookup,
  type RenderItem,
  type TrackedBarcode,
  type VerdictShort,
} from '@/components/ar-mirror/arMirrorTypes';

export default function ARMirrorScreen() {
  if (!isFeatureEnabled('arMirror')) {
    return (
      <ComingSoonScreen
        title="AR Mirror"
        subtitle="Disponible en v1.2"
        emoji="✨"
        description="Visualise ton baby bump semaine après semaine en réalité augmentée. On y travaille."
      />
    );
  }
  const __discovery_ar_mirror = useFeatureDiscovery('ar_mirror');
  const insets = useSafeAreaInsets();
  const { isPremium } = usePremium();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [sharingAvailable, setSharingAvailable] = useState(false);

  const cameraLayout = useRef({ w: SW, h: SH });
  const viewShotRef = useRef<ViewShot>(null);
  const cameraRef = useRef<CameraView>(null);

  const cacheRef = useRef<Map<string, CachedLookup>>(new Map());
  const lookupDebouncedRef = useRef<Set<string>>(new Set());
  const trackedRef = useRef<Map<string, TrackedBarcode>>(new Map());

  const [renderItems, setRenderItems] = useState<RenderItem[]>([]);
  const [capturedURI, setCapturedURI] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [quickResult, setQuickResult] = useState<{ lookup: CachedLookup | null; barcode: string } | null>(null);
  const lastQuickScan = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.offlineCache);
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
          entries: Record<string, { barcode: string; product: ProductData; verdict: VerdictResult }>;
        };
        const map = new Map<string, CachedLookup>();
        for (const [barcode, entry] of Object.entries(parsed.entries ?? {})) {
          const v = entry.verdict?.verdict;
          if (v === 'safe' || v === 'caution' || v === 'danger') {
            map.set(barcode, { verdict: v, name: entry.product?.name ?? barcode, brand: entry.product?.brand ?? '' });
          }
        }
        cacheRef.current = map;
      } catch {
        // Cache load failure — AR overlay continues without history data
      }
    })();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const items: RenderItem[] = [];
      for (const [barcode, tracked] of trackedRef.current.entries()) {
        const age = now - tracked.lastSeen;
        if (age >= REMOVE_MS) { trackedRef.current.delete(barcode); continue; }
        const opacity = age < FADE_START_MS ? 1 : 1 - (age - FADE_START_MS) / (REMOVE_MS - FADE_START_MS);
        items.push({ ...tracked, opacity });
      }
      setRenderItems(items);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const handleBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    if (quickMode) return;
    const { data: barcode } = result;
    if (!barcode) return;
    const norm = normaliseBounds(result, cameraLayout.current.w, cameraLayout.current.h);
    if (!norm) return;
    const now = Date.now();
    const existing = trackedRef.current.get(barcode);
    const lookup = cacheRef.current.get(barcode) ?? null;
    trackedRef.current.set(barcode, { barcode, ...norm, lookup, lastSeen: now });
    if (!lookup && !lookupDebouncedRef.current.has(barcode)) {
      lookupDebouncedRef.current.add(barcode);
      setTimeout(() => lookupDebouncedRef.current.delete(barcode), LOOKUP_DEBOUNCE_MS);
    }
    if (!existing) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [quickMode]);

  const handleQuickScan = useCallback((result: BarcodeScanningResult) => {
    if (!quickMode) return;
    const { data: barcode } = result;
    if (!barcode || barcode === lastQuickScan.current) return;
    lastQuickScan.current = barcode;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setQuickResult({ lookup: cacheRef.current.get(barcode) ?? null, barcode });
    setTimeout(() => { lastQuickScan.current = null; }, 2500);
  }, [quickMode]);

  useEffect(() => { Sharing.isAvailableAsync().then(setSharingAvailable); }, []);

  const handleCapture = useCallback(async () => {
    if (capturing) return;
    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const uri = await viewShotRef.current?.capture?.();
      if (uri) {
        setCapturedURI(uri);
        setTimeout(() => setCapturedURI(null), 2000);
        if (sharingAvailable) {
          await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Partager mon Miroir AR — Hēlo' });
        }
      }
    } catch {
      // Screenshot or share sheet failure — user can retry via the button
    }
    setCapturing(false);
  }, [capturing, sharingAvailable]);

  const safeCount = renderItems.filter((i) => i.lookup?.verdict === 'safe').length;
  const cautionCount = renderItems.filter((i) => i.lookup?.verdict === 'caution').length;
  const dangerCount = renderItems.filter((i) => i.lookup?.verdict === 'danger').length;

  if (!isPremium) {
    return (
      <View style={[styles.root, styles.rootGate]}>
        <StatusBar style="light" />
        <View style={[styles.gateContainer, { paddingTop: insets.top + 20 }]}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + Spacing.sm }]}>
            <Feather name="x" size={20} color="white" />
          </Pressable>
          <View style={styles.gateDemoRow}>
            {(['safe', 'caution', 'danger'] as VerdictShort[]).map((v) => (
              <View key={v} style={[styles.gateDemo, { borderColor: VERDICT_COLOR[v] + '99', backgroundColor: VERDICT_COLOR[v] + '22' }]}>
                <Feather
                  name={v === 'safe' ? 'check' : v === 'caution' ? 'alert-triangle' : 'x'}
                  size={26}
                  color={VERDICT_COLOR[v]}
                />
              </View>
            ))}
          </View>
          <ThemedText style={styles.gateTitle}>Mode Miroir AR</ThemedText>
          <ThemedText style={styles.gateSubtitle}>
            Entourez vos produits d'un halo coloré en temps réel.{'\n'}Scannez toute votre étagère en une seconde.
          </ThemedText>
          <View style={styles.gateFeatures}>
            {['🟢  Halo vert — produit sûr', '🟡  Halo ambre — vigilance', '🔴  Halo rouge — à éviter', '📸  Capture AR pour TikTok / Insta'].map((f) => (
              <ThemedText key={f} style={styles.gateFeatureItem}>{f}</ThemedText>
            ))}
          </View>
          <Pressable
            onPress={() => router.replace(ROUTES.premium)}
            style={({ pressed }) => [styles.gatePremiumBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="star" size={16} color="#1A1A1A" />
            <ThemedText style={styles.gatePremiumText}>Débloquer — Premium</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!cameraPermission) return <View style={styles.root} />;
  if (!cameraPermission.granted) {
    return (
      <View style={[styles.root, styles.permCenter]}>
        <StatusBar style="light" />
        <Feather name="camera-off" size={48} color="white" style={styles.permIcon} />
        <ThemedText style={styles.permText}>Caméra requise pour le Mode Miroir</ThemedText>
        <TouchableOpacity onPress={requestCameraPermission} style={styles.permBtn}>
          <ThemedText style={styles.permBtnText}>Autoriser la caméra</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.permBackBtn}>
          <ThemedText style={styles.permBackText}>Retour</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ViewShot ref={viewShotRef} style={StyleSheet.absoluteFill} options={{ format: 'jpg', quality: 0.92 }}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onLayout={(e) => { cameraLayout.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}
          onBarcodeScanned={quickMode ? handleQuickScan : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        />
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {renderItems.map((item) => <Halo key={item.barcode} item={item} />)}
        </View>
        {capturedURI && (
          <Animated.View entering={FadeIn.duration(100)} exiting={FadeOut.duration(600)} style={styles.capturedFlash} />
        )}
      </ViewShot>

      <View style={[styles.topHud, { paddingTop: insets.top + Spacing.sm }]} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.hudBackBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Feather name="arrow-left" size={18} color="white" />
        </Pressable>
        <View style={styles.counterBubble}>
          <View style={styles.counterDot} />
          <ThemedText style={styles.counterText}>
            {renderItems.length === 0
              ? quickMode ? 'Mode rapide — pointez un produit' : 'Pointez votre étagère'
              : `${renderItems.length} produit${renderItems.length > 1 ? 's' : ''} détecté${renderItems.length > 1 ? 's' : ''}`}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => { setQuickMode((m) => !m); trackedRef.current.clear(); setRenderItems([]); setQuickResult(null); }}
          style={({ pressed }) => [styles.modeToggleBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name={quickMode ? 'eye' : 'zap'} size={16} color="white" />
        </Pressable>
      </View>

      {quickMode && quickResult && (
        <QuickScanResult
          key={quickResult.barcode}
          lookup={quickResult.lookup}
          barcode={quickResult.barcode}
          onDismiss={() => setQuickResult(null)}
        />
      )}

      {!quickMode && renderItems.length > 0 && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.scoreBanner} pointerEvents="none">
          {dangerCount > 0 && (
            <View style={[styles.scoreChip, { backgroundColor: VERDICT_COLOR.danger + '22', borderColor: VERDICT_COLOR.danger + '88' }]}>
              <ThemedText style={[styles.scoreChipText, { color: VERDICT_COLOR.danger }]}>{dangerCount} ✕</ThemedText>
            </View>
          )}
          {cautionCount > 0 && (
            <View style={[styles.scoreChip, { backgroundColor: VERDICT_COLOR.caution + '22', borderColor: VERDICT_COLOR.caution + '88' }]}>
              <ThemedText style={[styles.scoreChipText, { color: VERDICT_COLOR.caution }]}>{cautionCount} ⚠</ThemedText>
            </View>
          )}
          {safeCount > 0 && (
            <View style={[styles.scoreChip, { backgroundColor: VERDICT_COLOR.safe + '22', borderColor: VERDICT_COLOR.safe + '88' }]}>
              <ThemedText style={[styles.scoreChipText, { color: VERDICT_COLOR.safe }]}>{safeCount} ✓</ThemedText>
            </View>
          )}
        </Animated.View>
      )}

      {quickMode && (
        <View style={styles.quickModeHint} pointerEvents="none">
          <Feather name="zap" size={11} color={Colors.accent} />
          <ThemedText style={styles.quickModeText}>Mode rapide — 1 produit à la fois</ThemedText>
        </View>
      )}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.legend}>
          {(['safe', 'caution', 'danger'] as VerdictShort[]).map((v) => (
            <View key={v} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: VERDICT_COLOR[v] }]} />
              <ThemedText style={styles.legendText}>{VERDICT_LABEL_FR[v]}</ThemedText>
            </View>
          ))}
        </View>
        <Pressable
          onPress={handleCapture}
          disabled={capturing}
          style={({ pressed }) => [styles.captureBtn, { opacity: pressed || capturing ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Capturer"
        >
          <View style={styles.captureBtnInner}>
            <Feather name="camera" size={22} color={Colors.textPrimary} />
          </View>
        </Pressable>
      </View>
    <FeatureDiscoverySheet {...__discovery_ar_mirror.sheetProps} />
    </View>
  );
}
