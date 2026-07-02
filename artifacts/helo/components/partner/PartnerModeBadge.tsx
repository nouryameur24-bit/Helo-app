/**
 * Lot 15A2 — Badge "Mode accompagnant" visible en haut des écrans clés
 * quand l'utilisateur est en role === 'partner'.
 *
 * Problème résolu : avant ce lot, un partenaire (Thomas) qui ouvrait l'app
 * voyait directement le placard de sa compagne ("Placard de Sophie · Semaine 28")
 * sans aucune indication qu'il était dans une vue accompagnant. Confusion :
 * "C'est mon app ou la sienne ? Pourquoi je vois ses données ? Puis-je éditer
 * son profil ?"
 *
 * Cette pastille :
 *   • Pose visuellement le contexte "tu es en mode accompagnant"
 *   • Nomme la personne accompagnée (réduit l'ambiguïté)
 *   • Reste discrète (gradient pastel, pas une bannière intrusive)
 *   • Est cliquable pour mener à un explainer ou aux settings de pairing
 *
 * À utiliser sur : PartnerHomeScreen, verdict (quand partner scan),
 * shelf (lecture seule), partout où le partenaire voit les données de
 * la maman.
 */

import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface PartnerModeBadgeProps {
  /** Prénom de la personne accompagnée (ex: "Sophie"). Optional fallback. */
  linkedFirstName?: string | null;
  /** Style de présentation : "compact" (en-tête) ou "full" (carte standalone). */
  variant?: 'compact' | 'full';
  /** Optional onPress override — par défaut route vers Profil. */
  onPress?: () => void;
}

export function PartnerModeBadge({
  linkedFirstName,
  variant = 'compact',
  onPress,
}: PartnerModeBadgeProps) {
  const name = linkedFirstName?.trim() || 'ton proche';

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    router.push('/(tabs)/profile');
  };

  if (variant === 'full') {
    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`Mode accompagnant pour ${name}. Appuyer pour les paramètres.`}
        style={({ pressed }) => [
          { opacity: pressed ? 0.94 : 1 },
        ]}
      >
        <LinearGradient
          colors={['#E8F4F8', '#D4E9F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fullCard}
        >
          <View style={styles.iconWrap}>
            <Feather name="heart" size={18} color={Colors.accentDark} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="labelSmall" style={styles.label}>
              MODE ACCOMPAGNANT
            </ThemedText>
            <ThemedText variant="labelLarge" color="textPrimary">
              Tu accompagnes {name}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
        </LinearGradient>
      </Pressable>
    );
  }

  // Compact pill — pour headers et toolbars
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Mode accompagnant pour ${name}`}
      hitSlop={6}
      style={({ pressed }) => [
        styles.pill,
        { opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <Feather name="heart" size={12} color={Colors.accentDark} />
      <ThemedText variant="labelSmall" style={styles.pillText}>
        Accompagnant · {name}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: Colors.accentDark,
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#E8F4F8',
    borderWidth: 1,
    borderColor: '#C5DDE8',
  },
  pillText: {
    color: Colors.accentDark,
    fontSize: 11,
    fontWeight: '600',
  },
});
