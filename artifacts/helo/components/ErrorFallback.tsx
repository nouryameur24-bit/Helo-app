import { Feather } from "@expo/vector-icons";
import { reloadAppAsync } from "expo";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ui/ThemedText";
import { Colors, Radius, Shadows, Spacing } from "@/constants/theme";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch {
      resetError();
    }
  };

  const formatErrorDetails = (): string => {
    let details = `Error: ${error.message}\n\n`;
    if (error.stack) {
      details += `Stack Trace:\n${error.stack}`;
    }
    return details;
  };

  const monoFont = Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {__DEV__ ? (
        <Pressable
          onPress={() => setIsModalVisible(true)}
          accessibilityLabel="Voir les détails de l'erreur"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.devButton,
            { top: insets.top + 16, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="alert-circle" size={18} color={Colors.textSecondary} />
        </Pressable>
      ) : null}

      <Animated.View entering={FadeInUp.delay(100).duration(600)} style={styles.illustrationWrap}>
        <View style={styles.illustrationCircle}>
          <ThemedText style={styles.illustrationEmoji}>🌿</ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.content}>
        <ThemedText variant="headlineLarge" color="textPrimary" style={styles.title}>
          Un instant…
        </ThemedText>
        <ThemedText variant="bodyMedium" color="textSecondary" style={styles.message}>
          Une petite erreur s'est glissée. Rechargez l'application pour continuer en douceur.
        </ThemedText>

        <Pressable
          onPress={handleRestart}
          style={({ pressed }) => [
            styles.button,
            { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
        >
          <ThemedText variant="labelLarge" style={styles.buttonText}>
            Réessayer
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={resetError}
          style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <ThemedText variant="bodySmall" color="textTertiary">
            Ignorer et continuer
          </ThemedText>
        </Pressable>
      </Animated.View>

      {__DEV__ ? (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <ThemedText variant="headlineMedium" color="textPrimary">
                  Détails de l'erreur
                </ThemedText>
                <Pressable accessibilityRole="button" accessibilityLabel="Fermer"
                  onPress={() => setIsModalVisible(false)}
                  style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Feather name="x" size={24} color={Colors.textPrimary} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={[styles.modalScrollContent, { paddingBottom: insets.bottom + 16 }]}
                showsVerticalScrollIndicator
              >
                <View style={styles.errorContainer}>
                  <Text
                    style={[styles.errorText, { fontFamily: monoFont }]}
                    selectable
                  >
                    {formatErrorDetails()}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  illustrationWrap: {
    marginBottom: Spacing.xl,
  },
  illustrationCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.soft,
  },
  illustrationEmoji: {
    fontSize: 44,
  },
  content: {
    alignItems: "center",
    gap: Spacing.md,
    maxWidth: 340,
    width: "100%",
  },
  title: {
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    lineHeight: 24,
  },
  button: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: Radius.xl,
    marginTop: Spacing.sm,
    minWidth: 200,
    alignItems: "center",
    ...Shadows.medium,
  },
  buttonText: {
    color: Colors.surface,
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  devButton: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(45, 41, 38, 0.4)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    width: "100%",
    height: "90%",
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: Spacing.lg,
  },
  errorContainer: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
});
