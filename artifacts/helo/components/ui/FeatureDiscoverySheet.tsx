// ─── FeatureDiscoverySheet — non-blocking first-use bottom sheet ────────────
//
// Presentational component. State (visible / dismiss) is controlled by the
// caller, usually via `useFeatureDiscovery` (see hook for usage patterns).

import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

export type FeatureDiscoverySheetProps = {
  visible: boolean;
  icon: string;
  title: string;
  description: string;
  tip: string;
  onDismiss: () => void;
};

export function FeatureDiscoverySheet({
  visible,
  icon,
  title,
  description,
  tip,
  onDismiss,
}: FeatureDiscoverySheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(400);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 140, mass: 0.9 });
    } else {
      translateY.value = withTiming(400, { duration: 200, easing: Easing.in(Easing.ease) });
    }
  }, [visible, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(180)}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Fermer" />
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.xl }, sheetStyle]}>
          <View style={styles.handle} />

          <View style={styles.iconCircle}>
            <ThemedText style={styles.iconText}>{icon}</ThemedText>
          </View>

          <ThemedText variant="headlineMedium" color="textPrimary" style={styles.title}>
            {title}
          </ThemedText>

          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.description}>
            {description}
          </ThemedText>

          <View style={styles.tipBox}>
            <ThemedText variant="bodySmall" color="textPrimary" style={styles.tipText}>
              {tip}
            </ThemedText>
          </View>

          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.92 }]}
            accessibilityRole="button"
            accessibilityLabel="C'est parti"
          >
            <ThemedText variant="bodyLarge" style={styles.ctaText}>
              C'est parti !
            </ThemedText>
            <Feather name="arrow-right" size={20} color={Colors.background} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 22, 18, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    ...Shadows.elevated,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accentLight,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  iconText: {
    fontSize: 32,
    lineHeight: 36,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  tipBox: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  tipText: {
    lineHeight: 20,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: 16,
  },
  ctaText: {
    color: Colors.background,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
