/**
 * ScanViewfinder — CornerBracket, FlashingViewfinder et ScanOverlay.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radius } from '@/constants/theme';
import { CORNER_SIZE, CORNER_THICKNESS, OVERLAY_COLOR } from './scanConstants';

// ─── CornerBracket ────────────────────────────────────────────────────────────
interface CornerBracketProps {
  position: 'tl' | 'tr' | 'bl' | 'br';
  color: string;
}

export function CornerBracket({ position, color }: CornerBracketProps) {
  const isTop = position === 'tl' || position === 'tr';
  const isLeft = position === 'tl' || position === 'bl';
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: CORNER_SIZE,
        height: CORNER_SIZE,
        top: isTop ? 0 : undefined,
        bottom: isTop ? undefined : 0,
        left: isLeft ? 0 : undefined,
        right: isLeft ? undefined : 0,
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: CORNER_SIZE,
          height: CORNER_THICKNESS,
          backgroundColor: color,
          top: isTop ? 0 : undefined,
          bottom: isTop ? undefined : 0,
          left: 0,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: CORNER_THICKNESS,
          height: CORNER_SIZE,
          backgroundColor: color,
          top: 0,
          left: isLeft ? 0 : undefined,
          right: isLeft ? undefined : 0,
        }}
      />
    </View>
  );
}

// ─── FlashingViewfinder ───────────────────────────────────────────────────────
interface FlashingViewfinderProps {
  flashColor: SharedValue<number>;
}

export function FlashingViewfinder({ flashColor }: FlashingViewfinderProps) {
  const pulseOpacity = useSharedValue(0.5);

  React.useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 1000 }), withTiming(0.5, { duration: 1000 })),
      -1,
      false,
    );
  }, [pulseOpacity]);

  const borderStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    borderColor: interpolateColor(flashColor.value, [0, 1], [Colors.accent, Colors.safe]),
  }));
  const accentStyle = useAnimatedStyle(() => ({ opacity: 1 - flashColor.value }));
  const safeStyle = useAnimatedStyle(() => ({ opacity: flashColor.value }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, vf.border, borderStyle]} />
      <Animated.View style={[StyleSheet.absoluteFill, accentStyle]}>
        <CornerBracket position="tl" color={Colors.accent} />
        <CornerBracket position="tr" color={Colors.accent} />
        <CornerBracket position="bl" color={Colors.accent} />
        <CornerBracket position="br" color={Colors.accent} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, safeStyle]}>
        <CornerBracket position="tl" color={Colors.safe} />
        <CornerBracket position="tr" color={Colors.safe} />
        <CornerBracket position="bl" color={Colors.safe} />
        <CornerBracket position="br" color={Colors.safe} />
      </Animated.View>
    </View>
  );
}

// ─── ScanOverlay ──────────────────────────────────────────────────────────────
interface ScanOverlayProps {
  vfX: number;
  vfY: number;
  vfW: number;
  vfH: number;
}

export function ScanOverlay({ vfX, vfY, vfW, vfH }: ScanOverlayProps) {
  return (
    <>
      <View pointerEvents="none" style={[vf.strip, { top: 0, left: 0, right: 0, height: vfY }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY_COLOR }]} />
      </View>
      <View pointerEvents="none" style={[vf.strip, { top: vfY + vfH, left: 0, right: 0, bottom: 0 }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY_COLOR }]} />
      </View>
      <View pointerEvents="none" style={[vf.strip, { top: vfY, left: 0, width: vfX, height: vfH }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY_COLOR }]} />
      </View>
      <View pointerEvents="none" style={[vf.strip, { top: vfY, left: vfX + vfW, right: 0, height: vfH }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY_COLOR }]} />
      </View>
    </>
  );
}

const vf = StyleSheet.create({
  strip: { position: 'absolute' },
  border: { borderWidth: 1.5, borderRadius: Radius.sm },
});
