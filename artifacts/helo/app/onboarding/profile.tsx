import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { ThemedText } from "@/components/ui/ThemedText";
import { GENERAL_DISCLAIMER } from "@/constants/disclaimers";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { getOrCreateUserId } from "@/hooks/useProfile";
import { upsertProfile, generatePartnerCode } from "@/lib/partnerUtils";

type Category = "cosmetics" | "food" | "meds";

const CATEGORIES: { key: Category; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "cosmetics", label: "Cosmétiques & soins", icon: "droplet" },
  { key: "food", label: "Alimentation", icon: "coffee" },
  { key: "meds", label: "Médicaments", icon: "activity" },
];

function computeTrimester(dueDate: Date): { trimester: number; weeksLeft: number } | null {
  const now = new Date();
  const totalPregnancyWeeks = 40;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksUntilDue = (dueDate.getTime() - now.getTime()) / msPerWeek;
  if (weeksUntilDue < 0 || weeksUntilDue > totalPregnancyWeeks) return null;
  const weeksPregnant = Math.round(totalPregnancyWeeks - weeksUntilDue);
  const trimester = weeksPregnant <= 12 ? 1 : weeksPregnant <= 26 ? 2 : 3;
  return { trimester, weeksLeft: Math.round(weeksUntilDue) };
}

function parseDateInput(raw: string): Date | null {
  // Accept DD/MM/YYYY
  const parts = raw.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y || y < 2024 || y > 2027) return null;
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return null;
  return date;
}

const TRIMESTER_LABELS: Record<number, string> = {
  1: "1er trimestre",
  2: "2e trimestre",
  3: "3e trimestre",
};

const TRIMESTER_BADGE: Record<number, "accent" | "safe" | "caution"> = {
  1: "caution",
  2: "safe",
  3: "accent",
};

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [firstName, setFirstName] = useState("");
  const [dueDateRaw, setDueDateRaw] = useState("");
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [dueDateFocused, setDueDateFocused] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<Category>>(
    new Set(["cosmetics", "food", "meds"])
  );
  const [loading, setLoading] = useState(false);

  const parsedDate = parseDateInput(dueDateRaw);
  const trimesterInfo = parsedDate ? computeTrimester(parsedDate) : null;

  const toggleCategory = (key: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const formatDateInput = (raw: string) => {
    // Auto-insert slashes: DD/MM/YYYY
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + "/" + digits.slice(2);
    if (digits.length > 4) formatted = formatted.slice(0, 5) + "/" + formatted.slice(5);
    return formatted;
  };

  const handleDueDateChange = (text: string) => {
    setDueDateRaw(formatDateInput(text));
  };

  const isValid = firstName.trim().length >= 2 && parsedDate !== null;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const partnerCode = generatePartnerCode();
      const profile = {
        firstName: firstName.trim(),
        dueDate: parsedDate!.toISOString(),
        trimester: trimesterInfo?.trimester ?? null,
        categories: Array.from(selectedCategories),
        createdAt: new Date().toISOString(),
        partnerCode,
      };

      // ── 1. Save locally first — this is the source of truth ──────────────────
      await AsyncStorage.multiSet([
        ["onboarding_completed", "true"],
        ["user_profile", JSON.stringify(profile)],
      ]);

      // ── 2. Navigate immediately — app works offline ───────────────────────────
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");

      // ── 3. Sync to Supabase in the background (non-blocking) ─────────────────
      getOrCreateUserId().then((userId) => {
        upsertProfile({
          userId,
          firstName: firstName.trim(),
          dueDate: parsedDate!.toISOString().split("T")[0],
          trimester: trimesterInfo?.trimester ?? null,
          partnerCode,
        }).catch((err) => {
          console.error('[onboarding] Supabase upsert failed:', err?.message ?? err);
        });
      }).catch((err) => {
        console.error('[onboarding] getOrCreateUserId failed:', err?.message ?? err);
      });

    } catch (err: any) {
      console.error('[onboarding] handleSubmit error:', err?.message ?? err);
      Alert.alert("Erreur", "Impossible de sauvegarder votre profil localement. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPadding + Spacing.xl,
            paddingBottom: bottomPadding + Spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(350)} style={styles.header}>
          <ThemedText variant="displayMedium" color="textPrimary">
            Parlons de vous
          </ThemedText>
          <ThemedText variant="bodyLarge" color="textSecondary" style={{ marginTop: Spacing.sm }}>
            Quelques informations pour personnaliser votre expérience.
          </ThemedText>
        </Animated.View>

        {/* Prénom */}
        <Animated.View entering={FadeInDown.delay(80).duration(350)}>
          <ThemedText variant="labelLarge" color="textSecondary" style={styles.fieldLabel}>
            Prénom
          </ThemedText>
          <View
            style={[
              styles.inputWrapper,
              firstNameFocused && styles.inputFocused,
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="Votre prénom"
              placeholderTextColor={Colors.textTertiary}
              value={firstName}
              onChangeText={setFirstName}
              onFocus={() => setFirstNameFocused(true)}
              onBlur={() => setFirstNameFocused(false)}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
        </Animated.View>

        {/* Date d'accouchement */}
        <Animated.View entering={FadeInDown.delay(140).duration(350)}>
          <ThemedText variant="labelLarge" color="textSecondary" style={styles.fieldLabel}>
            Date prévue d'accouchement
          </ThemedText>
          <View
            style={[
              styles.inputWrapper,
              dueDateFocused && styles.inputFocused,
            ]}
          >
            <Feather name="calendar" size={18} color={dueDateFocused ? Colors.accent : Colors.textTertiary} style={{ marginRight: Spacing.md }} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="JJ/MM/AAAA"
              placeholderTextColor={Colors.textTertiary}
              value={dueDateRaw}
              onChangeText={handleDueDateChange}
              onFocus={() => setDueDateFocused(true)}
              onBlur={() => setDueDateFocused(false)}
              keyboardType="numeric"
              maxLength={10}
              returnKeyType="done"
            />
          </View>

          {/* Trimester badge */}
          {trimesterInfo && (
            <Animated.View entering={FadeInDown.duration(250)} style={styles.trimesterRow}>
              <Badge variant={TRIMESTER_BADGE[trimesterInfo.trimester]}>
                {TRIMESTER_LABELS[trimesterInfo.trimester]}
              </Badge>
              <ThemedText variant="bodySmall" color="textTertiary">
                {trimesterInfo.weeksLeft > 0
                  ? `${trimesterInfo.weeksLeft} semaines restantes`
                  : "Terme dépassé"}
              </ThemedText>
            </Animated.View>
          )}

          {dueDateRaw.length === 10 && !parsedDate && (
            <ThemedText variant="bodySmall" style={{ color: Colors.danger, marginTop: 6 }}>
              Date invalide. Format : JJ/MM/AAAA
            </ThemedText>
          )}
        </Animated.View>

        {/* Categories */}
        <Animated.View entering={FadeInDown.delay(200).duration(350)}>
          <ThemedText variant="labelLarge" color="textSecondary" style={styles.fieldLabel}>
            Ce qui m'intéresse
          </ThemedText>
          <View style={styles.chipsRow}>
            {CATEGORIES.map((cat) => {
              const active = selectedCategories.has(cat.key);
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => toggleCategory(cat.key)}
                  style={[
                    styles.chip,
                    active ? styles.chipActive : styles.chipInactive,
                  ]}
                >
                  <Feather
                    name={cat.icon}
                    size={14}
                    color={active ? Colors.accentDark : Colors.textTertiary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: active ? Colors.accentDark : Colors.textSecondary },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(260).duration(350)} style={styles.ctaBlock}>
          <Button
            variant="primary"
            fullWidth
            onPress={handleSubmit}
            disabled={!isValid}
            loading={loading}
          >
            Créer mon profil
          </Button>

          <Divider style={{ marginVertical: Spacing.lg }} />

          <ThemedText variant="bodySmall" color="textTertiary" style={styles.disclaimer}>
            {GENERAL_DISCLAIMER}
          </ThemedText>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xxl,
  },
  header: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
  },
  inputFocused: {
    borderColor: Colors.accent,
    backgroundColor: Colors.surfaceElevated,
  },
  input: {
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
    padding: 0,
    flex: 1,
  },
  trimesterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
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
    gap: 0,
  },
  disclaimer: {
    lineHeight: 18,
    textAlign: "center",
  },
});
