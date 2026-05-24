/**
 * Lot 16-01 — EmptyState component réutilisable.
 *
 * Pourquoi : sans contenu, plusieurs écrans paraissaient "cassés" pour
 * un user qui débarque (Chat vide → écran blanc ; Mon Placard vide →
 * écran vide ; Recent Scans vide → section absente sans explication).
 * Le user pense "ya un bug" plutôt que "j'ai juste pas encore agi".
 *
 * Ce composant pose une UX systématique pour tous les empty states :
 *   • Emoji ou icône thématique (haut visuel)
 *   • Titre court (1 ligne)
 *   • Sous-titre explicatif (1-2 lignes max)
 *   • CTA optionnel pour amorcer l'action
 *   • Suggestions optionnelles (chips/prompts) — utile pour Chat
 *
 * Pattern voulu : 80% "pourquoi c'est vide", 20% "que faire ?".
 */

import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

export interface EmptyStateSuggestion {
  /** Texte de la chip / prompt. Affiché tel quel. */
  label: string;
  /** Callback au tap. */
  onPress: () => void;
}

interface EmptyStateProps {
  /** Emoji prioritaire (visuel chaud). Ex: "📦" pour placard vide. */
  emoji?: string;
  /** Fallback icon Feather si pas d'emoji. */
  icon?: keyof typeof Feather.glyphMap;
  /** Titre court (1 ligne idéale). */
  title: string;
  /** Sous-titre explicatif (1-2 lignes). */
  subtitle?: string;
  /** CTA principal optionnel. */
  ctaLabel?: string;
  /** Callback du CTA. */
  onCta?: () => void;
  /** Suggestions cliquables (utile pour le chat). */
  suggestions?: EmptyStateSuggestion[];
  /** Layout compact (inline dans une carte) vs full (occupe l'écran). */
  variant?: 'compact' | 'full';
}

export function EmptyState({
  emoji,
  icon = 'inbox',
  title,
  subtitle,
  ctaLabel,
  onCta,
  suggestions,
  variant = 'full',
}: EmptyStateProps) {
  const handleCta = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onCta?.();
  };

  const handleSuggestion = (s: EmptyStateSuggestion) => {
    Haptics.selectionAsync().catch(() => {});
    s.onPress();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[variant === 'full' ? styles.full : styles.compact]}
    >
      <Animated.View entering={FadeInDown.delay(80).duration(380)} style={styles.iconWrap}>
        {emoji ? (
          <ThemedText style={styles.emoji}>{emoji}</ThemedText>
        ) : (
          <View style={styles.iconCircle}>
            <Feather name={icon} size={36} color={Colors.textTertiary} />
          </View>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(380)}>
        <ThemedText variant="headlineMedium" color="textPrimary" style={styles.title}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        )}
      </Animated.View>

      {suggestions && suggestions.length > 0 && (
        <Animated.View entering={FadeInDown.delay(240).duration(380)} style={styles.suggestions}>
          {suggestions.map((s, idx) => (
            <Pressable
              key={`${s.label}-${idx}`}
              onPress={() => handleSuggestion(s)}
              accessibilityRole="button"
              accessibilityLabel={s.label}
              style={({ pressed }) => [
                styles.suggestion,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <ThemedText variant="bodyMedium" color="textPrimary" numberOfLines={2}>
                {s.label}
              </ThemedText>
              <Feather name="arrow-right" size={14} color={Colors.accent} />
            </Pressable>
          ))}
        </Animated.View>
      )}

      {ctaLabel && onCta && (
        <Animated.View entering={FadeInDown.delay(280).duration(380)}>
          <Pressable
            onPress={handleCta}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            style={({ pressed }) => [
              styles.cta,
              { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <ThemedText style={styles.ctaText}>{ctaLabel}</ThemedText>
            <Feather name="arrow-right" size={16} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.huge,
    gap: Spacing.md,
  },
  compact: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  iconWrap: {
    marginBottom: Spacing.sm,
  },
  emoji: {
    fontSize: 56,
    lineHeight: 64,
    textAlign: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  },
  suggestions: {
    width: '100%',
    maxWidth: 360,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent + '22',
    ...Shadows.soft,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentDark,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    marginTop: Spacing.lg,
    ...Shadows.soft,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
