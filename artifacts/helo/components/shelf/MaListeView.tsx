import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  Layout,
} from 'react-native-reanimated';
import {
  Swipeable,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface ShoppingItem {
  id: string;
  productName: string;
  brand: string;
  checked: boolean;
}

const MOCK_SHOPPING: ShoppingItem[] = [
  { id: 's1', productName: 'Shampooing solide Lamazuna', brand: 'LAMAZUNA', checked: false },
  { id: 's2', productName: 'Dentifrice bio Cattier', brand: 'CATTIER', checked: true },
  { id: 's3', productName: 'Déodorant naturel Schmidt\'s', brand: 'SCHMIDT\'S', checked: false },
  { id: 's4', productName: 'Crème solaire bio Acorelle', brand: 'ACORELLE', checked: false },
];

function ShoppingRow({
  item,
  onToggle,
  onRemove,
}: {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = () => (
    <Pressable
      style={styles.removeAction}
      onPress={() => {
        swipeableRef.current?.close();
        onRemove(item.id);
      }}
    >
      <Feather name="trash-2" size={18} color={Colors.surface} />
      <ThemedText variant="bodySmall" color={Colors.surface}>
        Retirer
      </ThemedText>
    </Pressable>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <Animated.View
        entering={FadeInDown.duration(300)}
        layout={Layout.springify()}
      >
        <Pressable
          style={[styles.row, item.checked && styles.rowChecked]}
          onPress={() => onToggle(item.id)}
        >
          <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
            {item.checked && <Feather name="check" size={14} color={Colors.surface} />}
          </View>
          <View style={styles.rowContent}>
            <ThemedText
              variant="labelLarge"
              color={item.checked ? 'textTertiary' : 'textPrimary'}
              numberOfLines={1}
              style={item.checked ? styles.strikethrough : undefined}
            >
              {item.productName}
            </ThemedText>
            <ThemedText variant="bodySmall" color="textTertiary" numberOfLines={1}>
              {item.brand}
            </ThemedText>
          </View>
        </Pressable>
      </Animated.View>
    </Swipeable>
  );
}

export function MaListeView() {
  const [items, setItems] = useState<ShoppingItem[]>(MOCK_SHOPPING);

  const handleToggle = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  }, []);

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ShoppingItem }) => (
      <ShoppingRow item={item} onToggle={handleToggle} onRemove={handleRemove} />
    ),
    [handleToggle, handleRemove],
  );

  if (items.length === 0) {
    return (
      <View style={styles.emptyRoot}>
        <Feather name="shopping-cart" size={48} color={Colors.textTertiary} />
        <ThemedText variant="headlineLarge" color="textPrimary" style={styles.emptyTitle}>
          Liste vide
        </ThemedText>
        <ThemedText variant="bodyMedium" color="textSecondary" style={styles.emptyBody}>
          Ajoutez des alternatives depuis les résultats de scan pour créer votre liste de courses.
        </ThemedText>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: Spacing.xl,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText variant="displayMedium" color="textPrimary">
              Ma Liste
            </ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: 4 }}>
              {items.filter((i) => !i.checked).length} produits restants
            </ThemedText>
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: Colors.borderLight, marginLeft: 52 }} />
        )}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background,
  },
  rowChecked: {
    opacity: 0.5,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  removeAction: {
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    gap: 4,
  },
  emptyRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
