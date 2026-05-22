import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { styles } from './homeStyles';

interface Props {
  weekOfPregnancy: number;
  isNew: boolean;
}

export function HomeWeeklyBrief({ weekOfPregnancy, isNew }: Props) {
  return (
    <Animated.View entering={FadeInDown.delay(220).duration(500)}>
      <Pressable
        onPress={() => router.push('/weekly-brief')}
        style={({ pressed }) => [
          styles.briefCard,
          { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Brief Semaine ${weekOfPregnancy}`}
      >
        <View style={styles.briefLeft}>
          <View style={styles.briefIconWrap}>
            <Feather name="book-open" size={22} color={Colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.briefTitleRow}>
              <ThemedText variant="labelLarge" color="textPrimary">
                Brief · Semaine {weekOfPregnancy}
              </ThemedText>
              {isNew && (
                <View style={styles.newBadge}>
                  <ThemedText variant="labelSmall" style={{ color: Colors.surface }}>
                    NOUVEAU
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText variant="bodySmall" color="textSecondary">
              Conseils, alertes et découvertes de la semaine
            </ThemedText>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}
