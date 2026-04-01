import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { top, CATEGORIES, type Product } from './searchStyles';

interface TopSafeCarouselProps {
  shelfIds: Set<string>;
}

function TopSafeCarousel({ shelfIds }: TopSafeCarouselProps) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    supabase
      .from('products')
      .select('id, name, brand, category, overall_risk, barcode')
      .eq('overall_risk', 'safe')
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        setItems((data as Product[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View style={top.root}>
        <ThemedText variant="labelLarge" color="textPrimary" style={top.title}>Top produits sûrs</ThemedText>
        <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.lg }} />
      </View>
    );
  }

  if (items.length === 0) return null;

  return (
    <View style={top.root}>
      <ThemedText variant="labelLarge" color="textPrimary" style={top.title}>Top produits sûrs ✓</ThemedText>
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={top.list}
        keyExtractor={(item) => item.id}
        maxToRenderPerBatch={10}
        initialNumToRender={8}
        removeClippedSubviews
        renderItem={({ item }) => {
          const catEmoji = CATEGORIES.find((c) => c.dbCategory === item.category)?.emoji ?? '📦';
          const inShelf = shelfIds.has(item.id);
          return (
            <Pressable
              style={({ pressed }) => [top.card, { opacity: pressed ? 0.88 : 1 }]}
              onPress={() => item.barcode && router.push(`/verdict/${item.barcode}`)}
              accessibilityRole="button"
              accessibilityLabel={item.name}
            >
              <View style={top.cardTop}>
                <ThemedText style={top.cardEmoji}>{catEmoji}</ThemedText>
                {inShelf && (
                  <View style={top.cardShelfDot}>
                    <Feather name="archive" size={8} color={Colors.accent} />
                  </View>
                )}
              </View>
              <ThemedText variant="labelLarge" color="textPrimary" numberOfLines={2} style={top.cardName}>
                {item.name}
              </ThemedText>
              <ThemedText variant="bodySmall" color="textTertiary" numberOfLines={1}>{item.brand}</ThemedText>
              <View style={top.cardBadge}>
                <View style={top.dot} />
                <ThemedText style={top.cardBadgeText}>Compatible</ThemedText>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

export default React.memo(TopSafeCarousel);
