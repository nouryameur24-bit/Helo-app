/**
 * IngredientRows — tableau de comparaison des ingrédients à risque.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { MatchResult } from '@/types';
import { verdictColor, type VerdictKind } from './compareHelpers';

interface IngredientRowsProps {
  matchesA: MatchResult[];
  matchesB: MatchResult[];
}

export function IngredientRows({ matchesA, matchesB }: IngredientRowsProps) {
  const flaggedA = matchesA.filter((m) => m.riskLevel !== 'no_signal' && m.riskLevel !== 'safe');
  const flaggedB = matchesB.filter((m) => m.riskLevel !== 'no_signal' && m.riskLevel !== 'safe');

  if (flaggedA.length === 0 && flaggedB.length === 0) {
    return (
      <View style={ingr.emptyRow}>
        <Feather name="check-circle" size={18} color={Colors.safe} />
        <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginLeft: Spacing.sm }}>
          Aucun ingrédient signalé dans les deux produits
        </ThemedText>
      </View>
    );
  }

  const maxLen = Math.max(flaggedA.length, flaggedB.length);

  return (
    <View style={ingr.root}>
      <View style={ingr.headerRow}>
        <ThemedText variant="labelSmall" color="textTertiary" style={ingr.cell}>
          PRODUIT A
        </ThemedText>
        <ThemedText variant="labelSmall" color="textTertiary" style={ingr.cell}>
          PRODUIT B
        </ThemedText>
      </View>
      {Array.from({ length: maxLen }).map((_, i) => {
        const mA = flaggedA[i];
        const mB = flaggedB[i];
        return (
          <View key={i} style={ingr.row}>
            {mA ? (
              <View style={[ingr.cell, ingr.ingredientCell, { borderColor: verdictColor(mA.riskLevel as VerdictKind) + '44' }]}>
                <View style={[ingr.dot, { backgroundColor: verdictColor(mA.riskLevel as VerdictKind) }]} />
                <ThemedText variant="bodySmall" color="textPrimary" style={{ flex: 1 }} numberOfLines={2}>
                  {mA.ingredientName}
                </ThemedText>
              </View>
            ) : (
              <View style={[ingr.cell, ingr.emptyCell]} />
            )}
            {mB ? (
              <View style={[ingr.cell, ingr.ingredientCell, { borderColor: verdictColor(mB.riskLevel as VerdictKind) + '44' }]}>
                <View style={[ingr.dot, { backgroundColor: verdictColor(mB.riskLevel as VerdictKind) }]} />
                <ThemedText variant="bodySmall" color="textPrimary" style={{ flex: 1 }} numberOfLines={2}>
                  {mB.ingredientName}
                </ThemedText>
              </View>
            ) : (
              <View style={[ingr.cell, ingr.emptyCell]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const ingr = StyleSheet.create({
  root: { gap: Spacing.sm },
  headerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cell: {
    flex: 1,
  },
  ingredientCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
  },
  emptyCell: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.sm,
    height: 36,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.safeBg,
    borderRadius: Radius.md,
  },
});
