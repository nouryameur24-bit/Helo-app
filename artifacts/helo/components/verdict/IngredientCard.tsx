import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { MatchResult } from '@/types';
import { getRiskColor, getRiskVariant, getRiskBadgeLabel } from './verdictHelpers';
import styles from './verdictStyles';

export function IngredientCard({ match }: { match: MatchResult }) {
  const [expanded, setExpanded] = useState(false);
  const dotColor = getRiskColor(match.riskLevel);

  if (match.riskLevel === 'no_signal') return null;

  return (
    <Card style={styles.ingredientCard} padding={Spacing.lg}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`Ingrédient ${match.ingredientName}, ${getRiskBadgeLabel(match.riskLevel)}. ${expanded ? 'Réduire' : 'Développer'}`}
      >
        <View style={styles.ingredientRow}>
          <View style={[styles.riskDot, { backgroundColor: dotColor }]} />
          <View style={styles.ingredientMeta}>
            <ThemedText variant="bodyLarge" style={{ flex: 1 }}>{match.ingredientName}</ThemedText>
            <Badge variant={getRiskVariant(match.riskLevel)}>
              {getRiskBadgeLabel(match.riskLevel)}
            </Badge>
          </View>
        </View>
        {match.ingredient?.description_fr && (
          <ThemedText
            variant="bodySmall"
            color="textSecondary"
            style={styles.ingredientDesc}
            numberOfLines={expanded ? undefined : 2}
          >
            {match.ingredient.description_fr}
          </ThemedText>
        )}
        {/* Lot 17-04 — Dosage recommandé pendant grossesse. Affiché en pill
            spéciale pour ressortir visuellement (style "info dosage" distinct
            de la description). Affiché aussi en mode replié. */}
        {match.ingredient?.max_dose_mg_per_day != null && (
          <View style={doseStyles.row}>
            <View style={doseStyles.pill}>
              <Feather name="clock" size={11} color={Colors.accentDark} />
              <ThemedText variant="labelSmall" style={doseStyles.pillText}>
                Max {match.ingredient.max_dose_mg_per_day}
                {match.ingredient.dose_unit ? ` ${match.ingredient.dose_unit}` : ' mg'}/jour
              </ThemedText>
            </View>
            {match.ingredient.dose_note && expanded && (
              <ThemedText variant="bodySmall" color="textSecondary" style={doseStyles.note}>
                {match.ingredient.dose_note}
              </ThemedText>
            )}
          </View>
        )}
        {expanded && match.ingredient?.source && (
          <View style={styles.sourceRow}>
            <Feather name="book-open" size={12} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginLeft: 4 }}>
              {match.ingredient.source}
            </ThemedText>
            {match.ingredient.source_url && (
              <Pressable
                onPress={() => Linking.openURL(match.ingredient!.source_url!)}
                accessibilityRole="link"
                accessibilityLabel="Voir la source"
              >
                <ThemedText variant="bodySmall" style={{ color: Colors.accent, marginLeft: 8 }}>
                  Voir →
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}
        {match.ingredient?.description_fr && match.ingredient.description_fr.length > 80 && (
          <ThemedText variant="bodySmall" style={{ color: Colors.accent, marginTop: 4 }}>
            {expanded ? 'Moins ▲' : 'Plus ▼'}
          </ThemedText>
        )}
      </Pressable>
    </Card>
  );
}

// Lot 17-04 — Styles dédiés à la pill "dosage max/jour" (séparés des styles
// partagés via verdictStyles pour ne pas polluer le namespace global).
const doseStyles = StyleSheet.create({
  row: {
    marginTop: Spacing.sm,
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accent + '55',
  },
  pillText: {
    color: Colors.accentDark,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  note: {
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
