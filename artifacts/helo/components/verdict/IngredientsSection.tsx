import React from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Spacing } from '@/constants/theme';
import type { MatchResult } from '@/types';
import { IngredientCard } from './IngredientCard';
import styles from './verdictStyles';

interface IngredientsSectionProps {
  flagged: MatchResult[];
  noSignal: MatchResult[];
  isPremium: boolean;
  requirePremium: (reason: string) => void;
}

export function IngredientsSection({
  flagged,
  noSignal,
  isPremium,
  requirePremium,
}: IngredientsSectionProps) {
  if (flagged.length === 0 && noSignal.length === 0) return null;

  return (
    <View style={styles.ingredientsWrap}>
      {flagged.length > 0 && (
        <View style={styles.section}>
          <ThemedText variant="headlineMedium" style={styles.sectionTitle}>
            Ingrédients analysés
          </ThemedText>
          {(isPremium ? flagged : flagged.slice(0, 2)).map((m) => (
            <IngredientCard key={m.ingredientName} match={m} />
          ))}
        </View>
      )}

      {isPremium && noSignal.length > 0 && (
        <View style={styles.section}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.noSignalTitle}>
            AUCUN SIGNALEMENT CONNU ({noSignal.length})
          </ThemedText>
          <Card style={styles.noSignalCard} padding={Spacing.lg}>
            {noSignal.map((m, i) => (
              <View key={m.ingredientName}>
                <ThemedText variant="bodySmall" color="textSecondary" style={styles.noSignalItem}>
                  {m.ingredientName}
                </ThemedText>
                {i < noSignal.length - 1 && (
                  <Divider style={styles.noSignalDivider} />
                )}
              </View>
            ))}
          </Card>
        </View>
      )}

      {!isPremium && (
        <View style={styles.premiumGate}>
          <View style={styles.premiumGateCard}>
            <ThemedText style={styles.premiumGateEmoji}>🔍</ThemedText>
            <ThemedText variant="headlineMedium" color="textPrimary" style={styles.premiumGateTitle}>
              Détails ingrédients
            </ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary" style={styles.premiumGateBody}>
              Accédez à l'analyse complète de tous les ingrédients, leurs risques par trimestre et les sources scientifiques.
            </ThemedText>
            <Pressable
              onPress={() => requirePremium('feature')}
              style={({ pressed }) => [styles.premiumGateBtn, { opacity: pressed ? 0.88 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Voir les détails avec Premium"
            >
              <ThemedText style={styles.premiumGateBtnText}>Voir les détails — Premium</ThemedText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
