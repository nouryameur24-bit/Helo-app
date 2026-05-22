import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { IconButton } from '@/components/ui/IconButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { GlowScoreCircle } from '@/components/GlowScoreCircle';
import { Colors, Spacing } from '@/constants/theme';
import { styles } from './homeStyles';

function CompositionBar({ count, total, color, label }: {
  count: number;
  total: number;
  color: string;
  label: string;
}) {
  const pct = total > 0 ? count / total : 0;
  return (
    <View style={styles.barRow}>
      <ThemedText variant="bodySmall" color="textSecondary" style={styles.barLabel}>
        {label}
      </ThemedText>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <ThemedText variant="bodySmall" color="textTertiary" style={styles.barCount}>
        {count}
      </ThemedText>
    </View>
  );
}

interface Props {
  score: number;
  total: number;
  countSafe: number;
  countCaution: number;
  countDanger: number;
  onShare: () => void;
}

export const GlowScoreSection = React.memo(function GlowScoreSection({ score, total, countSafe, countCaution, countDanger, onShare }: Props) {
  const hasRisk = countDanger > 0 || countCaution > 0;
  return (
    <Animated.View entering={FadeInDown.delay(240).duration(500)}>
      <View style={styles.sectionHeader}>
        <ThemedText variant="headlineMedium" color="textPrimary">Votre Glow Score</ThemedText>
        <IconButton size={36} onPress={onShare} accessibilityLabel="Partager le Glow Score">
          <Feather name="share-2" size={16} color={Colors.textSecondary} />
        </IconButton>
      </View>

      <Card padding={Spacing.xl} style={styles.glowCard}>
        <View style={styles.glowCircleRow}>
          <GlowScoreCircle
            score={score}
            size="large"
            animated
            empty={total === 0}
            breakdown={total > 0 ? { safe: countSafe, caution: countCaution, danger: countDanger } : undefined}
            breathing={total > 0}
          />
        </View>
        <ThemedText variant="bodyMedium" color="textSecondary" style={styles.glowSubtitle}>
          {total === 0
            ? 'Scannez votre premier produit pour découvrir votre Glow Score'
            : `Basé sur ${total} produit${total > 1 ? 's' : ''} de votre placard`}
        </ThemedText>

        {total > 0 && (
          <>
            <Divider style={{ marginVertical: Spacing.xl }} />
            <ThemedText variant="labelLarge" color="textPrimary" style={{ marginBottom: Spacing.md }}>
              Composition
            </ThemedText>
            <View style={styles.barsContainer}>
              <CompositionBar count={countSafe} total={total} color={Colors.safe} label="Sûrs" />
              <CompositionBar count={countCaution} total={total} color={Colors.caution} label="Vigilance" />
              <CompositionBar count={countDanger} total={total} color={Colors.danger} label="À risque" />
            </View>
          </>
        )}

        {hasRisk && (
          <Pressable
            onPress={() => router.push('/(tabs)/shelf')}
            style={({ pressed }) => [styles.improveCard, { opacity: pressed ? 0.85 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Améliorez votre score"
          >
            <View style={styles.improveCardLeft}>
              <View style={styles.improveIcon}>
                <Feather name="arrow-up-circle" size={20} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="labelLarge" color="textPrimary">
                  Améliorez votre score
                </ThemedText>
                <ThemedText variant="bodySmall" color="textSecondary">
                  {countDanger + countCaution} produit{countDanger + countCaution > 1 ? 's' : ''} à risque · voir les alternatives
                </ThemedText>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
          </Pressable>
        )}
      </Card>
    </Animated.View>
  );
});
