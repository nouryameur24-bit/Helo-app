/**
 * app/points.tsx — Écran Hēlo Points : balance + historique + catalogue.
 *
 * 3 sections :
 *   1. Hero balance card (avec tier badge + progression)
 *   2. Catalogue récompenses (catégorisé)
 *   3. Historique récent (10 dernières transactions)
 */
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
import { useProfile } from '@/hooks/useProfile';
import { useSafeBack } from '@/hooks/useSafeBack';
import {
  getPointHistory,
  getRewardsCatalog,
  getUserPoints,
  nextTierThreshold,
  reasonLabel,
  redeemReward,
  tierEmoji,
  tierLabel,
  type PointTransaction,
  type Reward,
  type UserPointsBalance,
} from '@/lib/heloPoints';
import { track } from '@/lib/analytics';

export default function PointsScreen() {
  const insets = useSafeAreaInsets();
  const onBack = useSafeBack('/(tabs)/profile');
  const profile = useProfile();
  const { bonusPremiumUntil } = usePremium();
  const userId = profile?.userId;

  const [balance, setBalance] = useState<UserPointsBalance | null>(null);
  const [history, setHistory] = useState<PointTransaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!userId) return;
    const [b, h, r] = await Promise.all([
      getUserPoints(userId),
      getPointHistory(userId, 15),
      getRewardsCatalog(),
    ]);
    setBalance(b);
    setHistory(h);
    setRewards(r);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const onRedeem = useCallback(
    async (reward: Reward) => {
      if (!userId || !balance) return;
      if (balance.balance < reward.cost) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        Alert.alert(
          'Pas assez de points',
          `Il te manque ${reward.cost - balance.balance} ⭐ pour cette récompense.`,
        );
        return;
      }

      Alert.alert(
        'Confirmer l\'échange',
        `Tu vas dépenser ${reward.cost} ⭐ pour : ${reward.name}.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Confirmer',
            style: 'default',
            onPress: async () => {
              const res = await redeemReward({ userId, rewardSlug: reward.slug });
              if (!res) {
                Alert.alert('Erreur', 'Impossible de finaliser l\'échange. Réessaie.');
                return;
              }
              if (res.status === 'redeemed') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                track('reward_redeemed', {
                  reward_slug: reward.slug,
                  cost: reward.cost,
                  category: reward.category,
                }).catch(() => {});
                Alert.alert(
                  '🎉 Récompense activée !',
                  `Tu as échangé ${reward.cost} ⭐ pour : ${reward.name}.`,
                );
                await loadData();
              } else if (res.status === 'insufficient_balance') {
                Alert.alert('Pas assez de points', 'Quelqu\'un a été plus rapide ou ton solde a changé. Recharge.');
                await loadData();
              } else if (res.status === 'out_of_stock') {
                Alert.alert('En rupture', 'Cette récompense est temporairement épuisée.');
              } else {
                Alert.alert('Erreur', 'Récompense introuvable.');
              }
            },
          },
        ],
      );
    },
    [userId, balance, loadData],
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <Header onBack={onBack} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText color="textTertiary">Chargement…</ThemedText>
        </View>
      </View>
    );
  }

  const nextTier = nextTierThreshold(balance?.lifetime_earned ?? 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header onBack={onBack} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO — Balance + Tier */}
        <Card variant="elevated" style={styles.heroCard} padding={Spacing.xl}>
          <View style={styles.tierRow}>
            <ThemedText style={styles.tierEmoji}>{tierEmoji(balance?.tier ?? 'bronze')}</ThemedText>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <ThemedText variant="bodySmall" color="textSecondary">
                Ton tier
              </ThemedText>
              <ThemedText variant="headlineMedium" style={{ fontWeight: '800' }}>
                {tierLabel(balance?.tier ?? 'bronze')}
              </ThemedText>
            </View>
          </View>

          <View style={styles.balanceBlock}>
            <ThemedText style={styles.balanceNumber}>
              {balance?.balance ?? 0}
            </ThemedText>
            <ThemedText style={styles.balanceStar}> ⭐</ThemedText>
          </View>

          <ThemedText variant="bodySmall" color="textSecondary" style={{ textAlign: 'center' }}>
            {(balance?.lifetime_earned ?? 0)} pts gagnés au total · {balance?.contributions_count ?? 0} contributions
          </ThemedText>

          {nextTier && (
            <View style={styles.nextTier}>
              <Feather name="arrow-up-right" size={14} color={Colors.accent} />
              <ThemedText variant="bodySmall" style={{ color: Colors.accent, marginLeft: 6 }}>
                Plus que {nextTier.remaining} ⭐ pour passer {tierLabel(nextTier.next)} {tierEmoji(nextTier.next)}
              </ThemedText>
            </View>
          )}
        </Card>

        {/* CTA contribuer */}
        <TouchableOpacity
          style={styles.contributeCta}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            router.push('/(tabs)/scan');
          }}
          activeOpacity={0.85}
        >
          <Feather name="camera" size={20} color="#fff" />
          <ThemedText style={styles.contributeCtaText}>
            Gagne jusqu'à 160 ⭐ par scan
          </ThemedText>
          <Feather name="chevron-right" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Premium offert actif (Phase 1.5 fulfillment) */}
        {bonusPremiumUntil && (
          <View style={styles.premiumActiveBanner}>
            <Feather name="award" size={18} color="#E65100" />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <ThemedText variant="labelLarge" style={{ color: '#E65100', fontWeight: '800' }}>
                👑 Premium actif jusqu'au{' '}
                {bonusPremiumUntil.toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </ThemedText>
              <ThemedText variant="bodySmall" style={{ color: '#BF360C' }}>
                Récompense Hēlo Points active. Toutes les features Premium débloquées.
              </ThemedText>
            </View>
          </View>
        )}

        {/* CATALOGUE */}
        <ThemedText variant="headlineMedium" style={styles.sectionTitle}>
          🎁 Récompenses
        </ThemedText>

        {rewards.length === 0 ? (
          <ThemedText variant="bodySmall" color="textSecondary" style={{ paddingHorizontal: Spacing.lg }}>
            Catalogue en cours de chargement…
          </ThemedText>
        ) : (
          rewards.map((r) => {
            const affordable = (balance?.balance ?? 0) >= r.cost;
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.rewardCard, !affordable && styles.rewardCardLocked]}
                onPress={() => onRedeem(r)}
                activeOpacity={0.85}
              >
                <View style={styles.rewardLeft}>
                  <ThemedText variant="labelLarge" style={{ fontWeight: '700' }}>
                    {r.name}
                  </ThemedText>
                  {r.description ? (
                    <ThemedText variant="bodySmall" color="textSecondary" numberOfLines={2}>
                      {r.description}
                    </ThemedText>
                  ) : null}
                </View>
                <View style={styles.rewardRight}>
                  <Badge variant={affordable ? 'safe' : 'accent'}>
                    {r.cost} ⭐
                  </Badge>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* HISTORIQUE */}
        <ThemedText variant="headlineMedium" style={styles.sectionTitle}>
          📜 Historique
        </ThemedText>

        {history.length === 0 ? (
          <EmptyState
            emoji="📦"
            title="Aucune transaction pour l'instant"
            subtitle="Tes points apparaîtront ici dès que tu scanneras un produit."
            ctaLabel="Scanner mon premier produit"
            onCta={() => router.push('/(tabs)/scan')}
          />
        ) : (
          history.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="labelLarge" style={{ fontWeight: '600' }}>
                  {reasonLabel(tx.reason)}
                </ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary">
                  {new Date(tx.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </ThemedText>
              </View>
              <ThemedText
                style={[
                  styles.txAmount,
                  { color: tx.amount > 0 ? Colors.safe : Colors.danger },
                ]}
              >
                {tx.amount > 0 ? '+' : ''}
                {tx.amount} ⭐
              </ThemedText>
            </View>
          ))
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={16} accessibilityLabel="Retour">
        <Feather name="chevron-left" size={28} color={Colors.textPrimary} />
      </TouchableOpacity>
      <ThemedText variant="headlineMedium" style={styles.headerTitle}>
        Hēlo Points
      </ThemedText>
      <View style={{ width: 28 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: { fontWeight: '800' },
  scroll: { paddingBottom: Spacing.xxl },
  heroCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
  },
  tierRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  tierEmoji: { fontSize: 36 },
  balanceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  balanceNumber: { fontSize: 56, fontWeight: '900', color: Colors.accent, letterSpacing: -1 },
  balanceStar: { fontSize: 32 },
  nextTier: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  contributeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.md,
    ...Shadows.soft,
  },
  contributeCtaText: { color: '#fff', fontWeight: '700', flex: 1, fontSize: 15 },
  premiumActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE0B2',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  sectionTitle: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    fontWeight: '800',
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rewardCardLocked: { opacity: 0.55 },
  rewardLeft: { flex: 1, paddingRight: Spacing.md },
  rewardRight: {},
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  txAmount: { fontSize: 16, fontWeight: '700' },
});
