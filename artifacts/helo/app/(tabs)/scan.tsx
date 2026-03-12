import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  interpolateColor,
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
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

const { width: W, height: H } = Dimensions.get('window');

// Viewfinder dimensions
const VF_SIZE = Math.min(W * 0.68, 280);
const VF_X = (W - VF_SIZE) / 2;
const VF_Y = H * 0.28;

const CORNER_SIZE = 22;
const CORNER_THICKNESS = 3;
const DEBOUNCE_MS = 3000;

const BARCODE_TYPES = [
  'ean13', 'ean8', 'upc_a', 'upc_e', 'code128',
] as const;

type ScanMode = 'barcode' | 'ingredients' | 'menu';

// ─── Permission screen ───────────────────────────────────────────────────────
function PermissionScreen({ onRequest }: { onRequest: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.permissionRoot,
        {
          paddingTop: insets.top + Spacing.xxxl,
          paddingBottom: insets.bottom + Spacing.xxxl,
        },
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

// ─── L-shaped corner bracket ─────────────────────────────────────────────────
function CornerBracket({
  position,
  color,
}: {
  position: 'tl' | 'tr' | 'bl' | 'br';
  color: string;
}) {
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
      {/* Horizontal arm */}
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
      {/* Vertical arm */}
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

// ─── Animated viewfinder (pulsing border + flashing corners) ─────────────────
function FlashingViewfinder({
  flashColor,
}: {
  flashColor: Animated.SharedValue<number>;
}) {
  const pulseOpacity = useSharedValue(0.5);

  React.useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.5, { duration: 1000 }),
      ),
      -1,
      false,
    );
  }, [pulseOpacity]);

  const borderStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    borderColor: interpolateColor(
      flashColor.value,
      [0, 1],
      [Colors.accent, Colors.safe],
    ),
  }));

  // Crossfade between accent corners and safe corners
  const accentCornersStyle = useAnimatedStyle(() => ({
    opacity: 1 - flashColor.value,
  }));
  const safeCornersStyle = useAnimatedStyle(() => ({
    opacity: flashColor.value,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Pulsing border */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.viewfinderBorder, borderStyle]}
      />

      {/* Accent (golden) corners */}
      <Animated.View style={[StyleSheet.absoluteFill, accentCornersStyle]}>
        <CornerBracket position="tl" color={Colors.accent} />
        <CornerBracket position="tr" color={Colors.accent} />
        <CornerBracket position="bl" color={Colors.accent} />
        <CornerBracket position="br" color={Colors.accent} />
      </Animated.View>

      {/* Safe (green) corners — fade in on scan */}
      <Animated.View style={[StyleSheet.absoluteFill, safeCornersStyle]}>
        <CornerBracket position="tl" color={Colors.safe} />
        <CornerBracket position="tr" color={Colors.safe} />
        <CornerBracket position="bl" color={Colors.safe} />
        <CornerBracket position="br" color={Colors.safe} />
      </Animated.View>
    </View>
  );
}

// ─── Semi-transparent overlay (4 strips create the "cutout") ─────────────────
const OVERLAY_COLOR = 'rgba(45, 41, 38, 0.62)';

function ScanOverlay() {
  return (
    <>
      <View
        pointerEvents="none"
        style={[styles.strip, { top: 0, left: 0, right: 0, height: VF_Y }]}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY_COLOR }]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.strip, { top: VF_Y + VF_SIZE, left: 0, right: 0, bottom: 0 }]}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY_COLOR }]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.strip, { top: VF_Y, left: 0, width: VF_X, height: VF_SIZE }]}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY_COLOR }]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.strip, { top: VF_Y, left: VF_X + VF_SIZE, right: 0, height: VF_SIZE }]}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY_COLOR }]} />
      </View>
    </>
  );
}

// ─── Mode chip ───────────────────────────────────────────────────────────────
function ModeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.modeChip, active ? styles.modeChipActive : styles.modeChipInactive]}
    >
      <Text
        style={[
          styles.modeChipText,
          { color: active ? '#fff' : Colors.textPrimary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Web placeholder ─────────────────────────────────────────────────────────
function WebPlaceholder() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.permissionRoot,
        {
          paddingTop: insets.top + 67,
          paddingBottom: insets.bottom + 34,
          backgroundColor: Colors.background,
        },
      ]}
    >
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

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('barcode');
  const [isActive, setIsActive] = useState(false);

  const lastBarcode = useRef<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashColor = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  // Only keep camera active while tab is focused
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
    ({ data }: { data: string }) => {
      if (!data || data === lastBarcode.current) return;

      // Anti-spam: block same barcode for DEBOUNCE_MS
      lastBarcode.current = data;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        lastBarcode.current = null;
      }, DEBOUNCE_MS);

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Flash corners green (0 → 1 → hold 150ms → 0)
      flashColor.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 300 }),
      );

      // Navigate after flash completes
      setTimeout(() => {
        router.push(`/verdict/${encodeURIComponent(data)}`);
      }, 350);
    },
    [flashColor],
  );

  // ── Platform: web ──
  if (Platform.OS === 'web') return <WebPlaceholder />;

  // ── No permission object yet (loading) ──
  if (!permission) return <View style={[styles.root, { backgroundColor: Colors.background }]} />;

  // ── Permission denied ──
  if (!permission.granted) return <PermissionScreen onRequest={requestPermission} />;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Camera feed */}
      {isActive && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torchOn}
          onBarcodeScanned={scanMode === 'barcode' ? handleBarcodeScanned : undefined}
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        />
      )}

      {/* Dark cutout overlay */}
      <ScanOverlay />

      {/* Animated viewfinder (positioned over the clear zone) */}
      <View
        style={[
          styles.viewfinderContainer,
          { top: VF_Y, left: VF_X, width: VF_SIZE, height: VF_SIZE },
        ]}
        pointerEvents="none"
      >
        <FlashingViewfinder flashColor={flashColor} />
      </View>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: topInset + Spacing.sm }]}>
        <Text style={styles.topTitle}>Scanner</Text>
        <IconButton
          onPress={() => setTorchOn((v) => !v)}
          backgroundColor={torchOn ? Colors.accent : 'rgba(255,255,255,0.18)'}
          size={40}
        >
          <Feather
            name={torchOn ? 'zap' : 'zap-off'}
            size={18}
            color="#fff"
          />
        </IconButton>
      </View>

      {/* ── Hint pill under viewfinder ── */}
      <View
        style={[
          styles.hintWrapper,
          { top: VF_Y + VF_SIZE + Spacing.xl },
        ]}
        pointerEvents="none"
      >
        <View style={styles.hintPill}>
          <Text style={styles.hintText}>
            Placez le code-barres dans le cadre
          </Text>
        </View>
      </View>

      {/* ── Bottom mode chips ── */}
      <View style={[styles.bottomBar, { paddingBottom: bottomInset + Spacing.lg }]}>
        <View style={styles.chipsRow}>
          <ModeChip
            label="Code-barres"
            active={scanMode === 'barcode'}
            onPress={() => setScanMode('barcode')}
          />
          <ModeChip
            label="Ingrédients"
            active={scanMode === 'ingredients'}
            onPress={() => setScanMode('ingredients')}
          />
          <ModeChip
            label="Menu"
            active={scanMode === 'menu'}
            onPress={() => setScanMode('menu')}
          />
        </View>
        {scanMode !== 'barcode' && (
          <Text style={styles.comingSoon}>
            {scanMode === 'ingredients'
              ? 'Bientôt disponible — Analyse photo des ingrédients'
              : 'Bientôt disponible — Mode restaurant'}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  // Overlay cutout strips
  strip: {
    position: 'absolute',
  },
  // Viewfinder box (absolute, placed over the clear zone)
  viewfinderContainer: {
    position: 'absolute',
  },
  viewfinderBorder: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
  },
  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    zIndex: 10,
  },
  topTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: Typography.labelLarge.fontSize,
    letterSpacing: 0.3,
    color: '#fff',
  },
  // Hint
  hintWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  hintPill: {
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
  },
  hintText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: Typography.bodySmall.fontSize,
    color: '#fff',
  },
  // Bottom chips
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.lg,
    zIndex: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  modeChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
  },
  modeChipActive: {
    backgroundColor: Colors.accent,
  },
  modeChipInactive: {
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  modeChipText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: Typography.bodySmall.fontSize,
  },
  comingSoon: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: Typography.bodySmall.fontSize,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  // Permission / web screens
  permissionRoot: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
  },
  permissionIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: Typography.headlineLarge.fontSize,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  permissionBody: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: Typography.bodyMedium.fontSize,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
