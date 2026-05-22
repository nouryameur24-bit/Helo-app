import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ui/ThemedText";
import { Colors, Radius, Spacing } from "@/constants/theme";

const WELCOME_FLAG = "@helo_show_welcome_overlay";

export default function FirstScanScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  // Pulsation du bouton scan principal
  const pulse = useSharedValue(1);
  const haloOpacity = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    haloOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [pulse, haloOpacity]);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: pulse.value * 1.15 }],
  }));

  const handleScan = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.setItem(WELCOME_FLAG, "1");
    router.replace("/(tabs)/scan");
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(WELCOME_FLAG, "1");
    router.replace("/(tabs)");
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: topPadding + Spacing.huge,
          paddingBottom: bottomPadding + Spacing.xxl,
        },
      ]}
    >
      <Animated.View entering={FadeInDown.delay(0).duration(450)} style={styles.header}>
        <ThemedText variant="displayMedium" color="textPrimary" style={styles.title}>
          Premier scan ?
        </ThemedText>
        <ThemedText variant="bodyLarge" color="textSecondary" style={styles.subtitle}>
          Prends un produit autour de toi.{"\n"}
          Un dentifrice, une crème, un yaourt.{"\n"}
          Scanne-le maintenant.
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(300).duration(500)} style={styles.scanWrap}>
        {/* Halo doré qui respire */}
        <Animated.View style={[styles.halo, haloStyle]} />

        {/* Bouton principal */}
        <Animated.View style={btnStyle}>
          <Pressable
            onPress={handleScan}
            accessibilityRole="button"
            accessibilityLabel="Scanner mon premier produit"
            style={({ pressed }) => [
              { borderRadius: 80, overflow: "hidden", opacity: pressed ? 0.92 : 1 },
            ]}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.accentDark]}
              style={styles.scanButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="camera" size={48} color="#FFFFFF" />
              <ThemedText style={styles.scanLabel}>Scanner mon{"\n"}premier produit</ThemedText>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.skipWrap}>
        <Pressable onPress={handleSkip} hitSlop={16} accessibilityRole="button" accessibilityLabel="Passer cette étape">
          <ThemedText variant="bodyMedium" color="textTertiary" style={styles.skipText}>
            Ou passer cette étape →
          </ThemedText>
        </Pressable>
        <ThemedText variant="bodySmall" color="textTertiary" style={styles.skipHint}>
          Quand tu seras prête, Hēlo sera là.
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    gap: Spacing.md,
    paddingTop: Spacing.xl,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 26,
  },
  scanWrap: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  halo: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.accentLight,
  },
  scanButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  scanLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 20,
  },
  skipWrap: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  skipText: {
    textAlign: "center",
    paddingVertical: Spacing.sm,
  },
  skipHint: {
    textAlign: "center",
    fontStyle: "italic",
    maxWidth: 260,
  },
});
