import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ui/ThemedText";
import { Colors } from "@/constants/theme";

/**
 * IllustrationTrimesterAnimated — Moment 2 (v1.1 brief, déc. 2025)
 *
 * Variante animée de IllustrationTrimester, utilisée uniquement dans le
 * slide « Adapté à ton trimestre » de l'onboarding.
 *
 * Trois effets cumulés :
 *  1) Apparition séquentielle — chaque cercle entre l'un après l'autre
 *     (200 ms de décalage) avec un léger bounce (FadeInDown + ressort).
 *  2) Mise en avant adaptative — un cercle « highlighted » à la fois
 *     (scale 1.10, opacité 1) ; les deux autres restent à 0.6.
 *     L'index cycle T1 → T2 → T3 toutes les 1.8 s pour démontrer le
 *     concept d'adaptation (le trimestre réel est inconnu à ce stade
 *     de l'onboarding — la sélection survient à l'étape profil).
 *  3) Particules dorées — 4 points qui flottent doucement autour des
 *     cercles. Ajoute de la vie sans agressivité.
 *
 * Props :
 *  - size : largeur/hauteur en px (défaut 230, comme les autres slides).
 *  - isActive : déclenche l'animation cyclée quand le slide est visible.
 *  - fixedHighlight : si défini (0|1|2), désactive le cycle et fige le
 *    highlight. Utile pour figer la T1/T2/T3 réelle de l'utilisatrice
 *    une fois le profil rempli (réutilisation post-onboarding).
 */
type Highlight = 0 | 1 | 2;

interface Props {
  size?: number;
  isActive?: boolean;
  fixedHighlight?: Highlight;
}

const VIEWBOX = 220;
const CYCLE_MS = 1800;

const CIRCLES: { key: string; label: string; weeks: string; cx: number; r: number }[] = [
  { key: "T1", label: "T1", weeks: "1–12 SA", cx: 55, r: 32 },
  { key: "T2", label: "T2", weeks: "13–26 SA", cx: 110, r: 40 },
  { key: "T3", label: "T3", weeks: "27–40 SA", cx: 170, r: 36 },
];

const PARTICLES: { x: number; y: number; r: number; delay: number; amplitude: number; durationMs: number }[] = [
  { x: 78, y: 60, r: 3, delay: 0, amplitude: 8, durationMs: 3200 },
  { x: 142, y: 56, r: 2.5, delay: 600, amplitude: 10, durationMs: 3600 },
  { x: 32, y: 150, r: 2, delay: 1200, amplitude: 6, durationMs: 2800 },
  { x: 188, y: 156, r: 3, delay: 400, amplitude: 9, durationMs: 3400 },
];

function AnimatedCircleGroup({
  index,
  circle,
  highlighted,
  scale,
}: {
  index: number;
  circle: (typeof CIRCLES)[number];
  highlighted: boolean;
  scale: number;
}) {
  const opacityV = useSharedValue(highlighted ? 1 : 0.6);
  const scaleV = useSharedValue(highlighted ? 1.1 : 1);

  useEffect(() => {
    opacityV.value = withTiming(highlighted ? 1 : 0.6, { duration: 350, easing: Easing.out(Easing.cubic) });
    scaleV.value = withSpring(highlighted ? 1.1 : 1, { stiffness: 140, damping: 16 });
  }, [highlighted, opacityV, scaleV]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacityV.value,
    transform: [{ scale: scaleV.value }],
  }));

  // Convert SVG coords to absolute px in our scaled box
  const px = (v: number) => v * scale;
  const outerD = px(circle.r * 2);
  const innerD = px(circle.r * 2 * 0.62);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 200)
        .duration(450)
        .springify()
        .damping(14)
        .mass(0.9)}
      style={[
        styles.circleAbsolute,
        {
          left: px(circle.cx) - outerD / 2,
          top: px(110) - outerD / 2,
          width: outerD,
          height: outerD,
        },
      ]}
    >
      <Animated.View style={[styles.circleInner, animStyle]}>
        <View
          style={[
            styles.outerRing,
            {
              width: outerD,
              height: outerD,
              borderRadius: outerD / 2,
              backgroundColor: Colors.accentLight,
              opacity: highlighted ? 0.55 : 0.35,
            },
          ]}
        />
        <View
          style={[
            styles.outerRing,
            {
              width: outerD,
              height: outerD,
              borderRadius: outerD / 2,
              borderWidth: highlighted ? 2 : 1.5,
              borderColor: highlighted ? Colors.accent : Colors.border,
            },
          ]}
        />
        <View
          style={[
            styles.innerDisc,
            {
              width: innerD,
              height: innerD,
              borderRadius: innerD / 2,
              backgroundColor: Colors.accent,
              opacity: highlighted ? 0.35 : 0.2,
            },
          ]}
        />
        <View style={styles.labelStack} pointerEvents="none">
          <ThemedText
            style={{
              fontSize: 11 * scale,
              fontWeight: "700",
              color: Colors.accentDark,
              letterSpacing: 0.5,
            }}
          >
            {circle.label}
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 9 * scale,
              color: Colors.textSecondary,
              marginTop: 1,
            }}
          >
            {circle.weeks}
          </ThemedText>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function FloatingParticle({
  p,
  scale,
  active,
}: {
  p: (typeof PARTICLES)[number];
  scale: number;
  active: boolean;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      translateY.value = 0;
      opacity.value = 0;
      return;
    }
    opacity.value = withTiming(0.7, { duration: 600 });
    translateY.value = withRepeat(
      withSequence(
        withTiming(-p.amplitude, {
          duration: p.durationMs / 2,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(p.amplitude, {
          duration: p.durationMs / 2,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      true,
    );
  }, [active, translateY, opacity, p.amplitude, p.durationMs]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const px = (v: number) => v * scale;
  const d = p.r * 2 * scale;

  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeInDown.delay(700 + p.delay).duration(500)}
      style={[
        {
          position: "absolute",
          left: px(p.x) - d / 2,
          top: px(p.y) - d / 2,
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: Colors.accent,
        },
        animStyle,
      ]}
    />
  );
}

export function IllustrationTrimesterAnimated({
  size = 230,
  isActive = true,
  fixedHighlight,
}: Props) {
  const scale = size / VIEWBOX;
  const [highlighted, setHighlighted] = useState<Highlight>(fixedHighlight ?? 1);

  // Sync state with prop changes (post-onboarding reuse: profile may resolve async).
  useEffect(() => {
    if (fixedHighlight !== undefined) setHighlighted(fixedHighlight);
  }, [fixedHighlight]);

  // Cycle the highlight T1 → T2 → T3 every CYCLE_MS while active and not fixed.
  useEffect(() => {
    if (!isActive || fixedHighlight !== undefined) return;
    const id = setInterval(() => {
      setHighlighted((h) => (((h + 1) % 3) as Highlight));
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [isActive, fixedHighlight]);

  const lineLeft = 45 * scale;
  const lineRight = 175 * scale;
  const lineTop = 110 * scale;

  return (
    <View style={{ width: size, height: size }}>
      {/* Dashed connecting line behind circles */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: lineLeft,
          top: lineTop,
          width: lineRight - lineLeft,
          height: 1.5,
          borderTopWidth: 1.5,
          borderColor: Colors.border,
          borderStyle: "dashed",
        }}
      />

      {/* Floating gold particles */}
      {PARTICLES.map((p, i) => (
        <FloatingParticle key={i} p={p} scale={scale} active={isActive} />
      ))}

      {/* Three circles with sequential entrance + highlight cycling */}
      {CIRCLES.map((circle, i) => (
        <AnimatedCircleGroup
          key={circle.key}
          index={i}
          circle={circle}
          highlighted={highlighted === i}
          scale={scale}
        />
      ))}

      {/* Bottom caption */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 170 * scale,
          alignItems: "center",
        }}
      >
        <ThemedText
          style={{
            fontSize: 10 * scale,
            color: Colors.textTertiary,
            letterSpacing: 0.8,
          }}
        >
          ÉVOLUTION PAR TRIMESTRE
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  circleAbsolute: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  circleInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  outerRing: {
    position: "absolute",
  },
  innerDisc: {
    position: "absolute",
  },
  labelStack: {
    alignItems: "center",
    justifyContent: "center",
  },
});
