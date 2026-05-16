import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { getGlowLabel } from '@/lib/glowscore';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface GlowBreakdown {
  safe: number;
  caution: number;
  danger: number;
}

interface GlowScoreCircleProps {
  score: number;
  size?: 'large' | 'small';
  animated?: boolean;
  empty?: boolean;
  /**
   * Moment 3 (brief v1.1) — pétales radiales autour du cercle.
   * 3 segments (Sûrs / Vigilance / À risque) dont la longueur est
   * proportionnelle à la part de chaque catégorie. Visible uniquement
   * en `size='large'`. Opt-in pour ne pas casser les usages existants.
   */
  breakdown?: GlowBreakdown;
  /**
   * Moment 3 (brief v1.1) — halo qui respire (~3.5s par cycle) derrière
   * le cercle. Donne l'impression d'un score "vivant". Opt-in.
   */
  breathing?: boolean;
}

const CONFIG = {
  large: {
    diameter: 200,
    strokeWidth: 10,
    scoreVariant: 'displayLarge' as const,
    labelVariant: 'labelSmall' as const,
  },
  small: {
    diameter: 60,
    strokeWidth: 4,
    scoreVariant: 'headlineMedium' as const,
    labelVariant: 'labelSmall' as const,
  },
};

// ── Petals ──────────────────────────────────────────────────────────────────
// Modèle d'ancrage radial : un « stem » 0×0 placé au centre du wrapper sert
// de pivot ; la pétale enfant est positionnée à `top: ringRadius + GAP` puis
// croît vers le bas (height animée) dans le repère du stem. Une fois le stem
// pivoté de θ°, la croissance s'étend toujours vers l'extérieur radial,
// sans déplacer le point d'ancrage interne (proche de l'anneau).
//
// Convention θ (rotation horaire depuis le bas) :
//   - 180° → pétale qui pointe vers le haut  (Sûrs)
//   - 300° → pétale qui pointe en bas-droite (Vigilance)
//   -  60° → pétale qui pointe en bas-gauche (À risque)
const PETAL_ROTATIONS_DEG = [180, 300, 60];
const PETAL_GAP = 6;
const PETAL_BASE_LEN = 10;
const PETAL_MAX_EXTRA = 26;
const PETAL_WIDTH = 8;
const PETAL_EXTENT = PETAL_GAP + PETAL_BASE_LEN + PETAL_MAX_EXTRA;

function Petal({
  ratio,
  rotationDeg,
  color,
  ringRadius,
  center,
  delayMs,
  active,
}: {
  ratio: number; // 0..1
  rotationDeg: number;
  color: string;
  ringRadius: number;
  center: number;
  delayMs: number;
  active: boolean;
}) {
  const opacity = useSharedValue(0);
  const lenSv = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      opacity.value = 0;
      lenSv.value = 0;
      return;
    }
    opacity.value = withDelay(delayMs, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    lenSv.value = withDelay(
      delayMs,
      withTiming(PETAL_BASE_LEN + ratio * PETAL_MAX_EXTRA, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [active, ratio, delayMs, opacity, lenSv]);

  const petalStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    height: lenSv.value,
  }));

  // Stem 0×0 au centre du wrapper, pivoté de rotationDeg.
  // L'enfant Petal est positionné top: ringRadius+GAP, donc sa pointe interne
  // reste fixe pendant que sa hauteur croît vers l'extérieur radial.
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: center,
        top: center,
        width: 0,
        height: 0,
        transform: [{ rotate: `${rotationDeg}deg` }],
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: ringRadius + PETAL_GAP,
            left: -PETAL_WIDTH / 2,
            width: PETAL_WIDTH,
            borderRadius: PETAL_WIDTH / 2,
            backgroundColor: color,
          },
          petalStyle,
        ]}
      />
    </View>
  );
}

export function GlowScoreCircle({
  score,
  size = 'large',
  animated = true,
  empty = false,
  breakdown,
  breathing = false,
}: GlowScoreCircleProps) {
  const config = CONFIG[size];
  const { diameter, strokeWidth } = config;

  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = diameter / 2;

  const glowLabel = getGlowLabel(score, !empty);
  const ringColor = empty ? Colors.borderLight : glowLabel.color;
  const textColor = empty ? Colors.textTertiary : glowLabel.color;
  const displayScore = empty ? '—' : String(score);

  const progress = useSharedValue(animated ? 0 : score / 100);

  useEffect(() => {
    if (animated) {
      progress.value = withTiming(score / 100, {
        duration: 1500,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = score / 100;
    }
  }, [score, animated]);

  const animatedProps = useAnimatedProps(() => {
    const offset = circumference * (1 - progress.value);
    return {
      strokeDashoffset: offset,
    };
  });

  // ── Breathing halo (large only) ─────────────────────────────────────────
  const haloScale = useSharedValue(1);
  const haloOpacity = useSharedValue(0);
  useEffect(() => {
    if (!breathing || size !== 'large' || empty) {
      // Stop the infinite loop and reset, sinon withRepeat continue à tourner
      // sur le thread UI même si le halo est invisible.
      cancelAnimation(haloScale);
      cancelAnimation(haloOpacity);
      haloOpacity.value = withTiming(0, { duration: 300 });
      haloScale.value = 1;
      return;
    }
    haloOpacity.value = withTiming(0.28, { duration: 800 });
    haloScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1750, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 1750, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(haloScale);
      cancelAnimation(haloOpacity);
    };
  }, [breathing, size, empty, haloOpacity, haloScale]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  if (size === 'small') {
    return (
      <View style={styles.container}>
        <Svg width={diameter} height={diameter} style={styles.svg}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={Colors.borderLight}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${center}, ${center}`}
          />
        </Svg>
        <View style={[styles.center, { width: diameter, height: diameter }]}>
          <ThemedText variant={config.scoreVariant} style={{ color: textColor }}>
            {displayScore}
          </ThemedText>
        </View>
      </View>
    );
  }

  // ── Large variant ────────────────────────────────────────────────────────
  const showPetals = !!breakdown && !empty;
  const total = breakdown ? breakdown.safe + breakdown.caution + breakdown.danger : 0;
  const ratios = breakdown && total > 0
    ? [breakdown.safe / total, breakdown.caution / total, breakdown.danger / total]
    : [0, 0, 0];
  const petalColors = [Colors.safe, Colors.caution, Colors.danger];

  const wrapperSize = diameter + (showPetals ? PETAL_EXTENT * 2 : 0);
  const wrapperCenter = wrapperSize / 2;
  const haloSize = diameter * 1.35;

  return (
    <View
      style={[
        styles.container,
        { width: wrapperSize, height: wrapperSize },
      ]}
    >
      {/* Breathing halo — derrière tout le reste */}
      {breathing && !empty && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: wrapperCenter - haloSize / 2,
              top: wrapperCenter - haloSize / 2,
              width: haloSize,
              height: haloSize,
              borderRadius: haloSize / 2,
              backgroundColor: ringColor,
            },
            haloStyle,
          ]}
        />
      )}

      {/* Petals layer — uses parent absolute coords; ringRadius is relative to wrapper center.
          Timing : démarre après que le tracé du cercle soit terminé (1500ms) + 900ms,
          puis stagger 120ms entre chaque pétale. */}
      {showPetals && PETAL_ROTATIONS_DEG.map((rot, i) => (
        <Petal
          key={i}
          ratio={ratios[i]}
          rotationDeg={rot}
          color={petalColors[i]}
          ringRadius={radius + strokeWidth / 2}
          center={wrapperCenter}
          delayMs={animated ? 1500 + 900 + i * 120 : i * 80}
          active={ratios[i] >= 0}
        />
      ))}

      {/* Existing ring + score, centered in wrapper */}
      <View
        style={{
          position: 'absolute',
          left: wrapperCenter - diameter / 2,
          top: wrapperCenter - diameter / 2,
          width: diameter,
          height: diameter,
        }}
      >
        <Svg width={diameter} height={diameter} style={styles.svg}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={Colors.borderLight}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${center}, ${center}`}
          />
        </Svg>
        <View style={[styles.center, { width: diameter, height: diameter }]}>
          <ThemedText variant={config.scoreVariant} style={{ color: textColor }}>
            {displayScore}
          </ThemedText>
          <ThemedText
            variant={config.labelVariant}
            style={{ color: textColor, marginTop: 2 }}
          >
            {glowLabel.label}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
