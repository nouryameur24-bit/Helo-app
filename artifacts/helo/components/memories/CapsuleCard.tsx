import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import {
  formatOpensDate,
  formatSealedDate,
  isCapsuleOpenable,
  MemoryCapsule,
} from '@/lib/memories';
import { styles } from './memoriesStyles';

// ── Sparkle particle ─────────────────────────────────────────────────────────

export function Sparkle({ delay, angle }: { delay: number; angle: number }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    const distance = 60 + Math.random() * 40;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;

    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(300, withTiming(0, { duration: 300 })),
    ));
    scale.value = withDelay(delay, withSequence(
      withSpring(1.2),
      withDelay(400, withTiming(0, { duration: 200 })),
    ));
    x.value = withDelay(delay, withTiming(dx, { duration: 600, easing: Easing.out(Easing.quad) }));
    y.value = withDelay(delay, withTiming(dy, { duration: 600, easing: Easing.out(Easing.quad) }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.sparkle,
        style,
        { backgroundColor: Math.random() > 0.5 ? Colors.accent : Colors.accentLight },
      ]}
    />
  );
}

// ── Capsule card ──────────────────────────────────────────────────────────────

interface CapsuleCardProps {
  capsule: MemoryCapsule;
  onPress: () => void;
}

export function CapsuleCard({ capsule, onPress }: CapsuleCardProps) {
  const openable = isCapsuleOpenable(capsule);
  const opened = capsule.opened;

  return (
    <Pressable
      style={({ pressed }) => [styles.capsuleCard, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Capsule ${capsule.trimesterLabel}, ${opened ? 'ouverte' : openable ? 'prête à ouvrir' : 'scellée'}`}
    >
      <LinearGradient
        colors={
          opened
            ? ['#FFF9F0', '#FFFAF5']
            : openable
              ? ['#FFF5E0', '#FFFAF5']
              : ['#FFFAF5', '#FFFAF5']
        }
        style={styles.capsuleGradient}
      >
        <View style={[styles.capsuleLockWrap, openable && styles.capsuleLockWrapOpenable]}>
          <ThemedText style={styles.capsuleLockEmoji}>
            {opened ? '📖' : openable ? '🔓' : '🔒'}
          </ThemedText>
        </View>

        <View style={styles.capsuleInfo}>
          <ThemedText variant="labelLarge" color="textPrimary">
            {capsule.trimesterLabel}
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary">
            Scellée le {formatSealedDate(capsule.sealedAt)}
          </ThemedText>
          {opened ? (
            <ThemedText variant="bodySmall" color="safe" style={{ marginTop: 2 }}>
              Ouverte ✓
            </ThemedText>
          ) : openable ? (
            <ThemedText variant="bodySmall" style={[styles.capsuleOpenCta]}>
              Ouvrir ta capsule ✨
            </ThemedText>
          ) : (
            <ThemedText variant="bodySmall" color="textTertiary">
              S'ouvre le {formatOpensDate(capsule.opensAt)}
            </ThemedText>
          )}
        </View>

        <View style={styles.capsuleStats}>
          <ThemedText variant="labelSmall" color="accentDark">
            {capsule.data.scanCount} scans
          </ThemedText>
          <View style={styles.capsuleGlowBadge}>
            <ThemedText style={styles.capsuleGlowText}>
              {capsule.data.avgGlowScore > 0 ? capsule.data.avgGlowScore : '—'}
            </ThemedText>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
