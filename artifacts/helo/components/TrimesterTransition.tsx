import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { getTrimesterPalette } from '@/lib/trimester';
import type { Trimester } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COUNT = 12;

interface ConfettiDot {
  x: number;
  delay: number;
  size: number;
  colorIndex: number;
}

function generateConfetti(): ConfettiDot[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    x: (Math.random() * 0.85 + 0.05) * SCREEN_WIDTH,
    delay: i * 80,
    size: 8 + Math.random() * 10,
    colorIndex: i % 2,
  }));
}

const CONFETTI_DOTS = generateConfetti();

function ConfettiDotItem({
  dot,
  accentColor,
  accentLightColor,
  visible,
}: {
  dot: ConfettiDot;
  accentColor: string;
  accentLightColor: string;
  visible: boolean;
}) {
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = -20;
      opacity.value = 0;
      translateY.value = withDelay(
        dot.delay,
        withTiming(SCREEN_HEIGHT * 0.6, { duration: 2000 }),
      );
      opacity.value = withDelay(
        dot.delay,
        withTiming(1, { duration: 300 }, () => {
          opacity.value = withDelay(
            1200,
            withTiming(0, { duration: 500 }),
          );
        }),
      );
    } else {
      translateY.value = -20;
      opacity.value = 0;
    }
  }, [visible, dot.delay, translateY, opacity]);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: dot.x,
    top: 0,
    width: dot.size,
    height: dot.size,
    borderRadius: dot.size / 2,
    backgroundColor: dot.colorIndex === 0 ? accentColor : accentLightColor,
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={style} />;
}

function TrimesterNumber({
  trimester,
  accentColor,
  visible,
}: {
  trimester: Trimester;
  accentColor: string;
  visible: boolean;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withDelay(
        200,
        withSpring(1, { damping: 12, stiffness: 150, mass: 0.8 }),
      );
      opacity.value = withDelay(200, withTiming(1, { duration: 300 }));
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [visible, scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={style}>
      <Text style={[styles.trimesterNumber, { color: accentColor }]}>
        {trimester}
      </Text>
    </Animated.View>
  );
}

interface TrimesterTransitionProps {
  visible: boolean;
  trimester: Trimester;
  changedProductsCount: number;
  onDismiss: () => void;
}

function trimesterOrdinalLabel(t: Trimester): string {
  if (t === 1) return '1er';
  if (t === 2) return '2ème';
  return '3ème';
}

export function TrimesterTransition({
  visible,
  trimester,
  changedProductsCount,
  onDismiss,
}: TrimesterTransitionProps) {
  const insets = useSafeAreaInsets();
  const palette = getTrimesterPalette(trimester);

  const contentOpacity = useSharedValue(0);
  const contentY = useSharedValue(30);

  useEffect(() => {
    if (visible) {
      contentOpacity.value = withDelay(500, withTiming(1, { duration: 450 }));
      contentY.value = withDelay(500, withTiming(0, { duration: 450 }));
    } else {
      contentOpacity.value = 0;
      contentY.value = 30;
    }
  }, [visible, contentOpacity, contentY]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  const handleShelfNavigate = () => {
    onDismiss();
    router.push('/(tabs)/shelf');
  };

  const topPad = Platform.OS === 'web' ? 80 : insets.top + 40;
  const bottomPad = Platform.OS === 'web' ? 40 : insets.bottom + 24;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={[styles.root, { backgroundColor: palette.background }]}>
        {/* Confetti */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {CONFETTI_DOTS.map((dot, i) => (
            <ConfettiDotItem
              key={i}
              dot={dot}
              accentColor={palette.accent}
              accentLightColor={palette.accentLight}
              visible={visible}
            />
          ))}
        </View>

        {/* Main content */}
        <View
          style={[
            styles.content,
            { paddingTop: topPad, paddingBottom: bottomPad },
          ]}
        >
          {/* Trimester number with spring animation */}
          <View style={styles.numberWrapper}>
            <TrimesterNumber
              trimester={trimester}
              accentColor={palette.accent}
              visible={visible}
            />
          </View>

          {/* Text content */}
          <Animated.View style={[styles.textBlock, contentStyle]}>
            <ThemedText variant="headlineLarge" style={[styles.welcomeTitle, { color: Colors.textPrimary }]}>
              Bienvenue dans ton{'\n'}{trimesterOrdinalLabel(trimester)} trimestre
            </ThemedText>

            <ThemedText
              variant="bodyMedium"
              style={[styles.subtitle, { color: Colors.textSecondary }]}
            >
              Nous avons mis à jour tes évaluations pour refléter les recommandations de ton nouveau trimestre.
            </ThemedText>

            {changedProductsCount > 0 && (
              <Pressable
                onPress={handleShelfNavigate}
                style={[styles.changedBadge, { backgroundColor: palette.accentLight }]}
              >
                <ThemedText variant="bodyMedium" style={{ color: palette.accent, fontWeight: '600' }}>
                  {changedProductsCount} produit{changedProductsCount > 1 ? 's ont' : ' a'} un nouveau statut
                </ThemedText>
                <ThemedText variant="bodySmall" style={{ color: palette.accent }}>
                  Voir le placard →
                </ThemedText>
              </Pressable>
            )}
          </Animated.View>

          {/* CTA button */}
          <Animated.View style={[styles.ctaWrapper, contentStyle]}>
            <Pressable
              onPress={onDismiss}
              style={[styles.ctaButton, { backgroundColor: palette.accent }]}
            >
              <Text style={styles.ctaLabel}>Découvrir</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxl,
  },
  numberWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 160,
  },
  trimesterNumber: {
    fontSize: 80,
    fontWeight: '700',
    lineHeight: 96,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  textBlock: {
    alignItems: 'center',
    gap: Spacing.lg,
    width: '100%',
  },
  welcomeTitle: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
  changedBadge: {
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  ctaWrapper: {
    width: '100%',
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
