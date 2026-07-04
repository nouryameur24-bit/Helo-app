import { swallow } from '@/lib/swallow';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Alert, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GlowScoreMini } from '@/components/GlowScoreMini';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { useBreastfeeding } from '@/hooks/useBreastfeeding';
import { useContributions } from '@/hooks/useContributions';
import { useProfile } from './ProfileContext';
import { useShelfData } from '@/hooks/useShelfData';
import { calculateGlowScore } from '@/lib/glowscore';
import {
  checkAndSendWeekMilestoneNotification,
} from '@/lib/circleUtils';

import { computeWeekFromDueDate } from './profileHelpers';
import styles from './profileStyles';
import { useProfileStats } from './useProfileStats';

export function ProfileHeader() {
  const { userId, role, firstName, trimester, dueDate, linkedFirstName } = useProfile();
  const isPartner = role === 'partner';
  const { isBreastfeeding } = useBreastfeeding();

  const { shelf: profileShelf } = useShelfData(userId || undefined);
  const { score: glowScore } = calculateGlowScore(profileShelf);

  const { contributionCount, scanCount, safeCount } = useProfileStats(userId, isPartner);

  // Local Ghost Capture counter (AsyncStorage) — independent from the server
  // `contributionCount` because we need offline-safe, latency-free badge
  // updates the moment a contribution is saved.
  const { count: localContribCount, tier } = useContributions();

  useEffect(() => {
    if (!userId || isPartner || !firstName) return;
    const week = computeWeekFromDueDate(dueDate);
    if (week && week >= 1 && week <= 42) {
      checkAndSendWeekMilestoneNotification({ firstName, currentWeek: week }).catch(swallow);
    }
  }, [userId, isPartner, firstName, dueDate]);

  const displayName = firstName || (isPartner ? 'Partenaire' : 'Utilisateur');
  const trimesterLabel = trimester ? `${trimester}e trimestre` : null;
  const currentWeek = computeWeekFromDueDate(dueDate);
  const isPostPartum = currentWeek !== null && currentWeek > 40;
  const weekProgress = currentWeek ? Math.min(1, currentWeek / 40) : 0;

  const weekAndTrimesterLabel = (() => {
    if (isBreastfeeding) return 'Mode allaitement';
    if (isPostPartum) return "Après l'accouchement";
    if (currentWeek && trimesterLabel) return `Semaine ${currentWeek} · ${trimesterLabel}`;
    if (trimesterLabel) return trimesterLabel;
    return null;
  })();

  const initial = displayName.charAt(0).toUpperCase();
  const safePercent = scanCount > 0 ? Math.round((safeCount / scanCount) * 100) : 0;

  return (
    <>
      {/* Header Avatar */}
      <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.avatarSection}>
        <LinearGradient
          colors={isPartner ? ['#A8C4E0', '#6B9BBF'] : [Colors.accentLight, Colors.accent]}
          style={styles.avatar}
        >
          <ThemedText variant="headlineLarge" style={styles.avatarInitial}>
            {initial}
          </ThemedText>
        </LinearGradient>
        <View style={styles.avatarInfo}>
          <ThemedText variant="headlineLarge" color="textPrimary">{displayName}</ThemedText>
          {isPartner ? (
            <ThemedText variant="bodyMedium" color="textSecondary">
              {linkedFirstName ? `Partenaire de ${linkedFirstName}` : 'Mode Partenaire'}
            </ThemedText>
          ) : weekAndTrimesterLabel ? (
            <ThemedText variant="bodyMedium" color="textSecondary">{weekAndTrimesterLabel}</ThemedText>
          ) : null}
          {!isPartner && localContribCount > 0 && (
            <Pressable
              onPress={() =>
                Alert.alert(
                  'Tes contributions',
                  `Tu as contribué à ${localContribCount} produit${localContribCount > 1 ? 's' : ''}. Merci !`,
                )
              }
              accessibilityRole="button"
              accessibilityLabel={`Badge ${tier.label}, ${localContribCount} contributions`}
              style={({ pressed }) => [
                styles.contributriceBadge,
                pressed && { opacity: 0.7 },
              ]}
              hitSlop={6}
            >
              <ThemedText variant="labelSmall" style={styles.contributriceBadgeText}>
                {'⭐'.repeat(tier.stars)} {tier.label}
              </ThemedText>
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Pregnancy progress bar */}
      {!isPartner && (
        <Animated.View entering={FadeInDown.delay(60).duration(500)} style={styles.progressSection}>
          <View
            style={styles.progressBar}
            accessibilityRole="progressbar"
            accessibilityLabel={`Semaine ${currentWeek ?? 0} sur 40`}
            accessibilityValue={{ min: 0, max: 40, now: currentWeek ?? 0 }}
          >
            <View style={[styles.progressFill, { width: `${weekProgress * 100}%` }]} />
          </View>
          <ThemedText variant="bodySmall" color="textTertiary" style={styles.progressLabel}>
            {currentWeek ? `${currentWeek} / 40 semaines` : '0 / 40 semaines'}
          </ThemedText>
        </Animated.View>
      )}

      {/* GlowScoreMini */}
      {!isPartner && (
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Card style={styles.glowCard} padding={Spacing.xl}>
            <View style={styles.glowCardInner}>
              <GlowScoreMini score={glowScore} trend="stable" />
            </View>
          </Card>
        </Animated.View>
      )}

      {/* Stats grid */}
      {!isPartner && (
        <Animated.View entering={FadeInDown.delay(140).duration(500)} style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <Card style={styles.statCard} padding={Spacing.lg}>
              <ThemedText variant="headlineLarge" color="accent">{String(scanCount)}</ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary">Scans</ThemedText>
            </Card>
            <Card style={styles.statCard} padding={Spacing.lg}>
              <ThemedText variant="headlineLarge" color="accent">{String(safeCount)}</ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary">Produits sûrs</ThemedText>
            </Card>
          </View>
          <View style={styles.statsRow}>
            <Card style={styles.statCard} padding={Spacing.lg}>
              <ThemedText variant="headlineLarge" color="accent">{`${safePercent}%`}</ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary">% safe</ThemedText>
            </Card>
            <Card style={styles.statCard} padding={Spacing.lg}>
              <ThemedText variant="headlineLarge" color="accent">{String(contributionCount)}</ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary">Contributions</ThemedText>
            </Card>
          </View>
        </Animated.View>
      )}

      {/* Tes contributions */}
      {!isPartner && contributionCount > 0 && (
        <Animated.View entering={FadeInDown.delay(170).duration(500)}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
            VOS CONTRIBUTIONS
          </ThemedText>
          <Card padding={Spacing.lg} style={styles.contribCard}>
            <View style={styles.contribRow}>
              <View style={styles.contribIconCircle}>
                <ThemedText style={{ fontSize: 22 }}>🤝</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="bodyLarge" color="textPrimary">
                  {contributionCount} produit{contributionCount > 1 ? 's' : ''} ajouté{contributionCount > 1 ? 's' : ''} à la communauté
                </ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
                  {contributionCount >= 5
                    ? 'Tu es Contributrice Hēlo 🏅'
                    : `Encore ${5 - contributionCount} pour devenir Contributrice Hēlo`}
                </ThemedText>
              </View>
            </View>
          </Card>
        </Animated.View>
      )}
    </>
  );
}
