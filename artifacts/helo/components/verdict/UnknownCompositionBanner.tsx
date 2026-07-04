/**
 * Lot 17-01 — Bannière "Composition partiellement reconnue".
 *
 * Pourquoi : avant ce composant, quand TOUS les ingrédients d'un produit
 * étaient inconnus (matcher déterministe → 0 hit + AI fallback indispo
 * ou ratée), l'app affichait fièrement "✅ Aucun ingrédient à risque" et
 * verdict=safe. C'EST DANGEREUX pour une app grossesse :
 *
 *   Scenario réel : tisane bio rare contenant curcuma + gingembre.
 *   → 0 ingrédient matché en local.
 *   → Verdict "safe" affiché.
 *   → Maman boit 3 tasses/jour en T1.
 *   → Curcuma : effet utérotonique documenté CRAT.
 *
 * Cette bannière jaune apparaît au-dessus de la liste d'ingrédients quand :
 *   - allIngredientsUnknown = true (0 ingrédient identifié → criticité max)
 *   - OU unknownRatio > 0.5 (moitié+ inconnus → fiabilité compromise)
 *
 * Elle invite à demander à la Sage-Femme IA si doute, plutôt que de se
 * reposer sur le verdict automatique.
 */

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/ui/ThemedText';
import { Radius, Spacing } from '@/constants/theme';

interface UnknownCompositionBannerProps {
  totalCount: number;
  noSignalCount: number;
  allUnknown: boolean;
}

export function UnknownCompositionBanner({
  totalCount,
  noSignalCount,
  allUnknown,
}: UnknownCompositionBannerProps) {
  const recognizedCount = totalCount - noSignalCount;

  // Severity : "danger-style" si TOUT inconnu, "caution-style" si seulement
  // partiellement. Couleurs sont volontairement distinctes du verdict pour
  // ne pas faire croire à un changement de verdict.
  const isFullUnknown = allUnknown;
  const bg = isFullUnknown ? '#FFF4E5' : '#FFFAF0'; // ambre clair vs crème
  const border = isFullUnknown ? '#FFB546' : '#F5D9A3';
  const iconColor = isFullUnknown ? '#B86F00' : '#A78540';

  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      <View
        style={[
          styles.wrap,
          { backgroundColor: bg, borderColor: border },
        ]}
        accessibilityRole="alert"
        accessibilityLabel={
          isFullUnknown
            ? 'Composition non reconnue. Verdict provisoire.'
            : `Composition partiellement reconnue : ${recognizedCount} sur ${totalCount} ingrédients identifiés.`
        }
      >
        <View style={styles.iconWrap}>
          <Feather name="alert-triangle" size={18} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText variant="labelLarge" color="textPrimary" style={styles.title}>
            {isFullUnknown
              ? 'Composition non reconnue'
              : 'Composition partiellement reconnue'}
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary" style={styles.subtitle}>
            {isFullUnknown
              ? "Aucun ingrédient de ce produit n'est dans notre base. Le verdict est provisoire — demande à la Sage-Femme IA si tu as un doute."
              : `${recognizedCount} ingrédient${recognizedCount > 1 ? 's' : ''} sur ${totalCount} identifié${recognizedCount > 1 ? 's' : ''}. Si tu as un doute sur un ingrédient absent, pose la question à la Sage-Femme IA.`}
          </ThemedText>
          <Pressable
            onPress={() => router.push('/(tabs)/chat')}
            accessibilityRole="button"
            accessibilityLabel="Demander à la Sage-Femme IA"
            hitSlop={6}
            style={({ pressed }) => [
              styles.cta,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="message-circle" size={14} color={iconColor} />
            <ThemedText variant="labelSmall" style={[styles.ctaText, { color: iconColor }]}>
              Demander à la Sage-Femme IA
            </ThemedText>
            <Feather name="arrow-right" size={12} color={iconColor} />
          </Pressable>
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
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  title: {
    marginBottom: 2,
  },
  subtitle: {
    lineHeight: 18,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    marginTop: Spacing.sm,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
