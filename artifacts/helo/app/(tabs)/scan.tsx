import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  interpolateColor,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useOffline } from '@/hooks/useOffline';
import { useProfile } from '@/hooks/useProfile';
import { usePremium } from '@/hooks/usePremium';
import { incrementScanCount, FREE_SCAN_LIMIT } from '@/lib/scanLimit';

const { width: W, height: H } = Dimensions.get('window');

const VF_BARCODE_W = Math.min(W * 0.68, 280);
const VF_BARCODE_H = VF_BARCODE_W;
const VF_BARCODE_Y = H * 0.28;

const VF_OCR_W = Math.min(W * 0.85, 340);
const VF_OCR_H = Math.round(VF_OCR_W * (2 / 3));
const VF_OCR_Y = H * 0.24;

const CORNER_SIZE = 22;
const CORNER_THICKNESS = 3;
const DEBOUNCE_MS = 3000;

const BARCODE_TYPES = [
  'ean13', 'ean8', 'upc_a', 'upc_e', 'code128',
] as const;

type ScanMode = 'barcode' | 'ingredients' | 'menu';

function PermissionScreen({ onRequest }: { onRequest: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.permissionRoot,
        { paddingTop: insets.top + Spacing.xxxl, paddingBottom: insets.bottom + Spacing.xxxl },
      ]}
    >
      <View style={styles.permissionIcon}>
        <Feather name="camera" size={40} color={Colors.accent} />
      </View>
      <Text style={styles.permissionTitle}>Accès à la caméra</Text>
      <Text style={styles.permissionBody}>
        Hēlo a besoin d'accéder à votre caméra pour scanner vos produits
      </Text>
      <View style={{ width: '100%', paddingHorizontal: Spacing.xxl }}>
        <Button variant="primary" fullWidth onPress={onRequest}>
          Autoriser
        </Button>
      </View>
    </View>
  );
}

function CornerBracket({ position, color }: { position: 'tl' | 'tr' | 'bl' | 'br'; color: string }) {
  const isTop = position === 'tl' || position === 'tr';
  const isLeft = position === 'tl' || position === 'bl';
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: CORNER_SIZE,
        height: CORNER_SIZE,
        top: isTop ? 0 : undefined,
        bottom: !isTop ? 0 : undefined,
        left: isLeft ? 0 : undefined,
        right: !isLeft ? 0 : undefined,
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: CORNER_SIZE,
          height: CORNER_THICKNESS,
          backgroundColor: color,
          top: isTop ? 0 : undefined,
          bottom: !isTop ? 0 : undefined,
          left: 0,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: CORNER_THICKNESS,
          height: CORNER_SIZE,
          backgroundColor: color,
          top: 0,
          left: isLeft ? 0 : undefined,
          right: !isLeft ? 0 : undefined,
        }}
      />
    </View>
  );
}

function FlashingViewfinder({ flashColor }: { flashColor: SharedValue<number> }) {
  const pulseOpacity = useSharedValue(0.5);
  React.useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 1000 }), withTiming(0.5, { duration: 1000 })),
      -1,
      false,
    );
  }, [pulseOpacity]);

  const borderStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    borderColor: interpolateColor(flashColor.value, [0, 1], [Colors.accent, Colors.safe]),
  }));
  const accentStyle = useAnimatedStyle(() => ({ opacity: 1 - flashColor.value }));
  const safeStyle = useAnimatedStyle(() => ({ opacity: flashColor.value }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.viewfinderBorder, borderStyle]} />
      <Animated.View style={[StyleSheet.absoluteFill, accentStyle]}>
        <CornerBracket position="tl" color={Colors.accent} />
        <CornerBracket position="tr" color={Colors.accent} />
        <CornerBracket position="bl" color={Colors.accent} />
        <CornerBracket position="br" color={Colors.accent} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, safeStyle]}>
        <CornerBracket position="tl" color={Colors.safe} />
        <CornerBracket position="tr" color={Colors.safe} />
        <CornerBracket position="bl" color={Colors.safe} />
        <CornerBracket position="br" color={Colors.safe} />
      </Animated.View>
    </View>
  );
}

const OVERLAY_COLOR = 'rgba(45, 41, 38, 0.62)';

function ScanOverlay({ vfX, vfY, vfW, vfH }: { vfX: number; vfY: number; vfW: number; vfH: number }) {
  return (
    <>
      <View pointerEvents="none" style={[styles.strip, { top: 0, left: 0, right: 0, height: vfY }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY_COLOR }]} />
      </View>
      <View pointerEvents="none" style={[styles.strip, { top: vfY + vfH, left: 0, right: 0, bottom: 0 }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY_COLOR }]} />
      </View>
      <View pointerEvents="none" style={[styles.strip, { top: vfY, left: 0, width: vfX, height: vfH }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY_COLOR }]} />
      </View>
      <View pointerEvents="none" style={[styles.strip, { top: vfY, left: vfX + vfW, right: 0, height: vfH }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY_COLOR }]} />
      </View>
    </>
  );
}

function ModeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.modeChip, active ? styles.modeChipActive : styles.modeChipInactive]}
    >
      <Text style={[styles.modeChipText, { color: active ? '#fff' : Colors.textPrimary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ShutterButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePress = () => {
    scale.value = withSequence(withTiming(0.9, { duration: 80 }), withTiming(1, { duration: 120 }));
    onPress();
  };
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <Animated.View style={[styles.shutter, style]}>
        <View style={styles.shutterInner}>
          <Feather name="camera" size={26} color="#fff" />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

function WebPlaceholder() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.permissionRoot, { paddingTop: insets.top + 67, paddingBottom: insets.bottom + 34, backgroundColor: Colors.background }]}>
      <View style={styles.permissionIcon}>
        <Feather name="camera" size={40} color={Colors.accent} />
      </View>
      <Text style={styles.permissionTitle}>Scanner</Text>
      <Text style={styles.permissionBody}>
        La caméra est disponible uniquement sur l'application mobile.
      </Text>
      <Text style={styles.permissionBody}>
        Ouvrez Hēlo avec Expo Go sur votre iPhone ou Android pour scanner vos produits.
      </Text>
    </View>
  );
}

function OfflineBadge() {
  return (
    <View style={styles.offlineBadge}>
      <Feather name="wifi-off" size={11} color="rgba(255,255,255,0.9)" />
      <Text style={styles.offlineBadgeText}>Hors ligne</Text>
    </View>
  );
}

function SyncToast({ visible }: { visible: boolean }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-16);
  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(-16, { duration: 200 });
    }
  }, [visible, opacity, translateY]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return (
    <Animated.View style={[styles.syncToast, style]} pointerEvents="none">
      <Feather name="check-circle" size={14} color="#fff" />
      <Text style={styles.syncToastText}>Synchronisé ✓</Text>
    </Animated.View>
  );
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('barcode');
  const [isActive, setIsActive] = useState(false);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [syncToastVisible, setSyncToastVisible] = useState(false);
  const syncToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastBarcode = useRef<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const flashColor = useSharedValue(0);
  const flashOverlay = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const { role, linkedFirstName } = useProfile();
  const isPartner = role === 'partner';
  const partnerName = linkedFirstName;

  const { isPremium, checkScanLimit, scansRemaining } = usePremium();
  const { isOffline, syncComplete } = useOffline();

  useEffect(() => {
    if (syncComplete) {
      setSyncToastVisible(true);
      if (syncToastTimer.current) clearTimeout(syncToastTimer.current);
      syncToastTimer.current = setTimeout(() => setSyncToastVisible(false), 2500);
    }
  }, [syncComplete]);

  const isOCRMode = scanMode === 'ingredients';
  const vfW = isOCRMode ? VF_OCR_W : VF_BARCODE_W;
  const vfH = isOCRMode ? VF_OCR_H : VF_BARCODE_H;
  const vfY = isOCRMode ? VF_OCR_Y : VF_BARCODE_Y;
  const vfX = (W - vfW) / 2;

  useFocusEffect(
    useCallback(() => {
      setIsActive(true);
      return () => {
        setIsActive(false);
        setTorchOn(false);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
      };
    }, []),
  );

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (!data || data === lastBarcode.current || scanMode !== 'barcode') return;
      lastBarcode.current = data;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => { lastBarcode.current = null; }, DEBOUNCE_MS);

      // ── Scan limit gate (free users online only) ──
      // When offline, skip gating — useScan will show the premium-offline message.
      if (!isPremium && !isOffline) {
        const allowed = await checkScanLimit();
        if (!allowed) {
          lastBarcode.current = null; // Allow re-trigger after paywall closes
          return; // checkScanLimit already navigated to /paywall
        }
        await incrementScanCount();
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      flashColor.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 300 }),
      );
      setTimeout(() => {
        router.push(`/verdict/${encodeURIComponent(data)}`);
      }, 350);
    },
    [flashColor, scanMode, isPremium, isOffline, checkScanLimit],
  );

  const handleShutter = useCallback(async () => {
    if (takingPhoto || !cameraRef.current) return;
    setTakingPhoto(true);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    flashOverlay.value = withSequence(
      withTiming(0.5, { duration: 60 }),
      withTiming(0, { duration: 250 }),
    );

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      if (photo?.uri) {
        router.push(`/ocr-review?imageUri=${encodeURIComponent(photo.uri)}&base64=${encodeURIComponent(photo.base64 ?? '')}`);
      }
    } catch {
      // silent — user can retry
    } finally {
      setTakingPhoto(false);
    }
  }, [takingPhoto, flashOverlay]);

  const flashOverlayStyle = useAnimatedStyle(() => ({
    opacity: flashOverlay.value,
  }));

  if (Platform.OS === 'web') return <WebPlaceholder />;
  if (!permission) return <View style={[styles.root, { backgroundColor: Colors.background }]} />;
  if (!permission.granted) return <PermissionScreen onRequest={requestPermission} />;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {isActive && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torchOn}
          onBarcodeScanned={scanMode === 'barcode' ? handleBarcodeScanned : undefined}
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        />
      )}

      <Animated.View
        style={[StyleSheet.absoluteFill, styles.flashOverlay, flashOverlayStyle]}
        pointerEvents="none"
      />

      <ScanOverlay vfX={vfX} vfY={vfY} vfW={vfW} vfH={vfH} />

      <View
        style={[styles.viewfinderContainer, { top: vfY, left: vfX, width: vfW, height: vfH }]}
        pointerEvents="none"
      >
        <FlashingViewfinder flashColor={flashColor} />
      </View>

      {/* ── Sync Toast ── */}
      <SyncToast visible={syncToastVisible} />

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: topInset + Spacing.sm }]}>
        <View style={styles.topLeft}>
          {isPartner && partnerName ? (
            <View style={styles.partnerBanner}>
              <Feather name="heart" size={14} color={Colors.accent} />
              <Text style={styles.partnerBannerText}>Scanner pour {partnerName}</Text>
            </View>
          ) : (
            <Text style={styles.topTitle}>Scanner</Text>
          )}
          {isOffline && <OfflineBadge />}
        </View>
        <IconButton
          onPress={() => setTorchOn((v) => !v)}
          backgroundColor={torchOn ? Colors.accent : 'rgba(255,255,255,0.18)'}
          size={40}
        >
          <Feather name={torchOn ? 'zap' : 'zap-off'} size={18} color="#fff" />
        </IconButton>
      </View>

      {/* ── Hint pill under viewfinder ── */}
      <View style={[styles.hintWrapper, { top: vfY + vfH + Spacing.xl }]} pointerEvents="none">
        <View style={styles.hintPill}>
          <Text style={styles.hintText}>
            {isOCRMode
              ? 'Photographiez la liste d\'ingrédients'
              : 'Placez le code-barres dans le cadre'}
          </Text>
        </View>
      </View>

      {/* ── OCR shutter button ── */}
      {isOCRMode && (
        <View style={[styles.shutterWrapper, { bottom: bottomInset + 90 }]}>
          <ShutterButton onPress={handleShutter} />
        </View>
      )}

      {/* ── Free scan counter ── */}
      {!isPremium && (
        <View style={[styles.scanCounter, { bottom: bottomInset + 128 }]}>
          <Feather
            name="zap"
            size={11}
            color={scansRemaining > 0 ? Colors.accent : Colors.danger}
          />
          <ThemedText
            style={scansRemaining === 0
              ? [styles.scanCounterText, { color: Colors.danger } as TextStyle]
              : styles.scanCounterText}
          >
            {scansRemaining > 0
              ? `${scansRemaining} scan${scansRemaining > 1 ? 's' : ''} gratuit${scansRemaining > 1 ? 's' : ''} restant${scansRemaining > 1 ? 's' : ''}`
              : 'Limite atteinte · Passez à Premium'}
          </ThemedText>
        </View>
      )}

      {/* ── Bottom mode chips ── */}
      <View style={[styles.bottomBar, { paddingBottom: bottomInset + Spacing.lg }]}>
        <View style={styles.chipsRow}>
          <ModeChip label="Code-barres" active={scanMode === 'barcode'} onPress={() => setScanMode('barcode')} />
          <ModeChip label="Ingrédients" active={scanMode === 'ingredients'} onPress={() => setScanMode('ingredients')} />
          <ModeChip label="Menu" active={scanMode === 'menu'} onPress={() => setScanMode('menu')} />
        </View>
        {scanMode === 'menu' && (
          <Text style={styles.comingSoon}>Bientôt disponible — Mode restaurant</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  strip: { position: 'absolute' },
  viewfinderContainer: { position: 'absolute' },
  viewfinderBorder: { borderWidth: 1.5, borderRadius: Radius.sm },
  flashOverlay: { backgroundColor: '#fff', zIndex: 20 },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, zIndex: 10,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  topTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: Typography.labelLarge.fontSize,
    letterSpacing: 0.3,
    color: '#fff',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(45, 41, 38, 0.55)',
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  offlineBadgeText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.3,
  },
  syncToast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.safe,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    zIndex: 999,
  },
  syncToastText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: Typography.bodyMedium.fontSize,
    color: '#fff',
  },
  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(201, 169, 110, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 110, 0.5)',
  },
  partnerBannerText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: Typography.labelLarge.fontSize,
    color: Colors.accentLight,
    letterSpacing: 0.2,
  },
  hintWrapper: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  hintPill: {
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
  },
  hintText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: Typography.bodySmall.fontSize, color: '#fff' },
  shutterWrapper: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accentDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.lg, zIndex: 10,
  },
  chipsRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  scanCounter: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    zIndex: 20,
  },
  scanCounterText: {
    ...Typography.labelSmall,
    color: '#ffffffcc',
    fontSize: 11,
  },
  modeChip: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: Radius.full },
  modeChipActive: { backgroundColor: Colors.accent },
  modeChipInactive: { backgroundColor: 'rgba(255,255,255,0.82)' },
  modeChipText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: Typography.bodySmall.fontSize },
  comingSoon: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: Typography.bodySmall.fontSize,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  permissionRoot: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xl, paddingHorizontal: Spacing.xxl,
  },
  permissionIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  permissionTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: Typography.headlineLarge.fontSize,
    color: Colors.textPrimary, textAlign: 'center',
  },
  permissionBody: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: Typography.bodyMedium.fontSize,
    color: Colors.textSecondary, textAlign: 'center', lineHeight: 24,
  },
});
