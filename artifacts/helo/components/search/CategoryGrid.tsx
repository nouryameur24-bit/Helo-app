import React from 'react';
import { Pressable, View } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { cat, CATEGORIES } from './searchStyles';

interface CategoryGridProps {
  selected: string | null;
  onSelect: (id: string | null) => void;
}

function CategoryGrid({ selected, onSelect }: CategoryGridProps) {
  return (
    <View style={cat.wrap}>
      <ThemedText variant="labelLarge" color="textPrimary" style={cat.title}>
        Parcourir par catégorie
      </ThemedText>
      <View style={cat.grid}>
        {CATEGORIES.map((c) => {
          const isActive = selected === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => onSelect(isActive ? null : c.id)}
              style={({ pressed }) => [cat.item, isActive && cat.itemActive, { opacity: pressed ? 0.85 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel={c.label}
              accessibilityState={{ selected: isActive }}
            >
              <ThemedText style={cat.emoji}>{c.emoji}</ThemedText>
              <ThemedText variant="bodySmall" style={[cat.label, isActive && cat.labelActive]} numberOfLines={2}>
                {c.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default React.memo(CategoryGrid);
