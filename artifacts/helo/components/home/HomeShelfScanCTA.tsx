import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { ROUTES } from '@/types/routes';
import { styles } from './homeStyles';

interface Props {
  isPremium: boolean;
}

export const HomeShelfScanCTA = React.memo(function HomeShelfScanCTA({ isPremium }: Props) {
  return (
    <Animated.View entering={FadeInDown.delay(165).duration(500)}>
      <Pressable
        style={({ pressed }) => [
          styles.shelfScanCard,
          { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
        onPress={() => router.push(ROUTES.shelfScan)}
        accessibilityRole="button"
        accessibilityLabel="Scanner une étagère"
      >
        <View style={styles.shelfScanIconWrap}>
          <Feather name="layers" size={22} color={Colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText variant="labelLarge" color="textPrimary">
            Scanner une étagère
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 2 }}>
            Analysez tous vos produits en une photo
          </ThemedText>
        </View>
        {!isPremium && (
          <View style={styles.shelfScanPremium}>
            <Feather name="star" size={10} color={Colors.accentDark} />
            <ThemedText style={styles.shelfScanPremiumText}>PREMIUM</ThemedText>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});
