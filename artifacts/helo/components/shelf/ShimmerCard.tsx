import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radius, Spacing } from '@/constants/theme';

export function ShimmerCard() {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.4, 0.8]),
  }));

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.imagePlaceholder, animatedStyle]} />
      <View style={styles.info}>
        <Animated.View style={[styles.textLine, styles.textLong, animatedStyle]} />
        <Animated.View style={[styles.textLine, styles.textShort, animatedStyle]} />
      </View>
      <View style={styles.footer}>
        <Animated.View style={[styles.badgePlaceholder, animatedStyle]} />
        <Animated.View style={[styles.iconPlaceholder, animatedStyle]} />
      </View>
    </View>
  );
}

const SHIMMER_COLOR = Colors.accentLight;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: SHIMMER_COLOR,
  },
  info: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: 6,
  },
  textLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: SHIMMER_COLOR,
  },
  textLong: {
    width: '80%',
  },
  textShort: {
    width: '50%',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  badgePlaceholder: {
    width: 60,
    height: 22,
    borderRadius: 11,
    backgroundColor: SHIMMER_COLOR,
  },
  iconPlaceholder: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: SHIMMER_COLOR,
  },
});
