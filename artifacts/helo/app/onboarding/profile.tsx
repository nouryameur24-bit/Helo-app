import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
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
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { track, identify } from '@/lib/analytics';
import {
  firstNameSchema,
  formatDueDateInput,
  onboardingProfileSchema,
  parseDueDate,
} from "@/lib/validation/profileOnboarding";

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

// Date parsing & format validation live in `@/lib/validation/profileOnboarding`
// (Zod schema). We just consume `parseDueDate` here.

const TRIMESTER_LABELS: Record<number, string> = {
  1: "1er trimestre",
  2: "2e trimestre",
  3: "3e trimestre",
};

// Taille du bébé par semaine — pour le bloc preview personnalisé du nouvel onboarding.
function babyFruitForWeek(week: number): { name: string; emoji: string; article: string } {
  if (week <= 7)  return { name: 'myrtille',  emoji: '🫐', article: 'e' };
  if (week <= 10) return { name: 'fraise',    emoji: '🍓', article: 'e' };
  if (week <= 13) return { name: 'prune',     emoji: '🟣', article: 'e' };
  if (week <= 16) return { name: 'avocat',    emoji: '🥑', article: '' };
  if (week <= 19) return { name: 'mangue',    emoji: '🥭', article: 'e' };
  if (week <= 22) return { name: 'banane',    emoji: '🍌', article: 'e' };
  if (week <= 26) return { name: 'aubergine', emoji: '🍆', article: 'e' };
  if (week <= 30) return { name: 'noix de coco', emoji: '🥥', article: 'e' };
  if (week <= 34) return { name: 'ananas',    emoji: '🍍', article: '' };
  if (week <= 37) return { name: 'melon',     emoji: '🍈', article: '' };
  return            { name: 'pastèque',  emoji: '🍉', article: 'e' };
}

const AVOID_LIST = [
  'Rétinol',
  'Acide salicylique haute concentration',
  'Listeria (fromages au lait cru)',
  'Mercure (gros poissons)',
];

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

  const parsedDate = parseDueDate(dueDateRaw);
  const trimesterInfo = parsedDate ? computeTrimester(parsedDate) : null;
  const firstNameValid = firstNameSchema.safeParse(firstName).success;

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

  const handleDueDateChange = (text: string) => {
    setDueDateRaw(formatDueDateInput(text));
  };

  const isValid = firstNameValid && parsedDate !== null;

  const handleSubmit = async () => {
    // Final defence-in-depth Zod parse — guards against any way a caller
    // (e.g. autofilled value or future refactor) could bypass the live checks.
    const validation = onboardingProfileSchema.safeParse({
      firstName,
      dueDate: dueDateRaw,
    });
    if (!validation.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Formulaire incomplet',
        validation.error.issues.map((i) => `• ${i.message}`).join('\n'),
      );
      return;
    }
    const { firstName: cleanFirstName, dueDate: cleanDueDate } = validation.data;
    setLoading(true);
    try {
      const partnerCode = generatePartnerCode();
      const profile = {
        firstName: cleanFirstName,
        dueDate: cleanDueDate.toISOString(),
        trimester: trimesterInfo?.trimester ?? null,
        categories: Array.from(selectedCategories),
        createdAt: new Date().toISOString(),
        partnerCode,
      };

      // ── 1. Save locally first — this is the source of truth ──────────────────
      await AsyncStorage.multiSet([
        ["onboarding_completed", "true"],
        [STORAGE_KEYS.profile, JSON.stringify(profile)],
      ]);

      // ── 2. Navigate immediately — app works offline ───────────────────────────
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      track('onboarding_step_completed', {
        step: 'profile',
        trimester: trimesterInfo?.trimester ?? null,
        categories: Array.from(selectedCategories),
      }).catch(() => {});
      // Slide 5 : collecte des préférences (allergies / régime / sensibilités)
      // avant l'invitation au premier scan.
      router.replace("/onboarding/preferences");

      // ── 3. Sync to Supabase in the background (non-blocking) ─────────────────
      getOrCreateUserId().then((userId) => {
        identify(userId, {
          $set: { first_name: cleanFirstName, trimester: trimesterInfo?.trimester ?? null },
          $set_once: { onboarding_completed_at: new Date().toISOString() },
        }).catch(() => {});
        upsertProfile({
          userId,
          firstName: cleanFirstName,
          dueDate: cleanDueDate.toISOString().split("T")[0],
          trimester: trimesterInfo?.trimester ?? null,
          partnerCode,
        }).catch((err) => {
          if (__DEV__) console.error('[onboarding] Supabase upsert failed:', err?.message ?? err);
        });
      }).catch((err) => {
        if (__DEV__) console.error('[onboarding] getOrCreateUserId failed:', err?.message ?? err);
      });

    } catch (err: unknown) {
      if (__DEV__) console.error('[onboarding] handleSubmit error:', err instanceof Error ? err.message : err);
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
        {/* Step indicator */}
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
          <View style={[styles.stepDot, styles.stepDotActive]}>
            <Feather name="user" size={10} color="#fff" />
          </View>
          <View style={styles.stepLineEmpty} />
          <View style={styles.stepDot} />
        </Animated.View>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(60).duration(350)} style={styles.header}>
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

          {/* Personalized preview — apparaît une fois la date validée */}
          {trimesterInfo && parsedDate && (
            <Animated.View entering={FadeInDown.duration(300)} style={previewStyles.card}>
              <ThemedText variant="bodyLarge" color="textPrimary" style={previewStyles.headline}>
                {(() => {
                  const wks = Math.max(1, 40 - trimesterInfo.weeksLeft);
                  const fruit = babyFruitForWeek(wks);
                  return `À ${wks} semaines, ton bébé a la taille d'un${fruit.article} ${fruit.name} ${fruit.emoji}`;
                })()}
              </ThemedText>
              <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.sm }}>
                Voici ce qu'on va éviter ensemble :
              </ThemedText>
              <View style={{ gap: 6, marginTop: Spacing.sm }}>
                {AVOID_LIST.map((item) => (
                  <View key={item} style={previewStyles.avoidRow}>
                    <View style={previewStyles.avoidDot} />
                    <ThemedText variant="bodyMedium" color="textPrimary">{item}</ThemedText>
                  </View>
                ))}
              </View>
              <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: Spacing.md, fontStyle: 'italic' }}>
                Hēlo détecte tout ça automatiquement.
              </ThemedText>
            </Animated.View>
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
  stepLineEmpty: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 4,
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

const previewStyles = StyleSheet.create({
  card: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accent + '33',
  },
  headline: {
    fontWeight: '600',
    lineHeight: 24,
  },
  avoidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avoidDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
});
