/**
 * Lot 15A1 — Modale "Setup terminé" affichée APRÈS le 1er verdict de scan.
 *
 * Pourquoi : avant ce lot, le flow onboarding s'arrêtait silencieusement
 * sur l'écran verdict du 1er scan. L'utilisatrice ne savait pas qu'elle
 * avait "terminé" le setup, ni vers quoi se diriger ensuite. Résultat :
 * abandon ou confusion ("c'est quoi cette app ? je fais quoi maintenant ?").
 *
 * Cette modale :
 *   • Célèbre le moment (haptique + animation entrante)
 *   • Donne un mini-tour des 4 onglets clés
 *   • Propose une action claire ("Découvrir mon placard →")
 *   • Se déclenche UNE SEULE FOIS (drapeau AsyncStorage `firstScanCompleted`)
 *
 * Trigger : verdict/[scanId].tsx vérifie `pendingFirstScan === '1'`
 * au mount + une fois que le verdict est chargé, monte cette modale et
 * persiste `firstScanCompleted = '1'` pour ne plus jamais re-show.
 */

import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

interface OnboardingCompleteModalProps {
  visible: boolean;
  onClose: () => void;
  /** Optional — used to personalize the celebration headline */
  firstName?: string | null;
}

type TabInfo = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
};

const TABS_TOUR: TabInfo[] = [
  {
    icon: 'camera',
    title: 'Scanner',
    description: 'Code-barres, ingrédients, menu de resto.',
  },
  {
    icon: 'archive',
    title: 'Mon placard',
    description: 'Tout ce que tu as scanné, organisé par pièce.',
  },
  {
    icon: 'message-circle',
    title: 'Chat IA',
    description: 'Pose toutes tes questions à la Sage-Femme IA.',
  },
  {
    icon: 'user',
    title: 'Profil',
    description: 'Préférences, partenaire, mode bébé.',
  },
];

export function OnboardingCompleteModal({
  visible,
  onClose,
  firstName,
}: OnboardingCompleteModalProps) {
  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [visible]);

  const handleDiscoverShelf = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onClose();
    // replace pour empêcher un retour back vers la modale
    router.replace('/(tabs)/shelf');
  };

  const handleContinue = () => {
    Haptics.selectionAsync().catch(() => {});
    onClose();
  };

  const heroLine = firstName
    ? `Bravo ${firstName} ! Ton premier scan est dans ton placard.`
    : 'Bravo ! Ton premier scan est dans ton placard.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(160)}
        style={styles.backdrop}
      >
        <Animated.View
          entering={ZoomIn.duration(380).springify().damping(14)}
          style={styles.card}
        >
          {/* Hero confetti emoji + gradient halo */}
          <LinearGradient
            colors={[Colors.accentLight, Colors.surface]}
            style={styles.heroBg}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <Animated.View entering={ZoomIn.delay(120).duration(420)}>
              <ThemedText style={styles.heroEmoji}>🎉</ThemedText>
            </Animated.View>
            <ThemedText variant="headlineLarge" color="textPrimary" style={styles.heroTitle}>
              Setup terminé !
            </ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary" style={styles.heroSub}>
              {heroLine}
            </ThemedText>
          </LinearGradient>

          {/* Mini-tour des 4 onglets */}
          <View style={styles.tour}>
            <ThemedText variant="labelSmall" color="textTertiary" style={styles.tourTitle}>
              VOICI CE QUE TU PEUX FAIRE
            </ThemedText>

            {TABS_TOUR.map((tab, index) => (
              <Animated.View
                key={tab.title}
                entering={FadeInDown.delay(220 + index * 70).duration(380)}
                style={styles.tabRow}
              >
                <View style={styles.tabIconWrap}>
                  <Feather name={tab.icon} size={18} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="labelLarge" color="textPrimary">
                    {tab.title}
                  </ThemedText>
                  <ThemedText variant="bodySmall" color="textTertiary">
                    {tab.description}
                  </ThemedText>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* CTAs */}
          <Animated.View
            entering={FadeInDown.delay(560).duration(360)}
            style={styles.actions}
          >
            <Pressable
              onPress={handleDiscoverShelf}
              accessibilityRole="button"
              accessibilityLabel="Découvrir mon placard"
              style={({ pressed }) => [
                styles.primaryBtn,
                { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <ThemedText style={styles.primaryBtnText}>
                Découvrir mon placard
              </ThemedText>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </Pressable>

            <Pressable
              onPress={handleContinue}
              accessibilityRole="button"
              accessibilityLabel="Rester sur ce produit"
              hitSlop={12}
              style={styles.secondaryBtn}
            >
              <ThemedText variant="bodyMedium" color="textTertiary" style={styles.secondaryBtnText}>
                Rester sur ce produit
              </ThemedText>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 18, 16, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.soft,
  },
  heroBg: {
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroEmoji: {
    fontSize: 56,
    lineHeight: 64,
  },
  heroTitle: {
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  heroSub: {
    textAlign: 'center',
    maxWidth: 280,
  },
  tour: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  tourTitle: {
    letterSpacing: 1.2,
    marginBottom: Spacing.xs,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  tabIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  primaryBtn: {
    height: 54,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accentDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.soft,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  secondaryBtnText: {
    textAlign: 'center',
  },
});
