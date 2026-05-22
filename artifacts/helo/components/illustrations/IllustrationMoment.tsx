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
import Svg, { Circle, Ellipse, Path, Rect, G, Defs, RadialGradient, Stop } from "react-native-svg";
import { Colors } from "@/constants/theme";

interface Props {
  size?: number;
}

/**
 * Slide 1 — THE MOMENT
 * Silhouette stylisée d'une femme regardant un produit. Halo doré qui respire
 * derrière elle (animé via Animated.View, le SVG reste statique).
 */
export function IllustrationMoment({ size = 230 }: Props) {
  const haloScale = useSharedValue(1);
  const star1 = useSharedValue(0.4);
  const star2 = useSharedValue(0.7);

  useEffect(() => {
    haloScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    star1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400 }),
        withTiming(0.3, { duration: 1400 }),
      ),
      -1,
      false,
    );
    star2.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: 1600 }),
          withTiming(1, { duration: 1600 }),
        ),
        -1,
        false,
      ),
    );
  }, [haloScale, star1, star2]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: haloScale.value }],
    opacity: 0.6,
  }));
  const star1Style = useAnimatedStyle(() => ({ opacity: star1.value }));
  const star2Style = useAnimatedStyle(() => ({ opacity: star2.value }));

  const dim = { width: size, height: size };

  return (
    <View style={[dim, styles.root]}>
      {/* Halo doré animé en arrière-plan (Animated.View, pas dans le SVG) */}
      <Animated.View
        style={[
          styles.halo,
          {
            width: size * 0.62,
            height: size * 0.62,
            borderRadius: size * 0.31,
            top: size * 0.16,
            left: size * 0.19,
            backgroundColor: Colors.accent,
          },
          haloStyle,
        ]}
      />

      {/* Étoiles scintillantes */}
      <Animated.View style={[styles.star, { top: size * 0.21, left: size * 0.18 }, star1Style]} />
      <Animated.View style={[styles.star, { top: size * 0.18, right: size * 0.18 }, star2Style]} />
      <Animated.View style={[styles.star, { bottom: size * 0.45, right: size * 0.06 }, star1Style]} />
      <Animated.View style={[styles.star, { bottom: size * 0.4, left: size * 0.06 }, star2Style]} />

      {/* SVG statique : silhouette + flacon */}
      <Svg width={size} height={size} viewBox="0 0 230 230" style={styles.svg}>
        <Defs>
          <RadialGradient id="nightBg" cx="50%" cy="50%" r="60%">
            <Stop offset="0%" stopColor="#FFF7EC" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FFEBC8" stopOpacity="0.5" />
          </RadialGradient>
        </Defs>

        <Circle cx="115" cy="115" r="108" fill="url(#nightBg)" />

        {/* Silhouette femme */}
        <G>
          {/* Cheveux longs */}
          <Path
            d="M 88 75 Q 78 88 80 115 Q 82 138 92 148 L 100 152 L 100 95 Q 92 80 88 75 Z"
            fill={Colors.textPrimary}
            opacity="0.85"
          />
          {/* Visage de profil */}
          <Ellipse cx="108" cy="92" rx="14" ry="17" fill="#E8C9A5" />
          {/* Cou */}
          <Rect x="105" y="105" width="8" height="10" fill="#E8C9A5" />
          {/* Buste/pull crème */}
          <Path
            d="M 85 118 Q 90 115 105 115 L 120 115 Q 135 115 138 122 L 142 155 Q 138 168 115 168 Q 90 168 85 158 Z"
            fill={Colors.surface}
            stroke={Colors.borderLight}
            strokeWidth="1"
          />
          {/* Ventre arrondi (grossesse) */}
          <Path
            d="M 110 130 Q 142 130 144 150 Q 140 165 118 165 Q 108 162 108 145 Z"
            fill={Colors.accentLight}
            opacity="0.7"
          />
          {/* Bras qui tient le flacon */}
          <Path
            d="M 122 125 Q 145 130 152 142 L 148 148 Q 138 142 122 138 Z"
            fill={Colors.surface}
            stroke={Colors.borderLight}
            strokeWidth="1"
          />
        </G>

        {/* Flacon dans la main */}
        <G>
          <Circle cx="158" cy="148" r="22" fill={Colors.accent} opacity="0.18" />
          <Rect x="150" y="138" width="16" height="22" rx="2" fill={Colors.surface} stroke={Colors.accentDark} strokeWidth="1.2" />
          <Rect x="152" y="133" width="12" height="5" rx="1" fill={Colors.accentDark} />
          <Rect x="152" y="144" width="12" height="9" fill={Colors.accentLight} />
          <Rect x="153" y="146" width="10" height="0.8" fill={Colors.textTertiary} opacity="0.6" />
          <Rect x="153" y="148" width="8" height="0.8" fill={Colors.textTertiary} opacity="0.6" />
          <Rect x="153" y="150" width="9" height="0.8" fill={Colors.textTertiary} opacity="0.6" />
        </G>

        {/* Point d'interrogation discret — le doute */}
        <G opacity="0.7">
          <Path
            d="M 170 115 Q 170 108 176 108 Q 182 108 182 114 Q 182 119 176 121 L 176 124"
            stroke={Colors.accentDark}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <Circle cx="176" cy="129" r="1.3" fill={Colors.accentDark} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  halo: {
    position: "absolute",
  },
  star: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#A88B4A",
  },
});
