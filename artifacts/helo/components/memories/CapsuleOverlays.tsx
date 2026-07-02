import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ui/ThemedText';
import { Sparkle } from './CapsuleCard';
import { styles } from './memoriesStyles';

// ── Sealing animation overlay ─────────────────────────────────────────────────

interface SealingOverlayProps {
  onDone: () => void;
  capsuleLabel: string;
}

export function SealingOverlay({ onDone, capsuleLabel }: SealingOverlayProps) {
  const circleScale = useSharedValue(1);
  const circleRotate = useSharedValue(0);
  const lockScale = useSharedValue(0);
  const lockOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const bgOpacity = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    bgOpacity.value = withTiming(1, { duration: 400 });
    circleScale.value = withSequence(
      withTiming(1.15, { duration: 300, easing: Easing.out(Easing.quad) }),
      withDelay(200, withTiming(0.6, { duration: 600, easing: Easing.inOut(Easing.quad) })),
    );
    circleRotate.value = withDelay(200, withTiming(360, { duration: 700, easing: Easing.inOut(Easing.cubic) }));
    lockScale.value = withDelay(600, withSpring(1, { damping: 14, stiffness: 180 }));
    lockOpacity.value = withDelay(600, withTiming(1, { duration: 300 }));
    textOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }));
    const timer = setTimeout(() => runOnJS(onDone)(), 2800);
    return () => clearTimeout(timer);
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }, { rotate: `${circleRotate.value}deg` }],
  }));
  const lockStyle = useAnimatedStyle(() => ({
    opacity: lockOpacity.value,
    transform: [{ scale: lockScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));

  const SPARKLE_ANGLES = Array.from({ length: 12 }, (_, i) => (i * Math.PI * 2) / 12);

  return (
    <Animated.View style={[styles.sealingOverlay, bgStyle]}>
      <View style={styles.sparkleContainer}>
        {SPARKLE_ANGLES.map((angle, i) => (
          <Sparkle key={i} delay={500 + i * 30} angle={angle} />
        ))}
      </View>
      <Animated.View style={[styles.sealingCircle, circleStyle]} />
      <Animated.View style={[styles.sealingLock, lockStyle]}>
        <ThemedText style={styles.sealingLockEmoji}>🔒</ThemedText>
      </Animated.View>
      <Animated.View style={[styles.sealingTextWrap, textStyle]}>
        <ThemedText variant="headlineMedium" style={styles.sealingTitle}>
          Capsule scellée
        </ThemedText>
        <ThemedText variant="bodyMedium" style={styles.sealingSub}>
          {capsuleLabel}
        </ThemedText>
        <ThemedText variant="bodySmall" style={styles.sealingHint}>
          Ta capsule t'attend dans le profil 💛
        </ThemedText>
      </Animated.View>
    </Animated.View>
  );
}

// ── Opening animation overlay ─────────────────────────────────────────────────

interface OpeningOverlayProps {
  onDone: () => void;
}

export function OpeningOverlay({ onDone }: OpeningOverlayProps) {
  const lockRotate = useSharedValue(0);
  const lightScale = useSharedValue(0);
  const lightOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const bgOpacity = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    bgOpacity.value = withTiming(1, { duration: 300 });
    lockRotate.value = withSequence(
      withTiming(-20, { duration: 200 }),
      withTiming(20, { duration: 200 }),
      withTiming(-15, { duration: 150 }),
      withTiming(0, { duration: 150 }),
      withDelay(100, withTiming(-45, { duration: 400, easing: Easing.out(Easing.back(2)) })),
    );
    lightScale.value = withDelay(600, withSpring(6, { damping: 20, stiffness: 80 }));
    lightOpacity.value = withDelay(600, withSequence(
      withTiming(0.7, { duration: 400 }),
      withDelay(300, withTiming(0, { duration: 400 })),
    ));
    textOpacity.value = withDelay(900, withTiming(1, { duration: 600 }));
    const timer = setTimeout(() => runOnJS(onDone)(), 2200);
    return () => clearTimeout(timer);
  }, []);

  const lockStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${lockRotate.value}deg` }],
  }));
  const lightStyle = useAnimatedStyle(() => ({
    opacity: lightOpacity.value,
    transform: [{ scale: lightScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));

  const SPARKLE_ANGLES = Array.from({ length: 10 }, (_, i) => (i * Math.PI * 2) / 10);

  return (
    <Animated.View style={[styles.sealingOverlay, bgStyle]}>
      <Animated.View style={[styles.openingLight, lightStyle]} />
      <View style={styles.sparkleContainer}>
        {SPARKLE_ANGLES.map((angle, i) => (
          <Sparkle key={i} delay={600 + i * 50} angle={angle} />
        ))}
      </View>
      <Animated.View style={lockStyle}>
        <ThemedText style={styles.openingLockEmoji}>🔓</ThemedText>
      </Animated.View>
      <Animated.View style={[styles.sealingTextWrap, textStyle]}>
        <ThemedText variant="headlineMedium" style={styles.sealingTitle}>
          Capsule ouverte ✨
        </ThemedText>
        <ThemedText variant="bodyMedium" style={styles.sealingSub}>
          Tes souvenirs t'attendent…
        </ThemedText>
      </Animated.View>
    </Animated.View>
  );
}
