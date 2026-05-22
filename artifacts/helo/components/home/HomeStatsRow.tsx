import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { styles } from './homeStyles';

interface Props {
  total: number;
  countSafe: number;
  countCaution: number;
  countDanger: number;
}

export const HomeStatsRow = React.memo(function HomeStatsRow({ total, countSafe, countCaution, countDanger }: Props) {
  if (total === 0) {
    return (
      <Animated.View entering={FadeInDown.delay(180).duration(500)}>
        <Card padding={Spacing.lg}>
          <View style={styles.scanNudgeRow}>
            <View style={styles.scanNudgeIcon}>
              <Feather name="zap" size={20} color={Colors.accentDark} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="labelLarge" color="textPrimary">Scannez votre premier produit</ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 2 }}>
                Votre Glow Score se construit à chaque analyse
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
          </View>
        </Card>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(180).duration(500)} style={styles.statsRow}>
      <Card style={styles.statCard} padding={Spacing.lg}>
        <ThemedText variant="displayMedium" color="accent">{total}</ThemedText>
        <ThemedText variant="bodySmall" color="textSecondary">Scannés</ThemedText>
      </Card>
      <Card style={styles.statCard} padding={Spacing.lg}>
        <ThemedText variant="displayMedium" style={{ color: Colors.safe }}>{countSafe}</ThemedText>
        <ThemedText variant="bodySmall" color="textSecondary">Sûrs</ThemedText>
      </Card>
      <Card style={styles.statCard} padding={Spacing.lg}>
        <ThemedText variant="displayMedium" style={{ color: Colors.caution }}>{countCaution + countDanger}</ThemedText>
        <ThemedText variant="bodySmall" color="textSecondary">À vérifier</ThemedText>
      </Card>
    </Animated.View>
  );
});
