/**
 * Lot 15B6 — Écran "Coming Soon" pour les features feature-flagged off.
 *
 * Pourquoi : avant ce composant, les routes orphelines (pact, memories,
 * voice, arMirror, circle, community, scanParty) existaient en code mais
 * étaient feature-flagged à `false`. Si un utilisateur curieux tapait
 * `/pact` dans la barre d'URL OU si un deep link mal configuré pointait
 * vers ces routes, il atterrissait sur :
 *   • Un écran blanc figé (bad)
 *   • Une redirection silencieuse qui semble "cassée" (worse)
 *
 * Cet écran offre une UX claire :
 *   • Icône thématique + titre de la feature
 *   • Court teasing "Disponible en v1.2"
 *   • Bouton "Revenir à l'accueil" qui route explicitement
 *
 * Usage typique en haut des fichiers de routes orphelines :
 * ```tsx
 * if (!isFeatureEnabled('pact')) {
 *   return <ComingSoonScreen
 *     title="Le Pacte Hēlo"
 *     subtitle="Disponible en v1.2"
 *     emoji="🤝"
 *   />;
 * }
 * ```
 */

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

interface ComingSoonScreenProps {
  title: string;
  /** Subtitle line, ex: "Disponible en v1.2" */
  subtitle?: string;
  /** Big emoji or icon to set the mood */
  emoji?: string;
  /** Optional alternative icon (Feather) if no emoji preferred */
  icon?: keyof typeof Feather.glyphMap;
  /** Short pitch — 1-2 sentences max */
  description?: string;
}

const DEFAULT_DESC = "Cette fonctionnalité arrive bientôt. Hēlo se construit pas à pas — merci de ta patience.";

export function ComingSoonScreen({
  title,
  subtitle = 'Bientôt disponible',
  emoji,
  icon = 'clock',
  description = DEFAULT_DESC,
}: ComingSoonScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const handleHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.root, { paddingTop: topPadding + Spacing.xl }]}>
      {/* Top close button */}
      <Animated.View entering={FadeIn.duration(280)} style={styles.topBar}>
        <Pressable
          onPress={handleHome}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          hitSlop={12}
          style={({ pressed }) => [
            styles.closeBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="x" size={22} color={Colors.textPrimary} />
        </Pressable>
      </Animated.View>

      <View style={styles.center}>
        <Animated.View entering={ZoomIn.duration(420).springify().damping(12)}>
          {emoji ? (
            <ThemedText style={styles.emoji}>{emoji}</ThemedText>
          ) : (
            <View style={styles.iconWrap}>
              <Feather name={icon} size={48} color={Colors.accentDark} />
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(420)}>
          <ThemedText variant="labelSmall" style={styles.badge}>
            {subtitle.toUpperCase()}
          </ThemedText>
          <ThemedText variant="displayMedium" color="textPrimary" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText variant="bodyLarge" color="textSecondary" style={styles.description}>
            {description}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(380)}>
          <Pressable
            onPress={handleHome}
            accessibilityRole="button"
            accessibilityLabel="Revenir à l'accueil"
            style={({ pressed }) => [
              styles.cta,
              { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <Feather name="arrow-left" size={18} color="#FFFFFF" />
            <ThemedText style={styles.ctaText}>Revenir à l'accueil</ThemedText>
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
  },
  topBar: {
    alignItems: 'flex-end',
    marginBottom: Spacing.xl,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  emoji: {
    fontSize: 72,
    lineHeight: 84,
    textAlign: 'center',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    color: Colors.accentDark,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 24,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentDark,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    marginTop: Spacing.xl,
    ...Shadows.soft,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
