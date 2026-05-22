import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { ROUTES } from '@/types/routes';
import { styles } from './homeStyles';

export const HomeQuickActions = React.memo(function HomeQuickActions() {
  return (
    <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.quickRow}>
      <Pressable
        style={({ pressed }) => [
          styles.quickCard,
          { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
        onPress={() => router.push(ROUTES.basketScan)}
        accessibilityRole="button"
        accessibilityLabel="Mon panier"
      >
        <View style={[styles.quickIcon, { backgroundColor: Colors.accentLight + '55', borderColor: Colors.accentLight }]}>
          <Feather name="shopping-cart" size={18} color={Colors.accent} />
        </View>
        <ThemedText variant="labelLarge" color="textPrimary" style={{ marginTop: Spacing.sm }}>
          Mon panier
        </ThemedText>
        <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2, textAlign: 'center' }}>
          Plusieurs produits
        </ThemedText>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.quickCard,
          { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
        onPress={() => router.push(ROUTES.compare)}
        accessibilityRole="button"
        accessibilityLabel="Comparer deux produits"
      >
        <View style={[styles.quickIcon, { backgroundColor: Colors.safeBg, borderColor: Colors.safeLight }]}>
          <Feather name="git-branch" size={18} color={Colors.safe} />
        </View>
        <ThemedText variant="labelLarge" color="textPrimary" style={{ marginTop: Spacing.sm }}>
          Comparer
        </ThemedText>
        <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2, textAlign: 'center' }}>
          2 produits côte à côte
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
});
