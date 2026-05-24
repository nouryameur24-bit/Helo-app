/**
 * PartnerHeroBadge — The "héros UX" surface for the partner home screen.
 *
 * Why a dedicated card rather than reusing the existing avatar badge
 * (`ProfileHeader.contributriceBadge`)?
 *   • The partner home is where Thomas spends his time — the badge needs
 *     prime real estate at the top of his daily-driver screen, not buried
 *     in a Profile tab he visits less often.
 *   • The visual language ("Tu es le héros") differs from the contribution
 *     badge ("merci pour ta contribution"). Heroism is a stronger frame
 *     than gratitude — emoji-forward, gold-toned, with a clear progress
 *     arc towards the next tier.
 *
 * Empty-state intentional: when count === 0 we show a "primer-tour" card
 * that invites the first scan rather than hiding the component entirely.
 * Hiding it would mean the partner doesn't even know the system exists
 * until after the first scan — defeating the onboarding pull.
 */
import { Feather } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { usePartnerStats } from '@/hooks/usePartnerStats';

export function PartnerHeroBadge() {
  const { linkedFirstName } = useProfile();
  const momName = linkedFirstName ?? 'ta partenaire';
  const { count, tier } = usePartnerStats();

  // Subtle "grow on mount" animation for the emoji — gives a small feel
  // of unlocking, even though the value is loaded from storage. The
  // sequence (1.0 → 1.18 → 1.0) reads as "pop" rather than "swell".
  const emojiScale = useSharedValue(1);
  useEffect(() => {
    emojiScale.value = withSequence(
      withTiming(1.18, { duration: 240, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 240, easing: Easing.inOut(Easing.cubic) }),
    );
    // Re-trigger the pop when the tier level changes so a level-up reads
    // as a celebration rather than a silent number bump.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier.level]);

  const emojiAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  // ── Empty state ──────────────────────────────────────────────────────────
  // Brand-new partner: no scans yet. Frame as an invitation rather than a
  // "0 / 3" progress shell — counting from zero feels punitive, an open
  // invitation feels welcoming.
  if (count === 0) {
    return (
      <Animated.View entering={FadeInDown.delay(100).duration(500)}>
        <Card padding={Spacing.lg} style={styles.card}>
          <View style={styles.row}>
            <Animated.View style={[styles.emojiWrap, emojiAnimStyle]}>
              <ThemedText style={styles.emoji}>{tier.emoji}</ThemedText>
            </Animated.View>
            <View style={styles.center}>
              <ThemedText variant="labelSmall" style={styles.eyebrow}>
                MODE HÉROS
              </ThemedText>
              <ThemedText variant="headlineMedium" color="textPrimary">
                Prêt à devenir son héros ?
              </ThemedText>
              <ThemedText
                variant="bodySmall"
                color="textSecondary"
                style={styles.subtitle}
              >
                {`Scanne ton premier produit pour ${momName} et débloque ton badge.`}
              </ThemedText>
            </View>
          </View>
        </Card>
      </Animated.View>
    );
  }

  // ── Engaged state ─────────────────────────────────────────────────────────
  // Has at least one scan. Show tier label, scan count, and progress bar
  // to the next tier (or a "max tier reached" message at level 3).
  const progress = tier.nextThreshold
    ? Math.min(1, count / tier.nextThreshold)
    : 1;
  const scansRemaining = tier.nextThreshold
    ? Math.max(0, tier.nextThreshold - count)
    : 0;

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(500)}>
      <Card padding={Spacing.lg} style={styles.card}>
        <View style={styles.row}>
          <Animated.View style={[styles.emojiWrap, emojiAnimStyle]}>
            <ThemedText style={styles.emoji}>{tier.emoji}</ThemedText>
          </Animated.View>

          <View style={styles.center}>
            <ThemedText variant="labelSmall" style={styles.eyebrow}>
              MODE HÉROS · NIVEAU {tier.level}
            </ThemedText>
            <ThemedText variant="headlineMedium" color="textPrimary">
              {tier.label}
            </ThemedText>
            <ThemedText
              variant="bodySmall"
              color="textSecondary"
              style={styles.subtitle}
            >
              {`${count} scan${count > 1 ? 's' : ''} réalisé${count > 1 ? 's' : ''} pour ${momName}`}
            </ThemedText>

            {/* Progress bar — only when there's still a tier to reach */}
            {tier.nextThreshold !== null ? (
              <View style={styles.progressBlock}>
                <View
                  style={styles.progressTrack}
                  accessibilityRole="progressbar"
                  accessibilityLabel={`Progression vers le niveau suivant`}
                  accessibilityValue={{
                    min: 0,
                    max: tier.nextThreshold,
                    now: count,
                  }}
                >
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progress * 100}%` },
                    ]}
                  />
                </View>
                <ThemedText
                  variant="bodySmall"
                  color="textTertiary"
                  style={styles.progressLabel}
                >
                  {`${count} / ${tier.nextThreshold} pour le niveau suivant`}
                  {scansRemaining > 0
                    ? `  ·  encore ${scansRemaining}`
                    : ''}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.maxedRow}>
                <Feather name="award" size={14} color={Colors.accentDark} />
                <ThemedText
                  variant="bodySmall"
                  style={styles.maxedLabel}
                >
                  Niveau maximum atteint
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  emojiWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 32,
    lineHeight: 40,
  },
  center: {
    flex: 1,
  },
  eyebrow: {
    color: Colors.accentDark,
    marginBottom: 2,
  },
  subtitle: {
    marginTop: 2,
  },
  progressBlock: {
    marginTop: Spacing.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.borderLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
  },
  progressLabel: {
    marginTop: 4,
  },
  maxedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  maxedLabel: {
    color: Colors.accentDark,
    fontWeight: '600',
  },
});
