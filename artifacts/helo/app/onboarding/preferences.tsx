import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { ThemedText } from "@/components/ui/ThemedText";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { saveUserPreferences } from "@/lib/userPreferences";

type SectionKey = "allergies" | "dietary" | "cosmetic";

interface Section {
  key: SectionKey;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  options: string[];
}

const NONE_LABEL = "Aucune";

const SECTIONS: Section[] = [
  {
    key: "allergies",
    title: "Allergies / intolérances",
    subtitle: "On signalera ces ingrédients en priorité.",
    icon: "alert-circle",
    options: [
      "Lait",
      "Oeuf",
      "Gluten",
      "Soja",
      "Arachide",
      "Fruits à coque",
      "Sésame",
      "Poisson",
      "Crustacés",
      NONE_LABEL,
    ],
  },
  {
    key: "dietary",
    title: "Restrictions alimentaires",
    subtitle: "Tes choix de table au quotidien.",
    icon: "coffee",
    options: [
      "Végétarien",
      "Végan",
      "Halal",
      "Casher",
      "Sans porc",
      "Sans sucre",
      "Sans gluten",
      NONE_LABEL,
    ],
  },
  {
    key: "cosmetic",
    title: "Sensibilités cosmétiques",
    subtitle: "Ce que ta peau préfère éviter.",
    icon: "droplet",
    options: [
      "Parfum",
      "Alcool",
      "Huiles essentielles",
      "Sulfates",
      "Parabens",
      NONE_LABEL,
    ],
  },
];

export default function PreferencesScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [allergies, setAllergies] = useState<Set<string>>(new Set());
  const [dietary, setDietary] = useState<Set<string>>(new Set());
  const [cosmetic, setCosmetic] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const sectionState = (key: SectionKey): [Set<string>, React.Dispatch<React.SetStateAction<Set<string>>>] => {
    if (key === "allergies") return [allergies, setAllergies];
    if (key === "dietary") return [dietary, setDietary];
    return [cosmetic, setCosmetic];
  };

  const toggleOption = (key: SectionKey, option: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const [current, setter] = sectionState(key);
    setter(() => {
      const next = new Set(current);
      // "Aucune" is mutually exclusive with the other chips.
      if (option === NONE_LABEL) {
        if (next.has(NONE_LABEL)) {
          next.delete(NONE_LABEL);
        } else {
          next.clear();
          next.add(NONE_LABEL);
        }
      } else {
        next.delete(NONE_LABEL);
        if (next.has(option)) {
          next.delete(option);
        } else {
          next.add(option);
        }
      }
      return next;
    });
  };

  const buildPayload = () => ({
    // Drop "Aucune" before persisting — it is purely a UI signal that the user
    // confirmed they have no entries in that section (≡ empty array).
    allergies: Array.from(allergies).filter((v) => v !== NONE_LABEL),
    dietary: Array.from(dietary).filter((v) => v !== NONE_LABEL),
    cosmetic_sensitivities: Array.from(cosmetic).filter((v) => v !== NONE_LABEL),
  });

  const persistAndNext = async (payload: ReturnType<typeof buildPayload>) => {
    setLoading(true);
    try {
      await saveUserPreferences(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/onboarding/first-scan");
    } catch (err: unknown) {
      if (__DEV__) console.error("[onboarding/preferences] save failed:", err instanceof Error ? err.message : err);
      Alert.alert("Erreur", "Impossible de sauvegarder vos préférences. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    await persistAndNext(buildPayload());
  };

  const handleSkip = async () => {
    Haptics.selectionAsync();
    // Skip still persists an empty preferences record so downstream code
    // can distinguish "user skipped" from "never opened".
    await persistAndNext({
      allergies: [],
      dietary: [],
      cosmetic_sensitivities: [],
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPadding + Spacing.xl,
          paddingBottom: bottomPadding + Spacing.xxl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Step indicator (profile done, preferences active, first-scan next) */}
      <Animated.View entering={FadeIn.delay(0).duration(400)} style={styles.stepRow}>
        <View style={[styles.stepDot, styles.stepDotDone]}>
          <Feather name="check" size={10} color="#fff" />
        </View>
        <LinearGradient
          colors={[Colors.accent, Colors.accentDark]}
          style={styles.stepLine}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
        <View style={[styles.stepDot, styles.stepDotDone]}>
          <Feather name="check" size={10} color="#fff" />
        </View>
        <LinearGradient
          colors={[Colors.accent, Colors.accentDark]}
          style={styles.stepLine}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
        <View style={[styles.stepDot, styles.stepDotActive]}>
          <Feather name="sliders" size={10} color="#fff" />
        </View>
      </Animated.View>

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(60).duration(350)} style={styles.header}>
        <ThemedText variant="displayMedium" color="textPrimary">
          Tes préférences
        </ThemedText>
        <ThemedText variant="bodyLarge" color="textSecondary" style={{ marginTop: Spacing.sm }}>
          Quelques détails pour mieux te protéger. Tu pourras modifier à tout moment.
        </ThemedText>
      </Animated.View>

      {/* Sections */}
      {SECTIONS.map((section, sectionIndex) => {
        const [selected] = sectionState(section.key);
        return (
          <Animated.View
            key={section.key}
            entering={FadeInDown.delay(120 + sectionIndex * 80).duration(350)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Feather name={section.icon} size={16} color={Colors.accentDark} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="labelLarge" color="textPrimary">
                  {section.title}
                </ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
                  {section.subtitle}
                </ThemedText>
              </View>
            </View>

            <View style={styles.chipsRow}>
              {section.options.map((option) => {
                const active = selected.has(option);
                return (
                  <Pressable
                    key={option}
                    onPress={() => toggleOption(section.key, option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={option}
                    style={[
                      styles.chip,
                      active ? styles.chipActive : styles.chipInactive,
                    ]}
                  >
                    {active && (
                      <Feather
                        name="check"
                        size={12}
                        color={Colors.accentDark}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text
                      style={[
                        styles.chipLabel,
                        { color: active ? Colors.accentDark : Colors.textSecondary },
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        );
      })}

      {/* CTA */}
      <Animated.View entering={FadeInDown.delay(380).duration(350)} style={styles.ctaBlock}>
        <Pressable
          onPress={handleSkip}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Passer cette étape"
          disabled={loading}
        >
          <ThemedText variant="bodyMedium" color="textTertiary" style={styles.skipText}>
            Passer pour l'instant
          </ThemedText>
        </Pressable>

        <Button
          variant="primary"
          fullWidth
          onPress={handleSubmit}
          loading={loading}
        >
          Continuer
        </Button>

        <Divider style={{ marginVertical: Spacing.lg }} />

        <ThemedText variant="bodySmall" color="textTertiary" style={styles.disclaimer}>
          Tes données restent sur ton appareil.
        </ThemedText>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xxl,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  stepDotDone: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  stepDotActive: {
    backgroundColor: Colors.accentDark,
    borderColor: Colors.accentDark,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
  },
  header: {
    gap: Spacing.xs,
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  chipActive: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  chipInactive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  chipLabel: {
    ...Typography.labelLarge,
    fontSize: 13,
  },
  ctaBlock: {
    gap: Spacing.md,
  },
  skipText: {
    textAlign: "center",
    paddingVertical: Spacing.sm,
  },
  disclaimer: {
    lineHeight: 18,
    textAlign: "center",
  },
});
