import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { CIRCLE_RADIUS, CIRCLE_STROKE, CIRCUMFERENCE, getVerdictBg } from './verdictHelpers';
import styles from './verdictStyles';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function LoadingScreen() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withTiming(1.15, { duration: 900 });
    opacity.value = withTiming(1, { duration: 900 });
    const interval = setInterval(() => {
      scale.value = withTiming(scale.value > 1.05 ? 1 : 1.15, { duration: 900 });
      opacity.value = withTiming(opacity.value > 0.8 ? 0.6 : 1, { duration: 900 });
    }, 900);
    return () => clearInterval(interval);
  }, [scale, opacity]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <View style={styles.loadingRoot}>
      <Animated.View style={[styles.loadingCircle, animStyle]} />
      <ThemedText variant="bodyMedium" color="textSecondary" style={styles.loadingText}>
        Analyse en cours…
      </ThemedText>
    </View>
  );
}

/**
 * ScoreCircle — Moment 1 (v1.1 brief, déc. 2025)
 *
 * Séquence de révélation (~900 ms total) :
 *   0 ms    : wrapper s'affiche (opacity 0 → 1, 400 ms)
 *   200 ms  : trait fin se trace autour du cercle (stroke 0 → 1, 600 ms)
 *   650 ms  : chiffre apparaît avec léger scale-up (0.85 → 1, 250 ms)
 *   800 ms  : halo coloré pulse une fois (scale 1 → 1.08 → 1, opacity → 0.55 → 0.3)
 *
 * Référence : animation de fermeture des anneaux Apple Watch.
 * Le halo donne du volume sans alourdir la palette crème/sable de Hēlo —
 * sa couleur est dérivée de `getVerdictBg` (safeBg / cautionBg / dangerBg).
 */
export function ScoreCircle({
  score,
  color,
  verdict,
  onAnimDone,
}: {
  score: number;
  color: string;
  verdict?: 'safe' | 'caution' | 'danger' | string;
  onAnimDone: () => void;
}) {
  const circleOpacity = useSharedValue(0);
  const strokeProgress = useSharedValue(0);
  const scoreOpacity = useSharedValue(0);
  const scoreScale = useSharedValue(0.85);
  const haloOpacity = useSharedValue(0);
  const haloScale = useSharedValue(1);

  const haloColor = getVerdictBg(verdict);

  const circleStyle = useAnimatedStyle(() => ({ opacity: circleOpacity.value }));

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - strokeProgress.value),
  }));

  const scoreStyle = useAnimatedStyle(() => ({
    opacity: scoreOpacity.value,
    transform: [{ scale: scoreScale.value }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  useEffect(() => {
    circleOpacity.value = withTiming(1, { duration: 400 });
    strokeProgress.value = withDelay(
      200,
      withTiming(1, { duration: 600 }, (finished) => {
        if (finished) {
          scoreOpacity.value = withTiming(1, { duration: 250 });
          scoreScale.value = withTiming(1, { duration: 250 });
          haloOpacity.value = withDelay(
            150,
            withSequence(
              withTiming(0.55, { duration: 250 }),
              withTiming(0.3, { duration: 350 }, (f2) => {
                if (f2) runOnJS(onAnimDone)();
              }),
            ),
          );
          haloScale.value = withDelay(
            150,
            withSequence(
              withTiming(1.08, { duration: 250 }),
              withTiming(1, { duration: 350 }),
            ),
          );
        }
      }),
    );
  }, [circleOpacity, strokeProgress, scoreOpacity, scoreScale, haloOpacity, haloScale, onAnimDone]);

  const wrapperSize = (CIRCLE_RADIUS + CIRCLE_STROKE) * 2;
  const haloSize = wrapperSize * 1.45;
  const haloOffset = (wrapperSize - haloSize) / 2;

  return (
    <Animated.View style={[styles.scoreCircleWrapper, circleStyle]}>
      {/* Halo dynamique — concentrique au cercle de score (top/left négatifs pour centrer) */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: haloOffset,
            left: haloOffset,
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            backgroundColor: haloColor,
          },
          haloStyle,
        ]}
      />
      <Svg width={wrapperSize} height={wrapperSize}>
        <Circle
          cx={CIRCLE_RADIUS + CIRCLE_STROKE}
          cy={CIRCLE_RADIUS + CIRCLE_STROKE}
          r={CIRCLE_RADIUS}
          stroke={Colors.borderLight}
          strokeWidth={CIRCLE_STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={CIRCLE_RADIUS + CIRCLE_STROKE}
          cy={CIRCLE_RADIUS + CIRCLE_STROKE}
          r={CIRCLE_RADIUS}
          stroke={color}
          strokeWidth={CIRCLE_STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeLinecap="round"
          rotation="-90"
          origin={`${CIRCLE_RADIUS + CIRCLE_STROKE}, ${CIRCLE_RADIUS + CIRCLE_STROKE}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <Animated.View style={[styles.scoreCenter, scoreStyle]}>
        <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
      </Animated.View>
    </Animated.View>
  );
}

export function VerdictLabel({ label, color, visible }: { label: string; color: string; visible: boolean }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);
  useEffect(() => {
    if (visible) {
      opacity.value = withDelay(0, withTiming(1, { duration: 250 }));
      translateY.value = withDelay(0, withTiming(0, { duration: 250 }));
    }
  }, [visible, opacity, translateY]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return (
    <Animated.View style={style}>
      <Text style={[styles.verdictLabel, { color }]}>{label}</Text>
    </Animated.View>
  );
}

export function Toast({ visible, message }: { visible: boolean; message: string }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);
  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(-20, { duration: 300 });
    }
  }, [visible, opacity, translateY]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return (
    <Animated.View style={[styles.toast, style]} pointerEvents="none">
      <Feather name="check-circle" size={16} color="#fff" style={{ marginRight: 8 }} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}
