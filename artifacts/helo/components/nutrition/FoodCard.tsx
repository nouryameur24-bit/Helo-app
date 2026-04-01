import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { Spacing } from '@/constants/theme';
import { NUTRIENT_DEFS, type FoodSource } from '@/constants/nutritionNeeds';
import styles from './nutritionStyles';

interface FoodCardProps {
  food: FoodSource;
}

function FoodCard({ food }: FoodCardProps) {
  return (
    <View style={styles.foodCard}>
      <ThemedText style={styles.foodEmoji}>{food.emoji}</ThemedText>
      <View style={styles.foodInfo}>
        <ThemedText variant="labelLarge" color="textPrimary">{food.name}</ThemedText>
        <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
          {food.tip}
        </ThemedText>
        <View style={styles.foodTags}>
          {food.nutrients.slice(0, 2).map((n) => (
            <View key={n} style={styles.nutrientTag}>
              <ThemedText style={styles.nutrientTagText}>
                {NUTRIENT_DEFS[n]?.emoji} {NUTRIENT_DEFS[n]?.name}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.safeBadge}>
        <ThemedText style={styles.safeBadgeText}>✓ Safe</ThemedText>
      </View>
    </View>
  );
}

export default React.memo(FoodCard);
