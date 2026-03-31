import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radius } from '@/constants/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// ── Core shimmer ──────────────────────────────────────────────────────────────

export function SkeletonShimmer({
  width = '100%',
  height = 16,
  borderRadius = Radius.sm,
  style,
}: SkeletonProps) {
  const shimmerX = useSharedValue(0);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmerX.value, [0, 1], [-300, 300]) },
    ],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: Colors.borderLight,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, animStyle]}>
        <LinearGradient
          colors={[Colors.borderLight, Colors.accentLight, Colors.borderLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

// ── Preset: Card ──────────────────────────────────────────────────────────────

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonShimmer height={20} width="60%" borderRadius={Radius.sm} />
      <SkeletonShimmer height={14} width="90%" borderRadius={Radius.sm} style={{ marginTop: 8 }} />
      <SkeletonShimmer height={14} width="75%" borderRadius={Radius.sm} style={{ marginTop: 6 }} />
    </View>
  );
}

// ── Preset: Row ───────────────────────────────────────────────────────────────

export function SkeletonRow({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.row, style]}>
      <SkeletonShimmer width={48} height={48} borderRadius={Radius.full} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonShimmer height={16} width="70%" borderRadius={Radius.sm} />
        <SkeletonShimmer height={12} width="50%" borderRadius={Radius.sm} />
      </View>
    </View>
  );
}

// ── Preset: Scan result ───────────────────────────────────────────────────────

export function SkeletonScanResult({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, { padding: 20, gap: 12 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <SkeletonShimmer width={56} height={56} borderRadius={Radius.md} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonShimmer height={18} width="80%" borderRadius={Radius.sm} />
          <SkeletonShimmer height={14} width="55%" borderRadius={Radius.sm} />
        </View>
      </View>
      <SkeletonShimmer height={44} borderRadius={Radius.xl} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
  },
});
