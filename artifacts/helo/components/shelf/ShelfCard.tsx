import React from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { Badge } from '@/components/ui/Badge';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

export type ShelfCategory = 'salle-de-bain' | 'cuisine' | 'pharmacie' | 'couches' | 'lingettes-bebe' | 'creme-change' | 'lait-bebe' | 'shampoing-bebe';
export type Verdict = 'safe' | 'caution' | 'danger' | 'unknown';

export interface ShelfProduct {
  id: string;
  name: string;
  brand: string;
  imageUrl?: string;
  verdict: Verdict;
  verdictLabel: string;
  category?: ShelfCategory;
  verdictChanged: boolean;
  baby_product?: boolean;
}

interface ShelfCardProps {
  product: ShelfProduct;
  onPress: (product: ShelfProduct) => void;
  onRemove: (product: ShelfProduct) => void;
  onChangeCategory: (product: ShelfProduct) => void;
}

const categoryIconMap: Record<ShelfCategory, keyof typeof Feather.glyphMap> = {
  'salle-de-bain': 'droplet',
  'cuisine': 'coffee',
  'pharmacie': 'heart',
  'couches': 'package',
  'lingettes-bebe': 'wind',
  'creme-change': 'sun',
  'lait-bebe': 'thermometer',
  'shampoing-bebe': 'droplet',
};

const verdictBadgeMap: Record<Verdict, 'safe' | 'caution' | 'danger' | 'accent'> = {
  safe: 'safe',
  caution: 'caution',
  danger: 'danger',
  unknown: 'accent',
};

function showActionSheet(
  product: ShelfProduct,
  onRemove: (p: ShelfProduct) => void,
  onChangeCategory: (p: ShelfProduct) => void,
) {
  const options = ['Supprimer du placard', 'Changer de catégorie', 'Annuler'];
  const cancelIndex = 2;
  const destructiveIndex = 0;

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
      (buttonIndex) => {
        if (buttonIndex === 0) onRemove(product);
        if (buttonIndex === 1) onChangeCategory(product);
      },
    );
  } else {
    Alert.alert(product.name, undefined, [
      { text: 'Supprimer du placard', style: 'destructive', onPress: () => onRemove(product) },
      { text: 'Changer de catégorie', onPress: () => onChangeCategory(product) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }
}

export const ShelfCard = React.memo(function ShelfCard({ product, onPress, onRemove, onChangeCategory }: ShelfCardProps) {
  const catIcon = product.category ? categoryIconMap[product.category] : 'box';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
      onPress={() => onPress(product)}
      onLongPress={() => showActionSheet(product, onRemove, onChangeCategory)}
      delayLongPress={400}
    >
      <View style={styles.imageContainer}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Feather name={catIcon} size={32} color={Colors.textTertiary} />
          </View>
        )}
        {product.verdictChanged && <View style={styles.changedDot} />}
      </View>

      <View style={styles.info}>
        <ThemedText variant="labelLarge" color="textPrimary" numberOfLines={2}>
          {product.name}
        </ThemedText>
        <ThemedText variant="bodySmall" color="textTertiary" numberOfLines={1}>
          {product.brand}
        </ThemedText>
      </View>

      <View style={styles.footer}>
        <Badge variant={verdictBadgeMap[product.verdict]}>{product.verdictLabel}</Badge>
        <Feather name={catIcon} size={14} color={Colors.textTertiary} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.soft,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.surfaceElevated,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changedDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  info: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
