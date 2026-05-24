/**
 * Lot 15B4 — Progress indicator partagé pour les flows onboarding.
 *
 * Pourquoi : avant ce composant, les 3 écrans du pairing partner
 * (code → welcome → interests) ne donnaient AUCUNE indication à
 * l'utilisateur de combien d'étapes restaient. "J'appuie sur 'Continuer',
 * j'arrive sur un autre écran, et après ? C'est combien long ?"
 *
 * Cette pastille affiche :
 *   • Une barre de progression remplie proportionnellement
 *   • Un texte "Étape X sur Y" sous la barre
 *
 * Usage typique :
 * ```tsx
 * <OnboardingProgress step={1} total={3} />
 * <OnboardingProgress step={2} total={3} label="Connexion partenaire" />
 * ```
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';

interface OnboardingProgressProps {
  step: number;
  total: number;
  /** Optional context label displayed above ("Connexion partenaire") */
  label?: string;
}

export function OnboardingProgress({ step, total, label }: OnboardingProgressProps) {
  const safeStep = Math.max(1, Math.min(step, total));
  const pct = (safeStep / total) * 100;

  return (
    <View style={styles.wrap}>
      {label && (
        <ThemedText variant="labelSmall" color="textTertiary" style={styles.label}>
          {label.toUpperCase()}
        </ThemedText>
      )}
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: safeStep }}
      >
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <ThemedText variant="bodySmall" color="textTertiary" style={styles.text}>
        Étape {safeStep} sur {total}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
  },
  label: {
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.backgroundSecondary,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  text: {
    marginTop: 2,
  },
});
