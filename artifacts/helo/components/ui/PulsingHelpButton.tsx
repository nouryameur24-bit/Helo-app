import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { IconButton } from "@/components/ui/IconButton";
import { Colors } from "@/constants/theme";

interface Props {
  onPress: () => void;
  size?: number;
  iconSize?: number;
  iconColor?: string;
  /** Couleur du halo qui pulse derrière le bouton */
  haloColor?: string;
  /** Couleur de fond du bouton lui-même */
  backgroundColor?: string;
  accessibilityLabel?: string;
}

/**
 * Bouton "aide" qui pulse en continu pour attirer l'œil des nouveaux
 * utilisateurs. Halo doré qui respire + léger scale (1 → 1.06).
 * S'utilise partout où on a un point d'entrée vers le Guide.
 */
export function PulsingHelpButton({
  onPress,
  size = 44,
  iconSize = 20,
  iconColor = Colors.textSecondary,
  haloColor = Colors.accent,
  backgroundColor,
  accessibilityLabel = "Guide",
}: Props) {
  const haloScale = useSharedValue(1);
  const haloOpacity = useSharedValue(0.55);
  const btnScale = useSharedValue(1);

  useEffect(() => {
    haloScale.value = withRepeat(
      withSequence(
        withTiming(1.45, { duration: 1500, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    haloOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1500, easing: Easing.out(Easing.quad) }),
        withTiming(0.55, { duration: 0 }),
      ),
      -1,
      false,
    );
    btnScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [haloScale, haloOpacity, btnScale]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: haloScale.value }],
    opacity: haloOpacity.value,
  }));

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: haloColor,
          },
          haloStyle,
        ]}
      />
      <Animated.View style={btnStyle}>
        <IconButton
          size={size}
          onPress={onPress}
          accessibilityLabel={accessibilityLabel}
          backgroundColor={backgroundColor}
        >
          <Feather name="help-circle" size={iconSize} color={iconColor} />
        </IconButton>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
  },
});
