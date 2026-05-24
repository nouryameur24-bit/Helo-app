import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { PermissionScreen, WebPlaceholder } from '@/components/scan/ScanStatusUI';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const VIEWFINDER_SIZE = Math.min(SCREEN_W - Spacing.huge * 2, 280);

// Same alphabet & length as `generatePartnerCode()` in lib/partnerUtils.ts.
// We only accept QR payloads whose `code` parameter matches this pattern,
// otherwise we Alert the user — guards against scanning unrelated QR codes
// (Wi-Fi, vCards…) that happen to be in frame first.
const CODE_PATTERN = /^[A-Z0-9]{6}$/;
const DEEP_LINK_PREFIX = 'helo://pair';
const HTTPS_LINK_PATTERN = /^https?:\/\/[^/]+\/pair\/([A-Z0-9]{6})/i;

/**
 * Extracts a 6-character partner code from a QR payload. Accepts three shapes:
 *   1. `helo://pair?code=ABC123`     — our canonical deep link
 *   2. `https://gethelo.app/pair/ABC123` — universal-link fallback
 *   3. `ABC123` — plain code, in case someone encoded the bare value
 *
 * Returns null when nothing parses — the caller surfaces an Alert.
 */
export function parsePartnerQR(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  if (trimmed.startsWith(DEEP_LINK_PREFIX)) {
    // Use URLSearchParams via the query slice — RN's URL polyfill rejects
    // custom schemes, so we hand-split rather than `new URL(trimmed)`.
    const queryStart = trimmed.indexOf('?');
    if (queryStart === -1) return null;
    const query = trimmed.slice(queryStart + 1);
    const params = new URLSearchParams(query);
    const code = params.get('code')?.toUpperCase();
    return code && CODE_PATTERN.test(code) ? code : null;
  }

  const httpsMatch = HTTPS_LINK_PATTERN.exec(trimmed);
  if (httpsMatch?.[1]) {
    const code = httpsMatch[1].toUpperCase();
    return CODE_PATTERN.test(code) ? code : null;
  }

  const upper = trimmed.toUpperCase();
  return CODE_PATTERN.test(upper) ? upper : null;
}

export default function PartnerScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [isActive, setIsActive] = useState(false);
  const lastScanned = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setIsActive(true);
      return () => {
        setIsActive(false);
        lastScanned.current = null;
      };
    }, []),
  );

  const handleBarcodeScanned = useCallback(({ data }: { data: string }) => {
    if (!data || data === lastScanned.current) return;
    lastScanned.current = data;

    const code = parsePartnerQR(data);
    if (!code) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'QR invalide',
        "Ce QR ne contient pas de code partenaire Hēlo. Demandez à votre partenaire d'afficher son QR depuis l'app.",
        [
          {
            text: 'OK',
            onPress: () => {
              // Allow re-scanning after dismissing the alert — without this
              // reset the same invalid QR sitting in frame would silently no-op.
              lastScanned.current = null;
            },
          },
        ],
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Hand the parsed code back to the partner-code entry screen via route
    // params. That screen reads `params.code`, prefills the PIN inputs and
    // auto-submits — no manual typing needed.
    router.replace({
      pathname: '/onboarding/partner-code',
      params: { code, source: 'qr' },
    });
  }, []);

  if (Platform.OS === 'web') return <WebPlaceholder />;
  if (!permission) return <View style={[styles.root, { backgroundColor: '#000' }]} />;
  if (!permission.granted) {
    return (
      <PermissionScreen
        onRequest={requestPermission}
        canAskAgain={permission.canAskAgain}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {isActive && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
      )}

      {/* Dark overlay with a transparent square cut-out — built from 4 panels
          around the viewfinder so we don't need a MaskedView dependency. */}
      <View style={styles.maskContainer} pointerEvents="none">
        <View style={styles.maskTop} />
        <View style={styles.maskMiddle}>
          <View style={styles.maskSide} />
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.maskSide} />
        </View>
        <View style={styles.maskBottom} />
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Fermer le scanner"
          hitSlop={12}
        >
          <Feather name="x" size={22} color="#FFFFFF" />
        </Pressable>
        <ThemedText variant="labelLarge" color="surface" style={styles.topTitle}>
          Scanner le QR
        </ThemedText>
        <View style={styles.closeBtnSpacer} />
      </View>

      {/* Helper pill under the viewfinder */}
      <Animated.View
        entering={FadeIn.delay(150).duration(400)}
        style={styles.hintWrap}
        pointerEvents="none"
      >
        <View style={styles.hintPill}>
          <Feather name="maximize" size={14} color="#FFFFFF" />
          <ThemedText variant="bodySmall" color="surface" style={styles.hintText}>
            Cadrez le QR code de votre partenaire
          </ThemedText>
        </View>
      </Animated.View>

      {/* Fallback action — manual code entry */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.fallbackBtn, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
        >
          <Feather name="edit-3" size={16} color="#FFFFFF" />
          <ThemedText variant="labelLarge" color="surface" style={styles.fallbackLabel}>
            Saisir le code à la main
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  maskContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  maskTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  maskBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  maskMiddle: {
    flexDirection: 'row',
    height: VIEWFINDER_SIZE,
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    borderRadius: Radius.lg,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.accent,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: Radius.lg,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: Radius.lg,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: Radius.lg,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: Radius.lg,
  },
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
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnSpacer: {
    width: 36,
  },
  topTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0.3,
  },
  hintWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    // Sits just below the viewfinder. Computed dynamically would need a measure;
    // 60% screen offset works across the supported devices (small to Pro Max).
    top: '62%',
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
  },
  hintText: {
    ...Typography.bodySmall,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  fallbackLabel: {
    letterSpacing: 0.2,
  },
});
