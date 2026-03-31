// ─── Mode Miroir AR — Hēlo ──────────────────────────────────────────────────
//
// Réalité augmentée : détection de codes-barres en temps réel +
// overlay coloré (halo vert/ambre/rouge) positionné sur chaque produit.
//
// Architecture:
//  - trackedRef (Map) : mis à jour directement dans onBarcodeScanned (zéro re-render)
//  - renderState : synchronisé depuis trackedRef toutes les 150ms
//  - Halo : composant isolé avec sa propre animation Reanimated (pulse doux)
//  - Cache : @helo_offline_cache → lookup instantané sans réseau

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import ViewShot from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
import type { VerdictResult, ProductData } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const SCREEN = Dimensions.get('screen');
const SW = SCREEN.width;
const SH = SCREEN.height;

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

/** Keep a halo alive for 2s after last detection. */
const FADE_START_MS = 1200;
const REMOVE_MS = 2200;

/** Don't add same barcode to lookup queue more than once per N ms */
const LOOKUP_DEBOUNCE_MS = 3000;

// ─── Types ────────────────────────────────────────────────────────────────────

type VerdictShort = 'safe' | 'caution' | 'danger';

interface CachedLookup {
  verdict: VerdictShort;
  name: string;
  brand: string;
}

interface TrackedBarcode {
  barcode: string;
  x: number;
  y: number;
  w: number;
  h: number;
  lookup: CachedLookup | null; // null = not yet found / not in cache
  lastSeen: number;
}

interface RenderItem extends TrackedBarcode {
  opacity: number;
}

// ─── Verdict colours ──────────────────────────────────────────────────────────

const VERDICT_COLOR: Record<VerdictShort, string> = {
  safe: '#7CB69F',
  caution: '#C9A96E',
  danger: '#C27B7B',
};
const VERDICT_EMOJI: Record<VerdictShort, string> = {
  safe: '✓',
  caution: '⚠',
  danger: '✕',
};
const VERDICT_LABEL_FR: Record<VerdictShort, string> = {
  safe: 'Sûr',
  caution: 'Vigilance',
  danger: 'Déconseillé',
};

// ─── Coordinate normalisation ─────────────────────────────────────────────────
//
// expo-camera returns bounds in the camera-image coordinate system.
// On iOS (recent): values appear to be normalized [0, 1].
// On Android: values can be in camera-sensor pixel units (e.g. 0–1920).
// Strategy: if any coordinate > 2, assume pixel units and scale to screen.

function normaliseBounds(
  result: BarcodeScanningResult,
  cameraW: number,
  cameraH: number,
): { x: number; y: number; w: number; h: number } | null {
  const b = result.bounds;
  if (!b) return null;

  const ox = b.origin.x;
  const oy = b.origin.y;
  const bw = b.size.width;
  const bh = b.size.height;

  // Detect if coords look normalised (≤ 1.5) or pixel-space (>> 2)
  const isNormalised = ox <= 1.5 && oy <= 1.5 && bw <= 1.5 && bh <= 1.5;

  if (isNormalised) {
    return { x: ox * cameraW, y: oy * cameraH, w: bw * cameraW, h: bh * cameraH };
  }

  // Pixel-space: scale by ratio of screen to camera image
  // Heuristic: assume camera image is landscape 1920×1080 mapped to portrait
  const refW = ox + bw > cameraW ? ox + bw : cameraW;
  const refH = oy + bh > cameraH ? oy + bh : cameraH;
  const sx = cameraW / refW;
  const sy = cameraH / refH;
  return { x: ox * sx, y: oy * sy, w: bw * sx, h: bh * sy };
}

// ─── Halo component ───────────────────────────────────────────────────────────

interface HaloProps {
  item: RenderItem;
}

function Halo({ item }: HaloProps) {
  const color = item.lookup ? VERDICT_COLOR[item.lookup.verdict] : Colors.textTertiary;
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 900 }),
        withTiming(1.0, { duration: 900 }),
      ),
      -1,
      false,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: item.opacity,
  }));

  // Clamp halo size: minimum 60px, max 150px
  const haloSize = Math.max(70, Math.min(150, Math.max(item.w, item.h) + 28));
  const halfHalo = haloSize / 2;

  const labelText = item.lookup
    ? `${item.lookup.name.slice(0, 24)} ${VERDICT_EMOJI[item.lookup.verdict]}`
    : null;

  return (
    <Animated.View
      style={[
        styles.haloContainer,
        {
          left: item.x + item.w / 2 - halfHalo,
          top: item.y + item.h / 2 - halfHalo,
          width: haloSize,
          height: haloSize,
          opacity: item.opacity,
        },
      ]}
      pointerEvents="none"
    >
      {/* Outer ripple */}
      <Animated.View
        style={[
          styles.haloOuter,
          {
            borderColor: color,
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
          },
          pulseStyle,
        ]}
      />
      {/* Inner fill */}
      <View
        style={[
          styles.haloInner,
          {
            backgroundColor: color + '33',
            borderColor: color + 'CC',
            width: haloSize * 0.72,
            height: haloSize * 0.72,
            borderRadius: (haloSize * 0.72) / 2,
          },
        ]}
      />
      {/* Dot centre */}
      <View style={[styles.haloDot, { backgroundColor: color }]} />

      {/* Floating label */}
      {labelText && (
        <View style={[styles.haloLabel, { borderColor: color + '99', backgroundColor: '#1A1A1A' + 'EE' }]}>
          <ThemedText style={[styles.haloLabelText, { color }]} numberOfLines={1}>
            {labelText}
          </ThemedText>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Quick Scan (fallback mode) ───────────────────────────────────────────────

interface QuickScanResultProps {
  lookup: CachedLookup | null;
  barcode: string;
  onDismiss: () => void;
}

function QuickScanResult({ lookup, barcode, onDismiss }: QuickScanResultProps) {
  const color = lookup ? VERDICT_COLOR[lookup.verdict] : Colors.textTertiary;
  const label = lookup ? VERDICT_LABEL_FR[lookup.verdict] : 'Non scanné';
  const emoji = lookup ? VERDICT_EMOJI[lookup.verdict] : '?';

  useEffect(() => {
    const t = setTimeout(onDismiss, 2500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(300)} style={styles.quickResult}>
      <View style={[styles.quickEmoji, { backgroundColor: color + '33', borderColor: color }]}>
        <ThemedText style={[styles.quickEmojiText, { color }]}>{emoji}</ThemedText>
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.quickName} numberOfLines={1}>
          {lookup?.name ?? barcode}
        </ThemedText>
        {lookup?.brand ? (
          <ThemedText style={[styles.quickLabel, { color }]}>{label} · {lookup.brand}</ThemedText>
        ) : (
          <ThemedText style={[styles.quickLabel, { color: Colors.textTertiary }]}>
            {lookup ? label : 'Produit non trouvé dans le cache'}
          </ThemedText>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ARMirrorScreen() {
  const insets = useSafeAreaInsets();
  const { isPremium } = usePremium();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [sharingAvailable, setSharingAvailable] = useState(false);

  // Camera view layout dimensions (updated via onLayout)
  const cameraLayout = useRef({ w: SW, h: SH });
  const viewShotRef = useRef<ViewShot>(null);
  const cameraRef = useRef<CameraView>(null);

  // Offline cache: barcode → { verdict, name, brand }
  const cacheRef = useRef<Map<string, CachedLookup>>(new Map());
  const lookupDebouncedRef = useRef<Set<string>>(new Set());

  // Tracked barcodes (mutable ref — not state, for perf)
  const trackedRef = useRef<Map<string, TrackedBarcode>>(new Map());

  // Render state (synced every 150ms)
  const [renderItems, setRenderItems] = useState<RenderItem[]>([]);
  const [capturedURI, setCapturedURI] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  // Quick-scan fallback state
  const [quickMode, setQuickMode] = useState(false);
  const [quickResult, setQuickResult] = useState<{ lookup: CachedLookup | null; barcode: string } | null>(null);
  const lastQuickScan = useRef<string | null>(null);

  // ── Load offline cache ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@helo_offline_cache');
        if (!raw) return;
        const parsed = JSON.parse(raw) as { entries: Record<string, { barcode: string; product: ProductData; verdict: VerdictResult }> };
        const map = new Map<string, CachedLookup>();
        for (const [barcode, entry] of Object.entries(parsed.entries ?? {})) {
          const v = entry.verdict?.verdict;
          if (v === 'safe' || v === 'caution' || v === 'danger') {
            map.set(barcode, {
              verdict: v,
              name: entry.product?.name ?? barcode,
              brand: entry.product?.brand ?? '',
            });
          }
        }
        cacheRef.current = map;
      } catch {}
    })();
  }, []);

  // ── Sync render state every 150ms ─────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const items: RenderItem[] = [];
      for (const [barcode, tracked] of trackedRef.current.entries()) {
        const age = now - tracked.lastSeen;
        if (age >= REMOVE_MS) {
          trackedRef.current.delete(barcode);
          continue;
        }
        const opacity = age < FADE_START_MS ? 1 : 1 - (age - FADE_START_MS) / (REMOVE_MS - FADE_START_MS);
        items.push({ ...tracked, opacity });
      }
      setRenderItems(items);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // ── onBarcodeScanned — called multiple times/sec ──────────────────────────
  const handleBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    if (quickMode) return;
    const { data: barcode } = result;
    if (!barcode) return;

    const norm = normaliseBounds(result, cameraLayout.current.w, cameraLayout.current.h);
    if (!norm) return;

    const now = Date.now();
    const existing = trackedRef.current.get(barcode);
    const lookup = cacheRef.current.get(barcode) ?? null;

    trackedRef.current.set(barcode, {
      barcode,
      ...norm,
      lookup,
      lastSeen: now,
    });

    // If not yet debounced and not in cache, note for optional future lookup
    if (!lookup && !lookupDebouncedRef.current.has(barcode)) {
      lookupDebouncedRef.current.add(barcode);
      setTimeout(() => lookupDebouncedRef.current.delete(barcode), LOOKUP_DEBOUNCE_MS);
    }

    // Haptic feedback when a new product appears
    if (!existing) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [quickMode]);

  // ── Quick-scan handler ────────────────────────────────────────────────────
  const handleQuickScan = useCallback((result: BarcodeScanningResult) => {
    if (!quickMode) return;
    const { data: barcode } = result;
    if (!barcode || barcode === lastQuickScan.current) return;
    lastQuickScan.current = barcode;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const lookup = cacheRef.current.get(barcode) ?? null;
    setQuickResult({ lookup, barcode });
    setTimeout(() => {
      lastQuickScan.current = null;
    }, 2500);
  }, [quickMode]);

  // ── Check sharing availability ────────────────────────────────────────────
  useEffect(() => {
    Sharing.isAvailableAsync().then(setSharingAvailable);
  }, []);

  // ── Capture & share ───────────────────────────────────────────────────────
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
    } catch {}
    setCapturing(false);
  }, [capturing, sharingAvailable]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const safeCount = renderItems.filter((i) => i.lookup?.verdict === 'safe').length;
  const cautionCount = renderItems.filter((i) => i.lookup?.verdict === 'caution').length;
  const dangerCount = renderItems.filter((i) => i.lookup?.verdict === 'danger').length;

  // ── Premium gate ──────────────────────────────────────────────────────────
  if (!isPremium) {
    return (
      <View style={[styles.root, { backgroundColor: '#0D0D0D' }]}>
        <StatusBar style="light" />
        <View style={[styles.gateContainer, { paddingTop: insets.top + 20 }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { top: insets.top + Spacing.sm }]}
          >
            <Feather name="x" size={20} color="white" />
          </Pressable>

          {/* Preview blurred circles */}
          <View style={styles.gateDemoRow}>
            {(['safe', 'caution', 'danger'] as VerdictShort[]).map((v) => (
              <View key={v} style={[styles.gateDemo, { borderColor: VERDICT_COLOR[v] + '99', backgroundColor: VERDICT_COLOR[v] + '22' }]}>
                <ThemedText style={[styles.gateDemoEmoji, { color: VERDICT_COLOR[v] }]}>
                  {VERDICT_EMOJI[v]}
                </ThemedText>
              </View>
            ))}
          </View>

          <ThemedText style={styles.gateTitle}>Mode Miroir AR</ThemedText>
          <ThemedText style={styles.gateSubtitle}>
            Entourez vos produits d'un halo coloré en temps réel.{'\n'}
            Scannez toute votre étagère en une seconde.
          </ThemedText>

          <View style={styles.gateFeatures}>
            {[
              '🟢  Halo vert — produit sûr',
              '🟡  Halo ambre — vigilance',
              '🔴  Halo rouge — à éviter',
              '📸  Capture AR pour TikTok / Insta',
            ].map((f) => (
              <ThemedText key={f} style={styles.gateFeatureItem}>{f}</ThemedText>
            ))}
          </View>

          <Pressable
            onPress={() => router.replace('/premium' as never)}
            style={({ pressed }) => [styles.gatePremiumBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="star" size={16} color="#1A1A1A" />
            <ThemedText style={styles.gatePremiumText}>Débloquer — Premium</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Camera permission ─────────────────────────────────────────────────────
  if (!cameraPermission) return <View style={[styles.root, { backgroundColor: '#000' }]} />;
  if (!cameraPermission.granted) {
    return (
      <View style={[styles.root, styles.permCenter]}>
        <StatusBar style="light" />
        <Feather name="camera-off" size={48} color="white" style={{ marginBottom: 20 }} />
        <ThemedText style={styles.permText}>Caméra requise pour le Mode Miroir</ThemedText>
        <TouchableOpacity onPress={requestCameraPermission} style={styles.permBtn}>
          <ThemedText style={styles.permBtnText}>Autoriser la caméra</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <ThemedText style={{ color: '#AAAAAA', fontSize: 14 }}>Retour</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Main AR view ─────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ViewShot wrapper for capture */}
      <ViewShot
        ref={viewShotRef}
        style={StyleSheet.absoluteFill}
        options={{ format: 'jpg', quality: 0.92 }}
      >
        {/* Camera */}
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onLayout={(e) => {
            cameraLayout.current = {
              w: e.nativeEvent.layout.width,
              h: e.nativeEvent.layout.height,
            };
          }}
          onBarcodeScanned={quickMode ? handleQuickScan : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        />

        {/* AR Halo overlay */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {renderItems.map((item) => (
            <Halo key={item.barcode} item={item} />
          ))}
        </View>

        {/* Captured flash */}
        {capturedURI && (
          <Animated.View
            entering={FadeIn.duration(100)}
            exiting={FadeOut.duration(600)}
            style={styles.capturedFlash}
          />
        )}
      </ViewShot>

      {/* ── Top HUD ──────────────────────────────────────────────────────── */}
      <View style={[styles.topHud, { paddingTop: insets.top + Spacing.sm }]} pointerEvents="box-none">
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.hudBackBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="arrow-left" size={18} color="white" />
        </Pressable>

        {/* Center counter */}
        <View style={styles.counterBubble}>
          <View style={styles.counterDot} />
          <ThemedText style={styles.counterText}>
            {renderItems.length === 0
              ? quickMode ? 'Mode rapide — pointez un produit' : 'Pointez votre étagère'
              : `${renderItems.length} produit${renderItems.length > 1 ? 's' : ''} détecté${renderItems.length > 1 ? 's' : ''}`}
          </ThemedText>
        </View>

        {/* Mode toggle */}
        <Pressable
          onPress={() => {
            setQuickMode((m) => !m);
            trackedRef.current.clear();
            setRenderItems([]);
            setQuickResult(null);
          }}
          style={({ pressed }) => [styles.modeToggleBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name={quickMode ? 'eye' : 'zap'} size={16} color="white" />
        </Pressable>
      </View>

      {/* ── Quick scan result ─────────────────────────────────────────────── */}
      {quickMode && quickResult && (
        <QuickScanResult
          key={quickResult.barcode}
          lookup={quickResult.lookup}
          barcode={quickResult.barcode}
          onDismiss={() => setQuickResult(null)}
        />
      )}

      {/* ── Score banner (AR mode only) ───────────────────────────────────── */}
      {!quickMode && renderItems.length > 0 && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.scoreBanner} pointerEvents="none">
          {dangerCount > 0 && (
            <View style={[styles.scoreChip, { backgroundColor: VERDICT_COLOR.danger + '22', borderColor: VERDICT_COLOR.danger + '88' }]}>
              <ThemedText style={[styles.scoreChipText, { color: VERDICT_COLOR.danger }]}>
                {dangerCount} ✕
              </ThemedText>
            </View>
          )}
          {cautionCount > 0 && (
            <View style={[styles.scoreChip, { backgroundColor: VERDICT_COLOR.caution + '22', borderColor: VERDICT_COLOR.caution + '88' }]}>
              <ThemedText style={[styles.scoreChipText, { color: VERDICT_COLOR.caution }]}>
                {cautionCount} ⚠
              </ThemedText>
            </View>
          )}
          {safeCount > 0 && (
            <View style={[styles.scoreChip, { backgroundColor: VERDICT_COLOR.safe + '22', borderColor: VERDICT_COLOR.safe + '88' }]}>
              <ThemedText style={[styles.scoreChipText, { color: VERDICT_COLOR.safe }]}>
                {safeCount} ✓
              </ThemedText>
            </View>
          )}
        </Animated.View>
      )}

      {/* ── Bottom controls ───────────────────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        {/* Legend */}
        <View style={styles.legend}>
          {(['safe', 'caution', 'danger'] as VerdictShort[]).map((v) => (
            <View key={v} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: VERDICT_COLOR[v] }]} />
              <ThemedText style={styles.legendText}>{VERDICT_LABEL_FR[v]}</ThemedText>
            </View>
          ))}
        </View>

        {/* Capture button */}
        <TouchableOpacity
          onPress={handleCapture}
          disabled={capturing}
          activeOpacity={0.8}
          style={[styles.captureBtn, { opacity: capturing ? 0.6 : 1 }]}
        >
          <View style={styles.captureBtnInner}>
            <Feather name="camera" size={20} color="#1A1A1A" />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Mode label overlay ────────────────────────────────────────────── */}
      {quickMode && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.quickModeHint}
          pointerEvents="none"
        >
          <Feather name="zap" size={12} color={Colors.accent} />
          <ThemedText style={styles.quickModeText}>Mode Rapide</ThemedText>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Halo ──────────────────────────────────────────────────────────────────
  haloContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloOuter: {
    position: 'absolute',
    borderWidth: 2.5,
    // glow via shadow
    shadowRadius: 12,
    shadowOpacity: 0.7,
    elevation: 8,
  },
  haloInner: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  haloDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  haloLabel: {
    position: 'absolute',
    top: -28,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    maxWidth: 180,
  },
  haloLabelText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
  },

  // ── Top HUD ───────────────────────────────────────────────────────────────
  topHud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  hudBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    maxWidth: 240,
  },
  counterDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF4444',
  },
  counterText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: 'white',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  modeToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Score banner ──────────────────────────────────────────────────────────
  scoreBanner: {
    position: 'absolute',
    top: '15%',
    left: '50%',
    transform: [{ translateX: -80 }],
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  scoreChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  scoreChipText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
  },

  // ── Quick scan result ─────────────────────────────────────────────────────
  quickResult: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    bottom: '20%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(10,10,10,0.9)',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  quickEmoji: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickEmojiText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
  },
  quickName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: 'white',
  },
  quickLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    marginTop: 2,
  },

  // ── Bottom bar ────────────────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.2,
  },
  captureBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Capture flash ─────────────────────────────────────────────────────────
  capturedFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },

  // ── Quick mode hint ───────────────────────────────────────────────────────
  quickModeHint: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  quickModeText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: Colors.accent,
    letterSpacing: 0.3,
  },

  // ── Premium gate ──────────────────────────────────────────────────────────
  gateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.xl,
  },
  backBtn: {
    position: 'absolute',
    left: Spacing.xl,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateDemoRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginBottom: Spacing.md,
  },
  gateDemo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateDemoEmoji: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 28,
  },
  gateTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 28,
    color: 'white',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  gateSubtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  gateFeatures: {
    alignSelf: 'stretch',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
  },
  gateFeatureItem: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
  },
  gatePremiumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  gatePremiumText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#1A1A1A',
  },

  // ── Permissions ───────────────────────────────────────────────────────────
  permCenter: {
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  permText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.lg,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  permBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#1A1A1A',
  },
});
