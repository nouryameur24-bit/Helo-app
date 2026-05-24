/**
 * AnimatedMeshGradient — "Mesh-like" gradient animé pour les hero surfaces.
 *
 * Pourquoi pas react-native-skia (vrai mesh gradient) : 4Mo+ de bundle,
 * complexe à setup avec Expo Go. Solution pragmatique : 2-3 LinearGradient
 * superposés qui se déplacent en boucle infinie subtilement → impression
 * de masse colorée vivante sans casser le palette warm/cream/gold.
 *
 * Usage :
 *   <AnimatedMeshGradient
 *     colors={[Colors.accentLight, '#e8c98a', Colors.accentLight]}
 *     style={styles.hero}
 *   >
 *     {...content...}
 *   </AnimatedMeshGradient>
 */

import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  /** 2-3 couleurs warm idéalement. */
  colors: readonly [string, string, ...string[]];
  /** Container style (size + radius). Inner content fills via children. */
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function AnimatedMeshGradient({ colors, style, children }: Props) {
  // 2 blobs qui se déplacent en boucle infinie sur des axes opposés.
  // Vitesse lente (~6-8s/cycle) pour rester subtile et pas distraire.
  const blob1Translate = useSharedValue(0);
  const blob2Translate = useSharedValue(0);

  useEffect(() => {
    blob1Translate.value = withRepeat(
      withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true, // reverse → ping-pong au lieu de saut
    );
    blob2Translate.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [blob1Translate, blob2Translate]);

  const blob1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: -40 + blob1Translate.value * 80 },
      { translateY: -20 + blob1Translate.value * 40 },
    ],
  }));

  const blob2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: 40 - blob2Translate.value * 80 },
      { translateY: 20 - blob2Translate.value * 40 },
    ],
  }));

  // Construction des couleurs des 3 blobs depuis le palette fourni.
  // base = LinearGradient fond plein
  // blob1 = radial-like via gradient en diagonale, accent plus chaud
  // blob2 = idem en miroir, accent plus clair
  const base = colors;
  const accentWarm = colors[colors.length - 1];
  const accentLight = colors[0];

  return (
    <View style={[styles.container, style]}>
      {/* Layer 1 — base gradient (statique, occupe tout) */}
      <LinearGradient
        colors={base}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Layer 2 — blob warm qui glisse en diagonale */}
      <Animated.View style={[styles.blob, blob1Style]}>
        <LinearGradient
          colors={[`${accentWarm}99`, `${accentWarm}00`]}
          style={styles.blobInner}
          start={{ x: 0.2, y: 0.2 }}
          end={{ x: 0.8, y: 0.8 }}
        />
      </Animated.View>

      {/* Layer 3 — blob clair en miroir */}
      <Animated.View style={[styles.blob, styles.blobMirror, blob2Style]}>
        <LinearGradient
          colors={[`${accentLight}AA`, `${accentLight}00`]}
          style={styles.blobInner}
          start={{ x: 0.8, y: 0.2 }}
          end={{ x: 0.2, y: 0.8 }}
        />
      </Animated.View>

      {/* Content au-dessus */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  blob: {
    position: 'absolute',
    width: '140%',
    height: '140%',
    top: '-20%',
    left: '-20%',
  },
  blobMirror: {
    top: '-20%',
    right: '-20%',
    left: undefined,
  },
  blobInner: {
    flex: 1,
    borderRadius: 500,
  },
  content: {
    flex: 1,
  },
});
