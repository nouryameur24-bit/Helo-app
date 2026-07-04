/**
 * Lot 16-12 — Toast animé "+N" / "−N" quand le Glow Score change.
 *
 * Pourquoi : sans feedback visuel, l'utilisatrice ajoute un produit à
 * son placard, le score se met à jour silencieusement (75 → 78), et le
 * geste paraît "vide". Ce toast style Duolingo XP +3 célèbre la micro-
 * action : "Tu viens de gagner 3 points de Glow Score".
 *
 * Trigger : monté dans HomeScreen. Le parent passe `score`, on mémorise
 * le précédent, et quand un delta apparaît on déclenche l'animation.
 * Skip le premier render (delta apparent = score initial vs 0).
 */

import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

interface GlowScoreDeltaToastProps {
  /** Score actuel — observé pour détecter les variations. */
  score: number;
}

function GlowScoreDeltaToastImpl({ score }: GlowScoreDeltaToastProps) {
  const previousScoreRef = useRef<number | null>(null);
  const [delta, setDelta] = useState<number | null>(null);

  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // 1er render : on mémorise le score sans déclencher d'animation.
    if (previousScoreRef.current === null) {
      previousScoreRef.current = score;
      return;
    }

    const diff = score - previousScoreRef.current;
    previousScoreRef.current = score;
    if (diff === 0) return;

    setDelta(diff);
    Haptics.notificationAsync(
      diff > 0
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});

    // In-Up + Hold + Out-Up sequence.
    opacity.value = 0;
    translateY.value = 20;
    opacity.value = withSequence(
      withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
      withDelay(
        1400,
        withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) }, (done) => {
          if (done) runOnJS(setDelta)(null);
        }),
      ),
    );
    translateY.value = withSequence(
      withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) }),
      withDelay(
        1400,
        withTiming(-12, { duration: 320, easing: Easing.in(Easing.cubic) }),
      ),
    );
  }, [score, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (delta === null) return null;

  const isPositive = delta > 0;
  const label = `${isPositive ? '+' : ''}${delta}`;
  const bg = isPositive ? Colors.safeBg : Colors.cautionBg;
  const fg = isPositive ? Colors.safe : Colors.caution;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, animatedStyle]}
    >
      <View style={[styles.pill, { backgroundColor: bg }]}>
        <ThemedText style={[styles.text, { color: fg }]}>
          {label} {isPositive ? '✨' : '⚠️'}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

// Audit module 4 : mémoïsé comme tous ses frères du home. Ne dépend que de
// `score` (primitif) → ne re-render plus sur les updates parent non liés
// (welcome overlay, share sheet, more-tools) qui n'ont rien à voir avec lui.
export const GlowScoreDeltaToast = React.memo(GlowScoreDeltaToastImpl);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    zIndex: 100,
  },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    ...Shadows.soft,
  },
  text: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
