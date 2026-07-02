import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { Button } from "@/components/ui/Button";
import { ThemedText } from "@/components/ui/ThemedText";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { lookupPartnerCode, linkPartner } from "@/lib/partnerUtils";
import { getOrCreateUserId, setUserRole } from "@/hooks/useProfile";
import { STORAGE_KEYS } from '@/lib/storageKeys';

const CODE_LENGTH = 6;

export default function PartnerCodeScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  // `code` is route-param-injected by /partner-scan (or the helo://pair deep
  // link) after a successful QR read. We prefill the PIN inputs and submit
  // automatically — see the `useEffect` further down.
  const { code: prefilledCode } = useLocalSearchParams<{
    code?: string;
    source?: string;
  }>();
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [myFirstName, setMyFirstName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Array<TextInput | null>>(Array(CODE_LENGTH).fill(null));
  const shakeX = useSharedValue(0);
  // One-shot guard — the prefilled code should auto-submit on first paint only.
  // Without this, every re-render (e.g. typing in the name field after the QR
  // returns) would retrigger the submission flow.
  const autoSubmittedRef = useRef(false);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const handleChange = (index: number, text: string) => {
    const char = text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = char;
    setCode(newCode);
    setError(null);

    if (char && index < CODE_LENGTH - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = "";
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullCode = code.join("");
  const isComplete = fullCode.length === CODE_LENGTH;

  const submitCode = async (codeToSubmit: string) => {
    if (codeToSubmit.length !== CODE_LENGTH || loading) return;
    setLoading(true);
    setError(null);

    try {
      const result = await lookupPartnerCode(codeToSubmit);
      if (!result) {
        setError("Code invalide. Vérifie le code et réessaie.");
        triggerShake();
        setLoading(false);
        return;
      }

      const partnerUserId = await getOrCreateUserId();

      if (result.userId === partnerUserId) {
        setError("Tu ne peux pas te lier à ton propre compte.");
        triggerShake();
        setLoading(false);
        return;
      }

      try {
        await linkPartner(result.userId, partnerUserId);
      } catch (linkErr) {
        const msg = linkErr instanceof Error ? linkErr.message : '';
        if (msg.includes('unique') || msg.includes('duplicate')) {
          setError("Ce code est déjà lié à un autre partenaire. Demande-lui de régénérer son code.");
        } else {
          setError("Impossible de créer le lien. Réessaie.");
        }
        triggerShake();
        setLoading(false);
        return;
      }

      await setUserRole("partner", result.userId);
      await AsyncStorage.setItem(STORAGE_KEYS.linkedFirstName, result.firstName);
      await AsyncStorage.setItem(STORAGE_KEYS.linkedUserId, result.userId);
      if (myFirstName.trim()) {
        await AsyncStorage.setItem(STORAGE_KEYS.partnerFirstName, myFirstName.trim());
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/onboarding/partner-welcome");
    } catch (err) {
      setError("Une erreur est survenue. Réessaie.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!isComplete) return;
    void submitCode(fullCode);
  };

  // QR scan handoff — when /partner-scan pushes back to this screen with a
  // `code` param, prefill the PIN inputs and submit automatically. We funnel
  // through `submitCode` so an invalid (but well-formed) code still surfaces
  // the same shake + error UX as a manually-typed entry.
  useEffect(() => {
    if (autoSubmittedRef.current) return;
    if (!prefilledCode || typeof prefilledCode !== "string") return;
    const clean = prefilledCode
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, CODE_LENGTH);
    if (clean.length !== CODE_LENGTH) return;
    autoSubmittedRef.current = true;
    setCode(clean.split(""));
    void submitCode(clean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledCode]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.root,
          { paddingTop: topPadding + Spacing.huge },
        ]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ThemedText variant="bodyMedium" color="accent">← Retour</ThemedText>
        </Pressable>

        {/* Lot 15B4 — Progress "Étape 1 sur 3" pour situer l'utilisateur
            dans le flow de pairing partenaire (code → welcome → interests). */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={{ marginBottom: Spacing.lg }}>
          <OnboardingProgress step={1} total={3} label="Connexion partenaire" />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.header}>
          <ThemedText style={styles.emoji}>💙</ThemedText>
          <ThemedText variant="displayMedium" color="textPrimary" style={styles.title}>
            Entre le code
          </ThemedText>
          <ThemedText variant="bodyLarge" color="textSecondary" style={styles.subtitle}>
            Demande à ton proche de partager son code à 6 caractères depuis l'application.
          </ThemedText>
        </Animated.View>

        {Platform.OS !== "web" && (
          <Animated.View entering={FadeInDown.delay(40).duration(400)}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/partner-scan");
              }}
              style={({ pressed }) => [
                styles.scanCta,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Scanner le QR code de ma partenaire"
            >
              <View style={styles.scanCtaIcon}>
                <Feather name="maximize" size={18} color={Colors.accentDark} />
              </View>
              <View style={styles.scanCtaText}>
                <ThemedText variant="labelLarge" color="textPrimary">
                  Scanner le QR de ma partenaire
                </ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary">
                  Plus rapide que de taper le code
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <ThemedText
                variant="labelSmall"
                color="textTertiary"
                style={styles.dividerLabel}
              >
                OU SAISIR LE CODE
              </ThemedText>
              <View style={styles.dividerLine} />
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.nameField}>
          <ThemedText variant="labelSmall" color="textSecondary" style={styles.nameLabel}>
            Ton prénom
          </ThemedText>
          <TextInput
            style={styles.nameInput}
            value={myFirstName}
            onChangeText={setMyFirstName}
            placeholder="Ex : Thomas"
            placeholderTextColor={Colors.textTertiary}
            autoCorrect={false}
            returnKeyType="next"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={shakeStyle}>
          <View style={styles.pinRow}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputRefs.current[i] = ref; }}
                style={[
                  styles.pinBox,
                  code[i] ? styles.pinBoxFilled : styles.pinBoxEmpty,
                  error ? styles.pinBoxError : null,
                ]}
                value={code[i]}
                onChangeText={(text) => handleChange(i, text)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                maxLength={1}
                autoCapitalize="characters"
                keyboardType={Platform.OS === "ios" ? "default" : "visible-password"}
                autoFocus={i === 0}
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={isComplete ? handleSubmit : undefined}
              />
            ))}
          </View>

          {error && (
            <Animated.View entering={FadeInDown.duration(200)}>
              <ThemedText
                variant="bodySmall"
                style={{ color: Colors.danger, textAlign: "center", marginTop: Spacing.md }}
              >
                {error}
              </ThemedText>
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.cta}>
          <Button
            variant="primary"
            fullWidth
            onPress={handleSubmit}
            disabled={!isComplete}
            loading={loading}
          >
            Valider le code
          </Button>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xxxl,
  },
  backBtn: {
    alignSelf: "flex-start",
  },
  header: {
    alignItems: "center",
    gap: Spacing.md,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 26,
  },
  pinRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  pinBox: {
    width: 48,
    height: 60,
    borderRadius: Radius.md,
    borderWidth: 2,
    textAlign: "center",
    ...Typography.headlineLarge,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  pinBoxEmpty: {
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pinBoxFilled: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  pinBoxError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerLight,
  },
  cta: {
    width: "100%",
  },
  nameField: {
    gap: Spacing.sm,
  },
  nameLabel: {
    marginBottom: 2,
  },
  nameInput: {
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
  },
  scanCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  scanCtaIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  scanCtaText: {
    flex: 1,
    gap: 2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  dividerLabel: {
    letterSpacing: 1.2,
  },
});
