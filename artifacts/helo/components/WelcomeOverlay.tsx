import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ui/ThemedText";
import { Colors, Spacing } from "@/constants/theme";

interface Props {
  firstName?: string | null;
  onDismiss: () => void;
}

/**
 * Overlay "wow" affiché une fois après l'onboarding (premier accès au home).
 * Déclenché par AsyncStorage flag `@helo_show_welcome_overlay`.
 */
export function WelcomeOverlay({ firstName, onDismiss }: Props) {
  const sparkleScale = useSharedValue(0.5);
  const sparkleOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.6);

  useEffect(() => {
    sparkleScale.value = withSpring(1, { stiffness: 120, damping: 12 });
    sparkleOpacity.value = withTiming(1, { duration: 600 });
    ringScale.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.9, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );

    // Auto-dismiss après 4.5s si l'utilisateur ne touche pas
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  }, [sparkleScale, sparkleOpacity, ringScale, onDismiss]);

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkleScale.value }],
    opacity: sparkleOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const name = firstName?.trim();
  const greeting = name ? `Bienvenue dans Hēlo, ${name}.` : "Bienvenue dans Hēlo.";

  return (
    <Animated.View
      entering={FadeIn.duration(350)}
      exiting={FadeOut.duration(450)}
      style={StyleSheet.absoluteFill}
      pointerEvents="auto"
    >
      <Pressable
        onPress={onDismiss}
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="Fermer l'accueil"
      >
        <LinearGradient
          colors={["rgba(38, 28, 12, 0.55)", "rgba(38, 28, 12, 0.85)"]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.center}>
          <Animated.View style={[styles.ring, ringStyle]} />
          <Animated.View style={[styles.sparkle, sparkleStyle]}>
            <ThemedText style={styles.sparkleEmoji}>✨</ThemedText>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(300).duration(500)} style={styles.textBlock}>
            <ThemedText
              variant="displayMedium"
              style={[styles.title, { color: "#FFFFFF" }]}
            >
              {greeting}
            </ThemedText>
            <ThemedText
              variant="bodyLarge"
              style={[styles.subtitle, { color: Colors.accentLight }]}
            >
              Ton placard t'attend.
            </ThemedText>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(900).duration(400)}>
            <ThemedText variant="bodySmall" style={styles.hint}>
              Toucher pour continuer
            </ThemedText>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.xl,
  },
  ring: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    opacity: 0.35,
    top: "30%",
  },
  sparkle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 250, 245, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(201, 169, 110, 0.35)",
  },
  sparkleEmoji: {
    fontSize: 56,
  },
  textBlock: {
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  title: {
    textAlign: "center",
    lineHeight: 36,
  },
  subtitle: {
    textAlign: "center",
  },
  hint: {
    color: "rgba(255, 255, 255, 0.55)",
    marginTop: Spacing.massive,
  },
});
