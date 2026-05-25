/**
 * Lot 17-02 — Bannière ROUGE bloquante "Contient un allergène déclaré".
 *
 * Pourquoi : c'est LE plus gros risque d'une app grossesse personnalisée.
 * Scenario réel évité :
 *   - Maman déclare à l'onboarding : "Allergie arachide"
 *   - Scanne un biscuit qui contient "huile d'arachide"
 *   - Avant Lot 17 : verdict "safe pendant la grossesse" → maman achète
 *     → choc anaphylactique
 *   - Maintenant : bannière ROUGE en tête du verdict, impossible à manquer.
 *
 * Cette bannière s'affiche EN HAUT du contenu (au-dessus de la hero) pour
 * être la première chose vue. Style danger explicite + haptic Error au
 * mount. Liste les allergènes détectés ("Contient : Arachide, Lait").
 *
 * Compatibilité : si verdict.allergyWarnings est undefined/vide, le
 * composant ne render rien (graceful no-op). C'est sécurisé.
 */

import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

interface AllergyWarningBannerProps {
  /** Liste des allergies déclarées qui matchent les ingrédients du produit.
   *  Ex: ["Arachide", "Lait"]. Si undefined/vide, le composant ne render rien. */
  allergyWarnings?: string[];
}

export function AllergyWarningBanner({ allergyWarnings }: AllergyWarningBannerProps) {
  const hasWarnings = !!allergyWarnings && allergyWarnings.length > 0;

  useEffect(() => {
    if (hasWarnings) {
      // Haptic Error = vibration distinctive (3 buzz courts), pas la même
      // que Warning. Inconfortable volontairement — c'est une alerte vitale.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [hasWarnings]);

  if (!hasWarnings) return null;

  const list = allergyWarnings!.join(', ');

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Feather name="alert-octagon" size={22} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.title}>
          ⛔ Allergène détecté
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Ce produit contient un ingrédient que tu as déclaré allergique :
        </ThemedText>
        <View style={styles.tagsRow}>
          {allergyWarnings!.map((label) => (
            <View key={label} style={styles.tag}>
              <ThemedText style={styles.tagText}>{label}</ThemedText>
            </View>
          ))}
        </View>
        <View accessibilityLabel={`Allergie déclarée : ${list}`}>
          <ThemedText style={styles.footer}>
            Ne consomme pas ce produit.
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.danger,
    ...Shadows.elevated,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 13,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: Spacing.sm,
    letterSpacing: 0.2,
  },
});
