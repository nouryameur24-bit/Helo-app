import { LinearGradient } from 'expo-linear-gradient';
import { ROUTES } from '@/types/routes';
import { router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { GlowScoreCircle } from '@/components/GlowScoreCircle';
import { PartnerHeroBadge } from '@/components/partner/PartnerHeroBadge';
import { PartnerModeBadge } from '@/components/partner/PartnerModeBadge';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { calculateGlowScore } from '@/lib/glowscore';
import { calculateTrimester } from '@/lib/trimester';
import { useProfile } from '@/hooks/useProfile';
import { useShelfData } from '@/hooks/useShelfData';
import { getPartnerTipForWeek } from '@/constants/partnerTips';
import { styles, partnerStyles } from './homeStyles';

export function PartnerHomeScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const { linkedUserId, linkedFirstName, dueDate } = useProfile();
  const momName = linkedFirstName ?? 'Ton proche';
  const week = dueDate ? calculateTrimester(dueDate).weekOfPregnancy : 20;

  const { shelf } = useShelfData(linkedUserId ?? undefined);
  const activeShelf = shelf;
  const { score, total } = calculateGlowScore(activeShelf);

  const tip = getPartnerTipForWeek(week);

  const recentProducts = activeShelf.slice(0, 3);

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding + Spacing.lg, paddingBottom: bottomPadding + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Lot 15A2 — Pastille discrète "Accompagnant · {momName}" en haut.
            Pose le contexte AVANT le greeting pour que Thomas ne croie pas
            voir ses propres données. Cliquable → settings de pairing. */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={{ marginBottom: Spacing.sm }}>
          <PartnerModeBadge linkedFirstName={linkedFirstName} variant="compact" />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(40).duration(500)} style={styles.header}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="bodySmall" color="textTertiary">
              Placard de {momName} · Semaine {week}
            </ThemedText>
            <ThemedText variant="headlineLarge" color="textPrimary">{momName}</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <IconButton size={44} onPress={() => router.push('/search')} accessibilityLabel="Rechercher">
              <Feather name="search" size={20} color={Colors.textSecondary} />
            </IconButton>
            <IconButton size={44} accessibilityLabel="Notifications">
              <Feather name="bell" size={20} color={Colors.textSecondary} />
            </IconButton>
          </View>
        </Animated.View>

        {/* Hero badge — partner-as-hero recognition. Anchored right under
            the greeting so it's the first thing Thomas sees on home.
            Empty-state acts as a primer-tour pulling toward the first scan. */}
        <PartnerHeroBadge />

        <Animated.View entering={FadeInDown.delay(80).duration(500)}>
          <View style={partnerStyles.tipBanner}>
            <View style={partnerStyles.tipBannerLeft}>
              <View style={partnerStyles.tipIconWrap}>
                <Feather name="zap" size={20} color={Colors.accentDark} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="labelSmall" style={{ color: Colors.accentDark, marginBottom: 4 }}>
                  TIP CO-PARENT · SEMAINE {week}
                </ThemedText>
                <ThemedText variant="labelLarge" color="textPrimary" numberOfLines={2}>
                  {tip.title}
                </ThemedText>
                <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 4 }} numberOfLines={3}>
                  {tip.body}
                </ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(130).duration(500)}>
          <View style={partnerStyles.missionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
              <Feather name="target" size={16} color={Colors.safe} />
              <ThemedText variant="labelSmall" style={{ color: Colors.safe }}>
                MISSION DE LA SEMAINE
              </ThemedText>
            </View>
            <ThemedText variant="bodyMedium" color="textSecondary">
              {tip.mission}
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(500)}>
          <Card padding={Spacing.xl} style={styles.glowCard}>
            <ThemedText variant="labelSmall" color="textTertiary" style={{ marginBottom: Spacing.md }}>
              GLOW SCORE DE {momName.toUpperCase()}
            </ThemedText>
            <View style={styles.glowCircleRow}>
              <GlowScoreCircle score={score} size="large" animated breathing={score > 0} />
            </View>
            <ThemedText variant="bodyMedium" color="textSecondary" style={styles.glowSubtitle}>
              Basé sur {total} produit{total > 1 ? 's' : ''} dans son placard
            </ThemedText>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(500)}>
          <LinearGradient
            colors={['#E8D5B0', '#C9A96E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroBanner, { borderRadius: Radius.xl }]}
          >
            <View style={styles.heroContent}>
              <ThemedText variant="headlineMedium" style={{ color: '#FFFFFF', marginBottom: 4 }}>
                Scanner pour {momName}
              </ThemedText>
              <ThemedText variant="bodySmall" style={{ color: 'rgba(255,255,255,0.85)', marginBottom: Spacing.xl }}>
                Analyse la sécurité d'un produit pour elle
              </ThemedText>
              <Pressable
                style={({ pressed }) => [
                  styles.heroButton,
                  { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
                onPress={() => router.push('/(tabs)/scan')}
                accessibilityRole="button"
                accessibilityLabel="Scanner maintenant"
              >
                <Feather name="camera" size={18} color={Colors.accentDark} />
                <Text style={styles.heroButtonText}>Scanner maintenant</Text>
              </Pressable>
            </View>
            <View style={styles.heroDecoration}>
              <View style={styles.heroCircle1} />
              <View style={styles.heroCircle2} />
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(500)} style={styles.quickRow}>
          <Pressable
            style={({ pressed }) => [
              styles.quickCard,
              { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
            onPress={() => router.push(ROUTES.partnerChecklistTab)}
            accessibilityRole="button"
            accessibilityLabel="Ma checklist"
          >
            <View style={[styles.quickIcon, { backgroundColor: Colors.safeLight, borderColor: Colors.safe + '66' }]}>
              <Feather name="check-square" size={18} color={Colors.safe} />
            </View>
            <ThemedText variant="labelLarge" color="textPrimary" style={{ marginTop: Spacing.sm }}>
              Ma checklist
            </ThemedText>
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2, textAlign: 'center' }}>
              Maison, achats, RDV
            </ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.quickCard,
              { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
            onPress={() => router.push(ROUTES.partnerWeeklyBrief)}
            accessibilityRole="button"
            accessibilityLabel="Brief co-parent"
          >
            <View style={[styles.quickIcon, { backgroundColor: Colors.accentLight + '88', borderColor: Colors.accent + '66' }]}>
              <Feather name="book-open" size={18} color={Colors.accent} />
            </View>
            <ThemedText variant="labelLarge" color="textPrimary" style={{ marginTop: Spacing.sm }}>
              Brief co-parent
            </ThemedText>
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2, textAlign: 'center' }}>
              Semaine {week}
            </ThemedText>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(500)}>
          <View style={styles.sectionHeader}>
            <ThemedText variant="headlineMedium" color="textPrimary">
              Placard de {momName}
            </ThemedText>
            <Pressable
              onPress={() => router.push('/(tabs)/shelf')}
              accessibilityRole="button"
              accessibilityLabel="Voir tout le placard"
            >
              <ThemedText variant="labelLarge" color="accent">Voir tout</ThemedText>
            </Pressable>
          </View>

          <View style={styles.scanList}>
            {recentProducts.map((product, index) => (
              <Animated.View key={product.id} entering={FadeInDown.delay(340 + index * 60).duration(400)}>
                <View style={[styles.scanCard, { backgroundColor: Colors.surface }]}>
                  <View style={[
                    styles.scanCardIcon,
                    {
                      backgroundColor:
                        product.verdict === 'safe' ? Colors.safeBg :
                        product.verdict === 'caution' ? Colors.cautionBg :
                        Colors.dangerBg,
                    },
                  ]}>
                    <Feather
                      name={
                        product.verdict === 'safe' ? 'check-circle' :
                        product.verdict === 'caution' ? 'alert-circle' :
                        'x-circle'
                      }
                      size={20}
                      color={
                        product.verdict === 'safe' ? Colors.safe :
                        product.verdict === 'caution' ? Colors.caution :
                        Colors.danger
                      }
                    />
                  </View>
                  <View style={styles.scanCardContent}>
                    <ThemedText variant="labelLarge" color="textPrimary" numberOfLines={1}>
                      {product.name}
                    </ThemedText>
                    <ThemedText variant="bodySmall" color="textTertiary">
                      {product.brand} · {product.verdictLabel}
                    </ThemedText>
                  </View>
                  <Badge variant={product.verdict as 'safe' | 'caution' | 'danger'}>{product.verdictLabel}</Badge>
                </View>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
