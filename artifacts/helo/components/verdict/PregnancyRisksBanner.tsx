/**
 * Lot 19-D1 — Bannière des risques pregnancy-specific (listeria, toxo, etc.)
 *
 * Pourquoi : avant Lot 19, on avait juste un verdict global. Maintenant
 * la DB Supabase tag chaque produit alimentaire avec des risques pregnancy
 * pré-calculés (92 057 produits aliments taggués). Cette bannière les
 * affiche de façon explicite pour que la maman comprenne LE RISQUE PRÉCIS.
 *
 * Exemple : "Camembert au lait cru" → "🔴 Listeria · 🥩 Lait cru"
 *
 * Affichée AVANT le verdict global pour la précision contextuelle.
 */

import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { PregnancyRisks } from '@/types';

interface PregnancyRisksBannerProps {
  risks?: PregnancyRisks;
}

interface RiskChip {
  label: string;
  emoji: string;
  severity: 'danger' | 'caution';
}

function getRiskChips(risks: PregnancyRisks): RiskChip[] {
  const chips: RiskChip[] = [];

  if (risks.listeria_risk) {
    chips.push({ label: 'Listeria', emoji: '🦠', severity: 'danger' });
  }
  if (risks.toxo_risk) {
    chips.push({ label: 'Toxoplasmose', emoji: '🥩', severity: 'danger' });
  }
  if (risks.mercury_risk === 'high') {
    chips.push({ label: 'Mercure élevé', emoji: '🐟', severity: 'danger' });
  } else if (risks.mercury_risk === 'medium') {
    chips.push({ label: 'Mercure modéré', emoji: '🐟', severity: 'caution' });
  }
  if (risks.raw_fish) {
    chips.push({ label: 'Poisson cru', emoji: '🍣', severity: 'danger' });
  }
  if (risks.raw_seafood) {
    chips.push({ label: 'Fruits de mer crus', emoji: '🦪', severity: 'danger' });
  }
  if (risks.raw_milk) {
    chips.push({ label: 'Lait cru', emoji: '🥛', severity: 'danger' });
  }
  if (risks.eggs_raw) {
    chips.push({ label: 'Œufs crus', emoji: '🥚', severity: 'danger' });
  } else if (risks.eggs_partial) {
    chips.push({ label: 'Œufs peu cuits', emoji: '🥚', severity: 'caution' });
  }
  if (risks.vitamin_a_excess) {
    chips.push({ label: 'Vitamine A excès', emoji: '⚠️', severity: 'danger' });
  }
  if (risks.alcohol_risk) {
    chips.push({ label: 'Alcool', emoji: '🍷', severity: 'danger' });
  }
  if (risks.caffeine_mg_estimate && risks.caffeine_mg_estimate >= 100) {
    chips.push({
      label: `Caféine ${risks.caffeine_mg_estimate}mg`,
      emoji: '☕',
      severity: 'caution',
    });
  } else if (risks.caffeine_mg_estimate && risks.caffeine_mg_estimate >= 40) {
    chips.push({
      label: `Caféine ${risks.caffeine_mg_estimate}mg`,
      emoji: '☕',
      severity: 'caution',
    });
  }
  if (risks.diabetes_concern === 'high') {
    chips.push({ label: 'Sucre excessif', emoji: '🍬', severity: 'caution' });
  }

  return chips;
}

export function PregnancyRisksBanner({ risks }: PregnancyRisksBannerProps) {
  if (!risks) return null;
  const chips = getRiskChips(risks);
  if (chips.length === 0) return null;

  const hasDanger = chips.some((c) => c.severity === 'danger');
  const bg = hasDanger ? '#FFEEEE' : '#FFF7E6';
  const border = hasDanger ? '#F5B5B5' : '#F5D9A3';
  const iconColor = hasDanger ? Colors.danger : Colors.caution;
  const titleText = hasDanger
    ? 'Risques spécifiques à la grossesse'
    : 'Points de vigilance grossesse';

  return (
    <Animated.View entering={FadeInDown.duration(360)} style={[styles.wrap, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.iconWrap}>
        <Feather name={hasDanger ? 'alert-octagon' : 'alert-triangle'} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText variant="labelLarge" color="textPrimary" style={styles.title}>
          {titleText}
        </ThemedText>
        <View style={styles.chipsRow}>
          {chips.map((chip) => (
            <View
              key={chip.label}
              style={[
                styles.chip,
                chip.severity === 'danger' ? styles.chipDanger : styles.chipCaution,
              ]}
            >
              <ThemedText style={styles.chipEmoji}>{chip.emoji}</ThemedText>
              <ThemedText
                variant="labelSmall"
                style={[
                  styles.chipText,
                  chip.severity === 'danger' ? styles.chipTextDanger : styles.chipTextCaution,
                ]}
              >
                {chip.label}
              </ThemedText>
            </View>
          ))}
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
    marginBottom: Spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipDanger: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderColor: Colors.danger + '66',
  },
  chipCaution: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderColor: Colors.caution + '66',
  },
  chipEmoji: {
    fontSize: 13,
    lineHeight: 16,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chipTextDanger: {
    color: Colors.danger,
  },
  chipTextCaution: {
    color: '#A36A00',
  },
});
