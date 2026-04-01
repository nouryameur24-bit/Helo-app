import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { Badge } from '@/components/ui/Badge';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { pc, CATEGORIES, RISK_CONFIG, type Product } from './searchStyles';

interface ProductCardProps {
  product: Product;
  inShelf: boolean;
  index: number;
}

function ProductCard({ product, inShelf, index }: ProductCardProps) {
  const risk = RISK_CONFIG[product.overall_risk] ?? RISK_CONFIG.unknown;
  const catEmoji = CATEGORIES.find((c) => c.dbCategory === product.category)?.emoji ?? '📦';
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <Pressable
        style={({ pressed }) => [pc.wrap, { opacity: pressed ? 0.88 : 1 }]}
        onPress={() => { if (product.barcode) router.push(`/verdict/${product.barcode}`); }}
        accessibilityRole="button"
        accessibilityLabel={`${product.name} — ${risk.label}`}
      >
        <View style={pc.iconWrap}>
          <ThemedText style={pc.iconEmoji}>{catEmoji}</ThemedText>
        </View>
        <View style={pc.info}>
          <View style={pc.nameRow}>
            <ThemedText variant="labelLarge" color="textPrimary" numberOfLines={1} style={{ flex: 1 }}>
              {product.name}
            </ThemedText>
            {inShelf && (
              <Animated.View entering={FadeIn} style={pc.shelfBadge}>
                <Feather name="archive" size={10} color={Colors.accent} />
                <ThemedText style={pc.shelfText}>Placard</ThemedText>
              </Animated.View>
            )}
          </View>
          <ThemedText variant="bodySmall" color="textTertiary">{product.brand}</ThemedText>
        </View>
        <Badge variant={risk.variant}>{risk.label}</Badge>
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(ProductCard);
