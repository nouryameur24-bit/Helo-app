import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ui/ThemedText";
import { Colors, Radius, Spacing } from "@/constants/theme";

export default function RoleSelectionScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [selected, setSelected] = useState<"pregnant" | "partner" | null>(null);

  const handleSelect = async (role: "pregnant" | "partner") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(role);

    if (role === "pregnant") {
      await AsyncStorage.setItem("@helo_user_role", "pregnant");
      setTimeout(() => router.replace("/onboarding/profile"), 180);
    } else {
      await AsyncStorage.setItem("@helo_user_role", "partner");
      setTimeout(() => router.replace("/onboarding/partner-code"), 180);
    }
  };

  return (
    <View
      style={[
        styles.root,
        { paddingTop: topPadding + Spacing.huge, paddingBottom: bottomPadding + Spacing.xxl },
      ]}
    >
      <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.header}>
        <ThemedText variant="displayMedium" color="textPrimary" style={styles.title}>
          Bienvenue sur Hēlo
        </ThemedText>
        <ThemedText variant="bodyLarge" color="textSecondary" style={styles.subtitle}>
          Comment souhaitez-vous utiliser l'application ?
        </ThemedText>
      </Animated.View>

      <View style={styles.cards}>
        <Animated.View entering={FadeInDown.delay(120).duration(400)}>
          <Pressable
            style={[
              styles.card,
              selected === "pregnant" && styles.cardSelected,
            ]}
            onPress={() => handleSelect("pregnant")}
            android_ripple={{ color: Colors.accentLight }}
          >
            <ThemedText style={styles.cardEmoji}>🤰</ThemedText>
            <View style={styles.cardText}>
              <ThemedText variant="headlineMedium" color="textPrimary">
                Je suis enceinte
              </ThemedText>
              <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: 4 }}>
                Créez votre profil et analysez vos produits au quotidien.
              </ThemedText>
            </View>
            <View
              style={[
                styles.radioOuter,
                selected === "pregnant" && styles.radioOuterSelected,
              ]}
            >
              {selected === "pregnant" && <View style={styles.radioInner} />}
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Pressable
            style={[
              styles.card,
              selected === "partner" && styles.cardSelected,
            ]}
            onPress={() => handleSelect("partner")}
            android_ripple={{ color: Colors.accentLight }}
          >
            <ThemedText style={styles.cardEmoji}>💙</ThemedText>
            <View style={styles.cardText}>
              <ThemedText variant="headlineMedium" color="textPrimary">
                J'accompagne
              </ThemedText>
              <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: 4 }}>
                Scannez des produits pour votre proche et suivez son placard.
              </ThemedText>
            </View>
            <View
              style={[
                styles.radioOuter,
                selected === "partner" && styles.radioOuterSelected,
              ]}
            >
              {selected === "partner" && <View style={styles.radioInner} />}
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.huge,
  },
  header: {
    gap: Spacing.md,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 26,
  },
  cards: {
    gap: Spacing.lg,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  cardSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  cardEmoji: {
    fontSize: 36,
  },
  cardText: {
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: Colors.accent,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.accent,
  },
});
