import React, { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
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
