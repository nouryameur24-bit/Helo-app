import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { IconButton } from '@/components/ui/IconButton';
import { PulsingHelpButton } from '@/components/ui/PulsingHelpButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { ROUTES } from '@/types/routes';
import { styles } from './homeStyles';

interface Props {
  displayName: string;
  weekOfPregnancy: number;
}

export function HomeHeader({ displayName, weekOfPregnancy }: Props) {
  return (
    <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.header}>
      <View>
        <ThemedText variant="bodySmall" color="textTertiary">Bonjour</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <ThemedText variant="headlineLarge" color="textPrimary">{displayName}</ThemedText>
          <View style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 6,
            backgroundColor: Colors.accentLight,
            borderWidth: 1,
            borderColor: Colors.accent,
          }}>
            <ThemedText variant="labelSmall" style={{ color: Colors.accentDark, fontSize: 10, letterSpacing: 0.8 }}>
              BÊTA
            </ThemedText>
          </View>
        </View>
        {weekOfPregnancy > 0 && (
          <View style={styles.weekPill}>
            <ThemedText variant="labelSmall" style={{ color: Colors.accentDark }}>
              Semaine {weekOfPregnancy}
            </ThemedText>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <IconButton size={44} onPress={() => router.push('/search')} accessibilityLabel="Rechercher">
          <Feather name="search" size={20} color={Colors.textSecondary} />
        </IconButton>
        <PulsingHelpButton onPress={() => router.push(ROUTES.guide)} />
        <IconButton size={44} accessibilityLabel="Notifications">
          <Feather name="bell" size={20} color={Colors.textSecondary} />
        </IconButton>
      </View>
    </Animated.View>
  );
}
