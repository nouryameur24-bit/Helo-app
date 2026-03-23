import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ShareBottomSheet } from '@/components/share/ShareBottomSheet';
import { GlowScoreShareCard } from '@/components/share/GlowScoreShareCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { IconButton } from '@/components/ui/IconButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { GlowScoreCircle } from '@/components/GlowScoreCircle';
import { GlowScoreMini } from '@/components/GlowScoreMini';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { calculateGlowScore, getGlowLabel } from '@/lib/glowscore';
import { useTrimester } from '@/hooks/useTrimester';
import { useWeeklyBrief } from '@/hooks/useWeeklyBrief';
import { useProfile } from '@/hooks/useProfile';
import { useShelfData } from '@/hooks/useShelfData';
import type { ShelfProduct } from '@/components/shelf/ShelfCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RECENT_SCANS = [
  {
    id: '1',
    name: 'Crème hydratante Nuxe',
    brand: 'NUXE',
    status: 'safe' as const,
    statusLabel: 'Sûr',
    date: 'Aujourd\'hui',
    ingredients: 12,
  },
  {
    id: '2',
    name: 'Shampooing doux Klorane',
    brand: 'KLORANE',
    status: 'caution' as const,
    statusLabel: 'Vigilance',
    date: 'Hier',
    ingredients: 8,
  },
  {
    id: '3',
    name: 'Sérum vitamine C',
    brand: 'VICHY',
    status: 'safe' as const,
    statusLabel: 'Sûr',
    date: '12 mars',
    ingredients: 15,
  },
];

const MOCK_SHELF: ShelfProduct[] = [
  { id: '1', name: 'Crème hydratante Nuxe', brand: 'NUXE', verdict: 'safe', verdictLabel: 'Sûr', category: 'salle-de-bain', verdictChanged: false },
  { id: '2', name: 'Shampooing doux', brand: 'KLORANE', verdict: 'caution', verdictLabel: 'Vigilance', category: 'salle-de-bain', verdictChanged: true },
  { id: '3', name: 'Gel douche aloe vera', brand: 'GARNIER', verdict: 'safe', verdictLabel: 'Sûr', category: 'salle-de-bain', verdictChanged: false },
  { id: '4', name: 'Sérum vitamine C', brand: 'VICHY', verdict: 'safe', verdictLabel: 'Sûr', category: 'pharmacie', verdictChanged: false },
  { id: '5', name: 'Fond de teint Bourjois', brand: 'BOURJOIS', verdict: 'danger', verdictLabel: 'Déconseillé', category: 'salle-de-bain', verdictChanged: true },
  { id: '6', name: 'Huile de coco bio', brand: 'NATURALIA', verdict: 'safe', verdictLabel: 'Sûr', category: 'cuisine', verdictChanged: false },
];

const statusColors = {
  safe: { bg: Colors.safeBg, accent: Colors.safe, icon: 'check-circle' as const },
  caution: { bg: Colors.cautionBg, accent: Colors.caution, icon: 'alert-circle' as const },
  danger: { bg: Colors.dangerBg, accent: Colors.danger, icon: 'x-circle' as const },
};

function ScanCard({ item, index }: { item: typeof RECENT_SCANS[0]; index: number }) {
  const { bg, accent, icon } = statusColors[item.status];
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <Pressable
        style={({ pressed }) => [
          styles.scanCard,
          { backgroundColor: Colors.surface, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <View style={[styles.scanCardIcon, { backgroundColor: bg }]}>
          <Feather name={icon} size={20} color={accent} />
        </View>
        <View style={styles.scanCardContent}>
          <ThemedText variant="labelLarge" color="textPrimary" numberOfLines={1}>
            {item.name}
          </ThemedText>
          <ThemedText variant="bodySmall" color="textTertiary">
            {item.brand} · {item.date}
          </ThemedText>
        </View>
        <Badge variant={item.status}>{item.statusLabel}</Badge>
      </Pressable>
    </Animated.View>
  );
}

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
        <View
          style={[
            styles.barFill,
            { width: `${pct * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
      <ThemedText variant="bodySmall" color="textTertiary" style={styles.barCount}>
        {count}
      </ThemedText>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const { role, userId, linkedUserId, firstName, linkedFirstName } = useProfile();
  const isPartner = role === 'partner';
  const shelfUserId = isPartner && linkedUserId ? linkedUserId : userId;
  const displayName = isPartner ? (linkedFirstName ?? 'Votre proche') : (firstName || 'Hēlo');

  const { weekOfPregnancy } = useTrimester();
  const { isNew } = useWeeklyBrief(weekOfPregnancy);

  const { shelf: realShelf } = useShelfData(shelfUserId || undefined);
  const activeShelf = realShelf.length > 0 ? realShelf : MOCK_SHELF;

  const { score, countSafe, countCaution, countDanger, total } = calculateGlowScore(activeShelf);
  const glowLabel = getGlowLabel(score);
  const hasRisk = countDanger > 0 || countCaution > 0;

  const [glowShareVisible, setGlowShareVisible] = useState(false);

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* Glow score share bottom sheet */}
      {glowShareVisible && (
        <ShareBottomSheet
          visible={glowShareVisible}
          onClose={() => setGlowShareVisible(false)}
          card={
            <GlowScoreShareCard
              score={score}
              week={weekOfPregnancy}
              scanCount={total}
              safeCount={countSafe}
              dangerCount={countDanger}
            />
          }
        />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding + Spacing.lg, paddingBottom: bottomPadding + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.header}>
          <View>
            <ThemedText variant="bodySmall" color="textTertiary">
              {isPartner ? `Placard de` : 'Bonjour'}
            </ThemedText>
            <ThemedText variant="headlineLarge" color="textPrimary">{displayName}</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <IconButton size={44} onPress={() => router.push('/search')}>
              <Feather name="search" size={20} color={Colors.textSecondary} />
            </IconButton>
            <IconButton size={44}>
              <Feather name="bell" size={20} color={Colors.textSecondary} />
            </IconButton>
          </View>
        </Animated.View>

        {/* Hero Scan CTA */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroSection}>
          <LinearGradient
            colors={['#E8D5B0', '#C9A96E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroContent}>
              <ThemedText variant="headlineMedium" style={{ color: '#FFFFFF', marginBottom: 4 }}>
                Scanner un produit
              </ThemedText>
              <ThemedText variant="bodySmall" style={{ color: 'rgba(255,255,255,0.85)', marginBottom: Spacing.xl }}>
                Analysez la sécurité des ingrédients en quelques secondes
              </ThemedText>
              <Pressable
                style={({ pressed }) => [
                  styles.heroButton,
                  { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
                onPress={() => router.push('/(tabs)/scan')}
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

        {/* Mon Panier shortcut */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <Pressable
            style={({ pressed }) => [
              styles.basketCard,
              { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
            onPress={() => router.push('/basket-scan' as never)}
          >
            <View style={styles.basketIcon}>
              <Feather name="shopping-cart" size={20} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="labelLarge" color="textPrimary">Scanner mon panier</ThemedText>
              <ThemedText variant="bodySmall" color="textTertiary">
                Analysez plusieurs produits d'un coup
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
          </Pressable>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.delay(180).duration(500)} style={styles.statsRow}>
          <Card style={styles.statCard} padding={Spacing.lg}>
            <ThemedText variant="displayMedium" color="accent">3</ThemedText>
            <ThemedText variant="bodySmall" color="textSecondary">Scans aujourd'hui</ThemedText>
          </Card>
          <Card style={styles.statCard} padding={Spacing.lg}>
            <ThemedText variant="displayMedium" style={{ color: Colors.safe }}>2</ThemedText>
            <ThemedText variant="bodySmall" color="textSecondary">Produits sûrs</ThemedText>
          </Card>
          <Card style={styles.statCard} padding={Spacing.lg}>
            <ThemedText variant="displayMedium" style={{ color: Colors.caution }}>1</ThemedText>
            <ThemedText variant="bodySmall" color="textSecondary">À vérifier</ThemedText>
          </Card>
        </Animated.View>

        {/* ── WEEKLY BRIEF (pregnant only) ── */}
        {!isPartner && (
        <Animated.View entering={FadeInDown.delay(220).duration(500)}>
          <Pressable
            onPress={() => router.push('/weekly-brief')}
            style={({ pressed }) => [
              styles.briefCard,
              { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
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
        )}

        {/* ── GLOW SCORE ── */}
        <Animated.View entering={FadeInDown.delay(240).duration(500)}>
          <View style={styles.sectionHeader}>
            <ThemedText variant="headlineMedium" color="textPrimary">Votre Glow Score</ThemedText>
            {!isPartner && (
              <IconButton size={36} onPress={() => setGlowShareVisible(true)}>
                <Feather name="share-2" size={16} color={Colors.textSecondary} />
              </IconButton>
            )}
          </View>

          {/* Main circle */}
          <Card padding={Spacing.xxl} style={styles.glowCard}>
            <View style={styles.glowCircleRow}>
              <GlowScoreCircle score={score} size="large" animated />
            </View>
            <ThemedText
              variant="bodyMedium"
              color="textSecondary"
              style={styles.glowSubtitle}
            >
              Basé sur {total} produit{total > 1 ? 's' : ''} de votre placard
            </ThemedText>

            <Divider style={{ marginVertical: Spacing.xl }} />

            {/* Composition bars */}
            <ThemedText variant="labelLarge" color="textPrimary" style={{ marginBottom: Spacing.md }}>
              Composition
            </ThemedText>
            <View style={styles.barsContainer}>
              <CompositionBar count={countSafe} total={total} color={Colors.safe} label="Sûrs" />
              <CompositionBar count={countCaution} total={total} color={Colors.caution} label="Vigilance" />
              <CompositionBar count={countDanger} total={total} color={Colors.danger} label="À risque" />
            </View>

            {/* Améliorer card (pregnant only) */}
            {!isPartner && hasRisk && (
              <Pressable
                onPress={() => router.push('/(tabs)/shelf')}
                style={({ pressed }) => [
                  styles.improveCard,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
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

        {/* Recent scans */}
        <Animated.View entering={FadeInDown.delay(320).duration(500)}>
          <View style={styles.sectionHeader}>
            <ThemedText variant="headlineMedium" color="textPrimary">Récents</ThemedText>
            <Pressable>
              <ThemedText variant="labelLarge" color="accent">Voir tout</ThemedText>
            </Pressable>
          </View>

          <View style={styles.scanList}>
            {RECENT_SCANS.map((item, index) => (
              <ScanCard key={item.id} item={item} index={index} />
            ))}
          </View>
        </Animated.View>

        {/* Disclaimer */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <Card style={styles.disclaimerCard} padding={Spacing.lg}>
            <View style={styles.disclaimerHeader}>
              <Feather name="info" size={14} color={Colors.textTertiary} />
              <ThemedText variant="labelSmall" color="textTertiary" style={{ marginLeft: 6 }}>
                INFORMATION MÉDICALE
              </ThemedText>
            </View>
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 6, lineHeight: 18 }}>
              Hēlo est un outil d'information. Consultez votre médecin avant de modifier vos habitudes pendant la grossesse.
            </ThemedText>
          </Card>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroSection: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  heroBanner: {
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    overflow: 'hidden',
  },
  heroContent: {
    zIndex: 1,
  },
  heroButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    ...Typography.labelLarge,
    color: Colors.accentDark,
  },
  heroDecoration: {
    position: 'absolute',
    right: -20,
    top: -20,
    bottom: -20,
  },
  heroCircle1: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    position: 'absolute',
    right: 10,
    top: 10,
  },
  heroCircle2: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.1)',
    position: 'absolute',
    right: 50,
    bottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  glowCard: {
    alignItems: 'stretch',
  },
  glowCircleRow: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  glowSubtitle: {
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  barsContainer: {
    gap: Spacing.md,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barLabel: {
    width: 64,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: Radius.full,
  },
  barCount: {
    width: 20,
    textAlign: 'right',
  },
  improveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
  },
  improveCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  improveIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareRow: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  scanList: {
    gap: Spacing.sm,
  },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    ...Shadows.soft,
  },
  scanCardIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanCardContent: {
    flex: 1,
    gap: 2,
  },
  disclaimerCard: {
    backgroundColor: Colors.backgroundSecondary,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  basketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.soft,
  },
  basketIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentLight + '55',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  briefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.soft,
  },
  briefLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  briefIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  briefTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  newBadge: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
});
