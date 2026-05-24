import { router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { PartnerQRCard } from '@/components/partner/PartnerQRCard';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';

/**
 * Full-screen share view for the pregnant user's partner code. The same UI is
 * embedded inline inside the profile screen via `PartnerQRCard`; this dedicated
 * route exists so we can deep-link to it from notifications, weekly briefs and
 * onboarding without bouncing through the profile tab.
 */
export default function PartnerShareScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const { partnerCode, isLoading, firstName } = useProfile();

  return (
    <View style={[styles.root, { paddingTop: topPadding }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={10}
        >
          <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
          <ThemedText variant="bodyMedium" color="textPrimary">
            Retour
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPadding + Spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(40).duration(400)} style={styles.header}>
          <ThemedText style={styles.emoji}>💙</ThemedText>
          <ThemedText variant="displayMedium" color="textPrimary" style={styles.title}>
            Inviter mon partenaire
          </ThemedText>
          <ThemedText variant="bodyLarge" color="textSecondary" style={styles.subtitle}>
            {firstName
              ? `${firstName}, montrez ce QR code à votre partenaire — un scan et vous êtes liés.`
              : 'Montrez ce QR code à votre partenaire — un scan et vous êtes liés.'}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(400)}>
          {partnerCode ? (
            <PartnerQRCard
              partnerCode={partnerCode}
              caption="Ouvrez Hēlo sur le téléphone de votre partenaire et scannez ce QR"
            />
          ) : (
            <View style={styles.emptyCard}>
              <Feather
                name={isLoading ? 'loader' : 'alert-circle'}
                size={28}
                color={Colors.textTertiary}
              />
              <ThemedText
                variant="bodyMedium"
                color="textTertiary"
                style={styles.emptyText}
              >
                {isLoading
                  ? 'Chargement de votre code…'
                  : "Votre code partenaire n'est pas encore disponible. Terminez d'abord votre profil."}
              </ThemedText>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.hintCard}>
          <View style={styles.hintHeader}>
            <Feather name="info" size={16} color={Colors.accentDark} />
            <ThemedText variant="labelLarge" color="textPrimary">
              Comment scanner ?
            </ThemedText>
          </View>
          <View style={styles.hintSteps}>
            <HintStep
              n={1}
              text="Votre partenaire installe Hēlo et choisit « J'accompagne »"
            />
            <HintStep n={2} text="Il appuie sur « Scanner le QR » sur son écran" />
            <HintStep n={3} text="Vous êtes liés instantanément" />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function HintStep({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.hintStep}>
      <View style={styles.hintStepNum}>
        <ThemedText variant="labelSmall" color="accentDark">
          {n}
        </ThemedText>
      </View>
      <ThemedText
        variant="bodyMedium"
        color="textSecondary"
        style={styles.hintStepText}
      >
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.md,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  emoji: {
    fontSize: 44,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.sm,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  hintCard: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  hintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  hintSteps: {
    gap: Spacing.sm,
  },
  hintStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  hintStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  hintStepText: {
    flex: 1,
    lineHeight: 20,
  },
});
