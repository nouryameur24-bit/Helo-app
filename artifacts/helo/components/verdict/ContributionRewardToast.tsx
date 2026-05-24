/**
 * ContributionRewardToast — premium "merci" celebration shown immediately
 * after a Ghost Capture save lands.
 *
 * Why a dedicated component rather than reusing the generic `Toast` in
 * VerdictAnimations.tsx?
 *   • Two-line content (headline + sub) — the generic Toast is single-line.
 *   • Dismissable manually — Ghost Capture reciprocity moment shouldn't
 *     disappear under the user's eyes if she's reading.
 *   • Distinct palette (safeBg + safe border) signals reward, not just an
 *     ack — anchors the emotional payload of the Ghost Capture flow.
 *
 * Auto-dismisses after 4s but the explicit ✕ lets the user keep it visible
 * to read the contribution count. The 4s delay starts on each `visible`
 * transition to true.
 */
import { Feather } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface ContributionRewardToastProps {
  visible: boolean;
  count: number;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;

export function ContributionRewardToast({
  visible,
  count,
  onDismiss,
}: ContributionRewardToastProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-30);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 250 });
      translateY.value = withTiming(0, { duration: 250 });
      const timer = setTimeout(() => {
        // Dispatch the dismiss on the JS thread — animations run on UI thread.
        runOnJS(onDismiss)();
      }, AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    } else {
      opacity.value = withTiming(0, { duration: 250 });
      translateY.value = withTiming(-30, { duration: 250 });
    }
  }, [visible, opacity, translateY, onDismiss]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible && opacity.value === 0) return null;

  // French ordinal: 1er / 2e / 3e / ... — only the first contribution uses "1ère".
  const ordinal = count === 1 ? '1ère' : `${count}e`;

  return (
    <Animated.View
      style={[styles.container, animStyle]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <ThemedText variant="bodyMedium" style={styles.headline}>
            💛 Merci ! Ce produit aidera bientôt d'autres mamans.
          </ThemedText>
          <ThemedText variant="bodySmall" style={styles.sub}>
            Votre {ordinal} contribution
          </ThemedText>
        </View>
        <Pressable
          onPress={onDismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          style={styles.closeBtn}
        >
          <Feather name="x" size={16} color={Colors.textSecondary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80, // sits just below the safe-area inset / status bar
    left: '5%',
    right: '5%',
    maxWidth: '90%',
    alignSelf: 'center',
    backgroundColor: Colors.safeBg,
    borderWidth: 1,
    borderColor: Colors.safe,
    borderRadius: 16,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    zIndex: 1000,
    // iOS shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    // Android shadow
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headline: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textPrimary,
    fontSize: Typography.bodyMedium.fontSize,
    lineHeight: 20,
  },
  sub: {
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
