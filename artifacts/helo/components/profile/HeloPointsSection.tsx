/**
 * components/profile/HeloPointsSection.tsx — Section "Hēlo Points" sur Profile.
 *
 * Affiche la balance actuelle de l'utilisatrice + CTA vers /points (écran
 * complet avec catalogue récompenses et historique).
 *
 * Pattern UX :
 *   - Si balance > 0 : carte vibrante avec balance + tier + "Voir mes récompenses"
 *   - Si balance = 0 : carte invitante "Gagne tes premiers ⭐ en contribuant"
 */
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { useProfile } from '@/hooks/useProfile';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import {
  getUserPoints,
  tierEmoji,
  tierLabel,
  type UserPointsBalance,
} from '@/lib/heloPoints';

export function HeloPointsSection() {
  const profile = useProfile();
  const userId = profile?.userId;
  const [balance, setBalance] = useState<UserPointsBalance | null>(null);

  useEffect(() => {
    if (!userId) return;
    getUserPoints(userId).then(setBalance).catch(() => {});
  }, [userId]);

  const onPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/points');
  };

  // Pas encore de balance ou balance = 0 → empty state invitant
  if (!balance || balance.balance === 0) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.wrap}>
        <Card variant="elevated" style={styles.emptyCard} padding={Spacing.lg}>
          <View style={styles.iconCircle}>
            <ThemedText style={styles.iconEmoji}>⭐</ThemedText>
          </View>
          <View style={styles.contentLeft}>
            <ThemedText variant="labelLarge" style={{ fontWeight: '800' }}>
              Hēlo Points
            </ThemedText>
            <ThemedText variant="bodySmall" color="textSecondary" numberOfLines={2}>
              Gagne tes premiers ⭐ en contribuant un produit
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={22} color={Colors.textTertiary} />
        </Card>
      </TouchableOpacity>
    );
  }

  // Avec balance → carte avec stats
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.wrap}>
      <Card variant="elevated" style={styles.activeCard} padding={Spacing.lg}>
        <View style={styles.activeRow}>
          <View style={styles.balanceCol}>
            <ThemedText style={styles.balanceNumber}>
              {balance.balance}
            </ThemedText>
            <ThemedText style={styles.balanceLabel}>⭐ Hēlo Points</ThemedText>
          </View>
          <View style={styles.tierCol}>
            <ThemedText style={styles.tierEmoji}>{tierEmoji(balance.tier)}</ThemedText>
            <ThemedText variant="bodySmall" style={{ fontWeight: '600' }}>
              {tierLabel(balance.tier)}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={22} color={Colors.textTertiary} />
        </View>
        <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 6 }}>
          {balance.contributions_count} contributions · {balance.lifetime_earned} ⭐ gagnés au total
        </ThemedText>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 22,
  },
  contentLeft: {
    flex: 1,
  },
  activeCard: {
    backgroundColor: Colors.surface,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  balanceCol: {
    flex: 1,
  },
  balanceNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.accent,
    letterSpacing: -0.5,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tierCol: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  tierEmoji: {
    fontSize: 28,
  },
});
