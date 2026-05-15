import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { getGlowLabel } from '@/lib/glowscore';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface GlowScoreCircleProps {
  score: number;
  size?: 'large' | 'small';
  animated?: boolean;
  empty?: boolean;
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

export function GlowScoreCircle({
  score,
  size = 'large',
  animated = true,
  empty = false,
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
        <ThemedText
          variant={config.labelVariant}
          style={{ color: textColor, marginTop: 2 }}
        >
          {glowLabel.label}
        </ThemedText>
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
