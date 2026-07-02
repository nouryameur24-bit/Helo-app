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
import { Spacing } from '@/constants/theme';
import { BREASTFEEDING_PALETTE } from '@/hooks/useBreastfeeding';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PETAL_COUNT = 14;

interface PetalDot {
  x: number;
  delay: number;
  size: number;
  colorIndex: number;
}

function generatePetals(): PetalDot[] {
  return Array.from({ length: PETAL_COUNT }, (_, i) => ({
    x: (Math.random() * 0.85 + 0.05) * SCREEN_WIDTH,
    delay: i * 90,
    size: 6 + Math.random() * 12,
    colorIndex: i % 2,
  }));
}

const PETALS = generatePetals();

function PetalItem({
  dot,
  visible,
}: {
  dot: PetalDot;
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
        withTiming(SCREEN_HEIGHT * 0.65, { duration: 2200 }),
      );
      opacity.value = withDelay(
        dot.delay,
        withTiming(1, { duration: 300 }, () => {
          opacity.value = withDelay(1300, withTiming(0, { duration: 500 }));
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
    backgroundColor:
      dot.colorIndex === 0 ? BREASTFEEDING_PALETTE.accent : BREASTFEEDING_PALETTE.accentLight,
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={style} />;
}

function EmojiPulse({ visible }: { visible: boolean }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withDelay(
        200,
        withSpring(1, { damping: 10, stiffness: 140, mass: 0.9 }),
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
      <Text style={styles.emoji}>🤱</Text>
    </Animated.View>
  );
}

interface BreastfeedingTransitionProps {
  visible: boolean;
  changedProductsCount: number;
  onDismiss: () => void;
}

export function BreastfeedingTransition({
  visible,
  changedProductsCount,
  onDismiss,
}: BreastfeedingTransitionProps) {
  const insets = useSafeAreaInsets();

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
      <View style={[styles.root, { backgroundColor: BREASTFEEDING_PALETTE.background }]}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {PETALS.map((dot, i) => (
            <PetalItem key={i} dot={dot} visible={visible} />
          ))}
        </View>

        <View style={[styles.content, { paddingTop: topPad, paddingBottom: bottomPad }]}>
          <View style={styles.emojiWrapper}>
            <EmojiPulse visible={visible} />
          </View>

          <Animated.View style={[styles.textBlock, contentStyle]}>
            <ThemedText
              variant="headlineLarge"
              style={[styles.title, { color: BREASTFEEDING_PALETTE.accent }]}
            >
              Mode allaitement
            </ThemedText>
            <ThemedText variant="headlineMedium" style={styles.subtitle}>
              Félicitations pour la naissance de ton bébé !
            </ThemedText>
            <ThemedText variant="bodyMedium" style={styles.body}>
              Tes produits sont désormais analysés selon les recommandations spécifiques à
              l'allaitement. Certains ingrédients ont un statut différent de la grossesse.
            </ThemedText>

            {changedProductsCount > 0 && (
              <Pressable
                onPress={() => {
                  onDismiss();
                  router.push('/(tabs)/shelf');
                }}
                style={styles.changedBadge}
              >
                <ThemedText
                  variant="bodyMedium"
                  style={{ color: BREASTFEEDING_PALETTE.accent, fontWeight: '600' }}
                >
                  {changedProductsCount} produit{changedProductsCount > 1 ? 's ont' : ' a'} un
                  nouveau statut
                </ThemedText>
                <ThemedText variant="bodySmall" style={{ color: BREASTFEEDING_PALETTE.accent }}>
                  Voir le placard →
                </ThemedText>
              </Pressable>
            )}
          </Animated.View>

          <Animated.View style={[styles.ctaWrapper, contentStyle]}>
            <Pressable
              onPress={onDismiss}
              style={[styles.ctaButton, { backgroundColor: BREASTFEEDING_PALETTE.accent }]}
            >
              <Text style={styles.ctaLabel}>Commencer</Text>
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
  emojiWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 80,
    textAlign: 'center',
  },
  textBlock: {
    alignItems: 'center',
    gap: Spacing.lg,
    width: '100%',
  },
  title: {
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
    color: '#2D2926',
  },
  body: {
    textAlign: 'center',
    lineHeight: 22,
    color: '#8C7E75',
  },
  changedBadge: {
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: 4,
    width: '100%',
    backgroundColor: '#F0D0DC',
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
