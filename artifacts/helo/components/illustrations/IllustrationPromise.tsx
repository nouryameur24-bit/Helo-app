import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path, Rect, G } from "react-native-svg";
import { Colors } from "@/constants/theme";

interface Props {
  size?: number;
}

/**
 * Slide 2 — THE PROMISE
 * Code-barres statique en SVG + un beam de scan animé (Animated.View jaune)
 * qui balaie verticalement, et un badge "✓" qui apparaît en pulsation douce.
 */
export function IllustrationPromise({ size = 230 }: Props) {
  const beamY = useSharedValue(0);
  const badgeOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(0.92);

  useEffect(() => {
    beamY.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    badgeOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
    badgeScale.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [beamY, badgeOpacity, badgeScale]);

  // Le beam descend de y=83 (en SVG units) sur ~50 units → en px : * size/230
  const beamStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: beamY.value * (size * (50 / 230)) }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [{ scale: badgeScale.value }],
  }));

  // Positions du beam (mêmes coordonnées que dans le SVG, converties en px)
  const px = (n: number) => (n / 230) * size;

  return (
    <View style={[{ width: size, height: size }, styles.root]}>
      <Svg width={size} height={size} viewBox="0 0 230 230" style={StyleSheet.absoluteFill}>
        {/* Fond doux */}
        <Circle cx="115" cy="115" r="108" fill={Colors.accentLight} opacity="0.4" />

        {/* Carte produit */}
        <Rect x="50" y="70" width="130" height="80" rx="10" fill={Colors.surface} stroke={Colors.borderLight} strokeWidth="1.5" />

        {/* Barres du code-barres */}
        <G>
          {[60, 64, 70, 76, 80, 86, 92, 96, 102, 108, 114, 118, 124, 130, 136, 142, 148, 154, 160, 166].map((x, i) => (
            <Rect
              key={i}
              x={x}
              y="85"
              width={i % 3 === 0 ? 3 : i % 2 === 0 ? 1.5 : 2}
              height="50"
              fill={Colors.textPrimary}
              opacity="0.85"
            />
          ))}
        </G>
      </Svg>

      {/* Beam animé (Animated.View) — par-dessus le SVG */}
      <Animated.View
        style={[
          styles.beam,
          {
            top: px(83),
            left: px(50),
            width: px(130),
            height: px(4),
            backgroundColor: Colors.accent,
          },
          beamStyle,
        ]}
      />

      {/* Badge "Compatible" — bulle verte avec check */}
      <Animated.View
        style={[
          styles.badge,
          {
            top: px(160),
            left: px(70),
            width: px(90),
            height: px(34),
            borderRadius: px(17),
            backgroundColor: Colors.safe,
          },
          badgeStyle,
        ]}
      >
        <Svg width={px(90)} height={px(34)} viewBox="0 0 90 34">
          <Path
            d="M 17 18 L 23 24 L 33 12"
            stroke="#FFFFFF"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Rect x="41" y="13" width="42" height="3" rx="1.5" fill="#FFFFFF" />
          <Rect x="41" y="20" width="32" height="3" rx="1.5" fill="#FFFFFF" opacity="0.7" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  beam: {
    position: "absolute",
    shadowColor: "#C9A96E",
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  badge: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});
