import React from 'react';
import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import type { MatchResult, Phase, RiskLevel } from '@/types';
import { IngredientCard } from './IngredientCard';
import { groupIngredientsByCategory } from './categorizeIngredient';
import {
  getRiskColor,
  getRiskVariant,
  getRiskBadgeLabel,
  phaseLabel,
} from './verdictHelpers';
import styles from './verdictStyles';

interface IngredientsSectionProps {
  flagged: MatchResult[];
  noSignal: MatchResult[];
  isPremium: boolean;
  requirePremium: (reason: string) => void;
  phase: Phase;
  totalIngredientsCount: number;
}

// One short, free-tier line per flagged ingredient.
// e.g. "Déconseillé au 1er trimestre — source CRAT"
function buildFreeCaption(match: MatchResult, phase: Phase): string {
  const verb =
    match.riskLevel === 'danger' ? 'Déconseillé'
    : match.riskLevel === 'caution' ? 'Vigilance'
    : 'Compatible';
  const phaseStr =
    phase === 'breastfeeding' ? "pendant l'allaitement" : `au ${phaseLabel(phase)}`;
  const source = match.ingredient?.source?.trim();
  const sourcePart = source ? ` — source ${source}` : '';
  return `${verb} ${phaseStr}${sourcePart}`;
}

function FreeIngredientRow({ match, phase }: { match: MatchResult; phase: Phase }) {
  const dotColor = getRiskColor(match.riskLevel);
  return (
    <View style={styles.freeIngredientRow}>
      <View style={[styles.riskDot, { backgroundColor: dotColor }]} />
      <View style={styles.freeIngredientBody}>
        <View style={styles.freeIngredientHeader}>
          <ThemedText variant="bodyLarge" style={styles.freeIngredientName}>
            {match.ingredientName}
          </ThemedText>
          <Badge variant={getRiskVariant(match.riskLevel)}>
            {getRiskBadgeLabel(match.riskLevel)}
          </Badge>
        </View>
        <ThemedText
          variant="bodySmall"
          color="textSecondary"
          style={styles.freeIngredientCaption}
        >
          {buildFreeCaption(match, phase)}
        </ThemedText>
      </View>
    </View>
  );
}

export function IngredientsSection({
  flagged,
  noSignal,
  isPremium,
  requirePremium,
  phase,
  totalIngredientsCount,
}: IngredientsSectionProps) {
  // Empty-state: no flagged ingredients at all (score = 100).
  if (flagged.length === 0) {
    if (totalIngredientsCount === 0 && noSignal.length === 0) return null;
    const count = totalIngredientsCount || noSignal.length;
    return (
      <View style={styles.allClearCard}>
        <Feather name="check-circle" size={22} color={Colors.safe} />
        <ThemedText variant="bodyMedium" style={styles.allClearText}>
          ✅ Aucun ingrédient à risque détecté parmi les {count} ingrédients analysés
        </ThemedText>
      </View>
    );
  }

  // Sort danger first, then caution. Render full card for premium, compact row for free.
  const dangerLevels: RiskLevel[] = ['danger', 'caution'];
  const visibleFlagged = flagged.filter((m) => dangerLevels.includes(m.riskLevel));

  return (
    <View style={styles.ingredientsWrap}>
      <View style={styles.section}>
        <ThemedText variant="headlineMedium" style={styles.sectionTitle}>
          Ingrédients à surveiller
        </ThemedText>

        {isPremium
          ? visibleFlagged.map((m) => <IngredientCard key={m.ingredientName} match={m} />)
          : visibleFlagged.map((m) => (
              <FreeIngredientRow key={m.ingredientName} match={m} phase={phase} />
            ))}
      </View>

      {/* Lot 17-07 — Groupement no_signal par catégorie (allergènes /
          conservateurs / additifs / etc.). Avant : liste plate de 50+
          ingrédients en vrac → mur de texte. Maintenant : sections avec
          emoji + compteur. Catégorisation pattern-based (pas DB), suffisant
          pour donner du sens visuel. */}
      {isPremium && noSignal.length > 0 && (
        <View style={styles.section}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.noSignalTitle}>
            AUCUN SIGNALEMENT CONNU ({noSignal.length})
          </ThemedText>
          {groupIngredientsByCategory(noSignal).map(({ category, items }) => (
            <View key={category.key} style={{ marginBottom: Spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <ThemedText style={{ fontSize: 14 }}>{category.emoji}</ThemedText>
                <ThemedText variant="labelSmall" color="textSecondary" style={{ letterSpacing: 0.6 }}>
                  {category.label.toUpperCase()} ({items.length})
                </ThemedText>
              </View>
              <Card style={styles.noSignalCard} padding={Spacing.lg}>
                {items.map((m, i) => (
                  <View key={m.ingredientName}>
                    <ThemedText variant="bodySmall" color="textSecondary" style={styles.noSignalItem}>
                      {m.ingredientName}
                    </ThemedText>
                    {i < items.length - 1 && <Divider style={styles.noSignalDivider} />}
                  </View>
                ))}
              </Card>
            </View>
          ))}
        </View>
      )}

      {!isPremium && (
        <View style={styles.premiumGate}>
          <View style={styles.premiumGateCard}>
            <ThemedText style={styles.premiumGateEmoji}>🔍</ThemedText>
            <ThemedText variant="headlineMedium" color="textPrimary" style={styles.premiumGateTitle}>
              Détails complets avec Premium
            </ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary" style={styles.premiumGateBody}>
              Explication complète par ingrédient, sources scientifiques cliquables (CRAT, ANSM, EFSA) et alternatives sûres suggérées.
            </ThemedText>
            <Pressable
              onPress={() => requirePremium('feature')}
              style={({ pressed }) => [styles.premiumGateBtn, { opacity: pressed ? 0.88 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Débloquer les détails avec Premium"
            >
              <ThemedText style={styles.premiumGateBtnText}>Débloquer — Premium</ThemedText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
