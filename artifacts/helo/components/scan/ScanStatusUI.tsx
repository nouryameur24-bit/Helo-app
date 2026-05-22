/**
 * ScanStatusUI — OfflineBadge, SyncToast, PermissionScreen, WebPlaceholder.
 */

import React, { useEffect } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { swallow } from '@/lib/swallow';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

// ─── OfflineBadge ─────────────────────────────────────────────────────────────
export function OfflineBadge() {
  return (
    <View style={ui.offlineBadge}>
      <Feather name="wifi-off" size={11} color="rgba(255,255,255,0.9)" />
      <Text style={ui.offlineBadgeText}>Hors ligne</Text>
    </View>
  );
}

// ─── SyncToast ────────────────────────────────────────────────────────────────
interface SyncToastProps {
  visible: boolean;
}

export function SyncToast({ visible }: SyncToastProps) {
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
    <Animated.View style={[ui.syncToast, style]} pointerEvents="none">
      <Feather name="check-circle" size={14} color="#fff" />
      <Text style={ui.syncToastText}>Synchronisé ✓</Text>
    </Animated.View>
  );
}

// ─── PermissionScreen ─────────────────────────────────────────────────────────
interface PermissionScreenProps {
  onRequest: () => void;
  /**
   * Whether the OS will still display the native permission prompt when
   * `onRequest()` is called. From `useCameraPermissions()` →
   * `PermissionResponse.canAskAgain`. When false (user tapped "Don't ask
   * again" on Android or denied twice on iOS), tapping the in-app
   * "Autoriser" button does nothing — we must instead deep-link to the OS
   * settings, otherwise the user is stuck on a dead screen.
   *
   * Defaults to `true` to preserve the old behaviour for callers that
   * haven't been updated yet.
   */
  canAskAgain?: boolean;
}

export function PermissionScreen({ onRequest, canAskAgain = true }: PermissionScreenProps) {
  const insets = useSafeAreaInsets();
  const permanentlyDenied = !canAskAgain;

  const handlePress = () => {
    if (permanentlyDenied) {
      Linking.openSettings().catch((err) => swallow(err, 'PermissionScreen.openSettings'));
    } else {
      onRequest();
    }
  };

  return (
    <View
      style={[
        ui.permissionRoot,
        { paddingTop: insets.top + Spacing.xxxl, paddingBottom: insets.bottom + Spacing.xxxl },
      ]}
    >
      <View style={ui.permissionIcon}>
        <Feather name={permanentlyDenied ? 'settings' : 'camera'} size={40} color={Colors.accent} />
      </View>
      <Text style={ui.permissionTitle}>
        {permanentlyDenied ? 'Caméra désactivée' : 'Accès à la caméra'}
      </Text>
      <Text style={ui.permissionBody}>
        {permanentlyDenied
          ? "L'accès caméra a été refusé. Activez-le depuis les réglages du téléphone pour scanner vos produits."
          : "Hēlo a besoin d'accéder à votre caméra pour scanner vos produits"}
      </Text>
      <View style={{ width: '100%', paddingHorizontal: Spacing.xxl }}>
        <Button variant="primary" fullWidth onPress={handlePress}>
          {permanentlyDenied ? 'Ouvrir les réglages' : 'Autoriser'}
        </Button>
      </View>
    </View>
  );
}

// ─── WebPlaceholder ───────────────────────────────────────────────────────────
export function WebPlaceholder() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        ui.permissionRoot,
        {
          paddingTop: insets.top + 67,
          paddingBottom: insets.bottom + 34,
          backgroundColor: Colors.background,
        },
      ]}
    >
      <View style={ui.permissionIcon}>
        <Feather name="camera" size={40} color={Colors.accent} />
      </View>
      <Text style={ui.permissionTitle}>Scanner</Text>
      <Text style={ui.permissionBody}>
        La caméra est disponible uniquement sur l'application mobile.
      </Text>
      <Text style={ui.permissionBody}>
        Ouvrez Hēlo avec Expo Go sur votre iPhone ou Android pour scanner vos produits.
      </Text>
    </View>
  );
}

const ui = StyleSheet.create({
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
