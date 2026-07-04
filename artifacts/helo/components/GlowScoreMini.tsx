import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GlowScoreCircle } from '@/components/GlowScoreCircle';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getGlowLabel } from '@/lib/glowscore';

interface GlowScoreMiniProps {
  score: number;
  trend?: 'up' | 'down' | 'stable';
  animated?: boolean;
}

export function GlowScoreMini({ score, trend = 'stable', animated = false }: GlowScoreMiniProps) {
  const glowLabel = getGlowLabel(score);

  const trendIcon =
    trend === 'up' ? 'trending-up' :
    trend === 'down' ? 'trending-down' :
    'minus';

  const trendColor =
    trend === 'up' ? Colors.safe :
    trend === 'down' ? Colors.danger :
    Colors.textTertiary;

  return (
    <View style={styles.container}>
      <GlowScoreCircle score={score} size="small" animated={animated} />
      <View style={styles.info}>
        <ThemedText variant="labelLarge" color="textPrimary">
          Glow Score
        </ThemedText>
        <View style={styles.row}>
          <ThemedText variant="bodySmall" style={{ color: glowLabel.color }}>
            {glowLabel.label}
          </ThemedText>
          <View style={styles.trendBadge}>
            <Feather name={trendIcon} size={12} color={trendColor} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  info: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  trendBadge: {
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
