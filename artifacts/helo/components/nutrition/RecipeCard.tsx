import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { NUTRIENT_DEFS } from '@/constants/nutritionNeeds';
import type { Recipe } from '@/constants/recipes';
import styles from './nutritionStyles';

interface RecipeCardProps {
  recipe: Recipe;
}

function RecipeCard({ recipe }: RecipeCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); setExpanded((v) => !v); }}
      style={({ pressed }) => [styles.recipeCard, { opacity: pressed ? 0.9 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={expanded ? `Réduire ${recipe.title}` : `Voir la recette ${recipe.title}`}
    >
      <View style={styles.recipeHeader}>
        <ThemedText style={styles.recipeEmoji}>{recipe.emoji}</ThemedText>
        <View style={{ flex: 1 }}>
          <ThemedText variant="labelLarge" color="textPrimary">{recipe.title}</ThemedText>
          <View style={styles.recipeMeta}>
            <Feather name="clock" size={11} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary">{recipe.duration}</ThemedText>
            <View style={styles.recipeDot} />
            <ThemedText variant="bodySmall" color="textTertiary">{recipe.difficulty}</ThemedText>
          </View>
        </View>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textTertiary} />
      </View>

      <View style={styles.recipeTagsRow}>
        {recipe.nutrients.slice(0, 3).map((n) => (
          <View key={n} style={styles.nutrientTag}>
            <ThemedText style={styles.nutrientTagText}>
              {NUTRIENT_DEFS[n]?.emoji} {NUTRIENT_DEFS[n]?.name}
            </ThemedText>
          </View>
        ))}
      </View>

      {expanded && (
        <View style={styles.recipeBody}>
          <ThemedText variant="labelLarge" color="textSecondary" style={{ marginTop: Spacing.md }}>
            Ingrédients
          </ThemedText>
          {recipe.ingredients.map((ing, i) => (
            <ThemedText key={i} variant="bodySmall" color="textPrimary" style={styles.ingredientLine}>
              • {ing}
            </ThemedText>
          ))}
          <ThemedText variant="labelLarge" color="textSecondary" style={{ marginTop: Spacing.md }}>
            Préparation
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 4, lineHeight: 18 }}>
            {recipe.steps}
          </ThemedText>
          {recipe.safeNote && (
            <View style={styles.recipeNote}>
              <Feather name="shield" size={12} color={Colors.safe} />
              <ThemedText variant="bodySmall" style={{ color: Colors.safe, flex: 1 }}>
                {recipe.safeNote}
              </ThemedText>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

export default React.memo(RecipeCard);
