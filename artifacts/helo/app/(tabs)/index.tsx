import { swallow } from '@/lib/swallow';
import { LinearGradient } from 'expo-linear-gradient';
import { ROUTES } from '@/types/routes';
import { router, type Href } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ShareBottomSheet } from '@/components/share/ShareBottomSheet';
import { GlowScoreShareCard } from '@/components/share/GlowScoreShareCard';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { IconButton } from '@/components/ui/IconButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { GlowScoreCircle } from '@/components/GlowScoreCircle';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { calculateGlowScore, getGlowLabel } from '@/lib/glowscore';
import { useTrimester } from '@/hooks/useTrimester';
import { useWeeklyBrief } from '@/hooks/useWeeklyBrief';
import { useProfile } from '@/hooks/useProfile';
import { useShelfData } from '@/hooks/useShelfData';
import { useBreastfeeding, BREASTFEEDING_PALETTE } from '@/hooks/useBreastfeeding';
import { usePremium } from '@/hooks/usePremium';
import { BreastfeedingTransition } from '@/components/BreastfeedingTransition';
import type { ShelfProduct } from '@/components/shelf/ShelfCard';
import { PactWidget } from '@/components/PactWidget';
import { PartnerHomeScreen } from '@/components/home/PartnerHomeScreen';
import { styles } from '@/components/home/homeStyles';
import { WelcomeOverlay } from '@/components/WelcomeOverlay';
import { PulsingHelpButton } from '@/components/ui/PulsingHelpButton';

const WELCOME_FLAG = '@helo_show_welcome_overlay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const statusColors: Record<string, { bg: string; accent: string; icon: 'check-circle' | 'alert-circle' | 'x-circle' | 'help-circle' }> = {
  safe:    { bg: Colors.safeBg,    accent: Colors.safe,    icon: 'check-circle'  },
  caution: { bg: Colors.cautionBg, accent: Colors.caution, icon: 'alert-circle'  },
  danger:  { bg: Colors.dangerBg,  accent: Colors.danger,  icon: 'x-circle'      },
  unknown: { bg: Colors.background, accent: Colors.textTertiary, icon: 'help-circle' },
};

type SafeBadgeVariant = 'safe' | 'caution' | 'danger' | 'accent';
function verdictToBadge(v: string): SafeBadgeVariant {
  if (v === 'safe' || v === 'caution' || v === 'danger') return v;
  return 'accent';
}

function ScanCard({ item, index }: { item: ShelfProduct; index: number }) {
  const color = statusColors[item.verdict] ?? statusColors.unknown;
  const { bg, accent, icon } = color;
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <Pressable
        style={({ pressed }) => [
          styles.scanCard,
          { backgroundColor: Colors.surface, opacity: pressed ? 0.9 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.verdictLabel}`}
      >
        <View style={[styles.scanCardIcon, { backgroundColor: bg }]}>
          <Feather name={icon} size={20} color={accent} />
        </View>
        <View style={styles.scanCardContent}>
          <ThemedText variant="labelLarge" color="textPrimary" numberOfLines={1}>
            {item.name}
          </ThemedText>
          <ThemedText variant="bodySmall" color="textTertiary">
            {item.brand}
          </ThemedText>
        </View>
        <Badge variant={verdictToBadge(item.verdict)}>{item.verdictLabel}</Badge>
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

  const { role, userId, firstName } = useProfile();
  const isPartner = role === 'partner';

  const {
    weekOfPregnancy,
    shouldSuggestBreastfeeding,
    dismissBreastfeedingSuggestion,
  } = useTrimester();

  const {
    isBreastfeeding,
    enableBreastfeeding,
    showTransition: showBFTransition,
    changedProductsCount: bfChangedCount,
    dismissTransition: dismissBFTransition,
  } = useBreastfeeding();
  const { isNew } = useWeeklyBrief(weekOfPregnancy);

  const displayName = firstName || 'Hēlo';

  const { shelf: realShelf } = useShelfData(userId || undefined);
  const activeShelf = realShelf;

  const { score, countSafe, countCaution, countDanger, total } = calculateGlowScore(activeShelf);
  const hasRisk = countDanger > 0 || countCaution > 0;
  const { isPremium } = usePremium();

  const [glowShareVisible, setGlowShareVisible] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  // ── Post-onboarding "wow" overlay (déclenché par le flag AsyncStorage) ──
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(WELCOME_FLAG).then((flag) => {
      if (flag === '1') setShowWelcome(true);
    }).catch(swallow);
  }, []);
  // Memoized pour éviter de relancer le timer auto-dismiss du WelcomeOverlay
  // à chaque re-render du Home (hooks profile/shelf déclenchent souvent).
  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    AsyncStorage.removeItem(WELCOME_FLAG).catch(swallow);
  }, []);

  if (isPartner) {
    return <PartnerHomeScreen />;
  }

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {showWelcome && (
        <WelcomeOverlay firstName={firstName} onDismiss={dismissWelcome} />
      )}

      <BreastfeedingTransition
        visible={showBFTransition}
        changedProductsCount={bfChangedCount}
        onDismiss={dismissBFTransition}
      />

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
            <ThemedText variant="bodySmall" color="textTertiary">Bonjour</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <ThemedText variant="headlineLarge" color="textPrimary">{displayName}</ThemedText>
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: Colors.accentLight,
                borderWidth: 1,
                borderColor: Colors.accent,
              }}>
                <ThemedText variant="labelSmall" style={{ color: Colors.accentDark, fontSize: 10, letterSpacing: 0.8 }}>
                  BÊTA
                </ThemedText>
              </View>
            </View>
            {weekOfPregnancy > 0 && (
              <View style={styles.weekPill}>
                <ThemedText variant="labelSmall" style={{ color: Colors.accentDark }}>
                  Semaine {weekOfPregnancy}
                </ThemedText>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <IconButton size={44} onPress={() => router.push('/search')} accessibilityLabel="Rechercher">
              <Feather name="search" size={20} color={Colors.textSecondary} />
            </IconButton>
            <PulsingHelpButton onPress={() => router.push(ROUTES.guide)} />
            <IconButton size={44} accessibilityLabel="Notifications">
              <Feather name="bell" size={20} color={Colors.textSecondary} />
            </IconButton>
          </View>
        </Animated.View>

        {/* Breastfeeding suggestion banner */}
        {shouldSuggestBreastfeeding && !isBreastfeeding && (
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <View style={styles.bfSuggestionBanner}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="labelLarge" style={{ color: BREASTFEEDING_PALETTE.accent }}>
                  Mode allaitement disponible
                </ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
                  Votre DPA est dépassé. Activez le mode allaitement pour des analyses adaptées.
                </ThemedText>
              </View>
              <View style={{ gap: Spacing.sm }}>
                <Pressable
                  onPress={async () => {
                    await enableBreastfeeding();
                    dismissBreastfeedingSuggestion();
                  }}
                  style={styles.bfSuggestionCTA}
                  accessibilityRole="button"
                  accessibilityLabel="Activer le mode allaitement"
                >
                  <ThemedText variant="labelSmall" style={{ color: '#FFF' }}>Activer</ThemedText>
                </Pressable>
                <Pressable
                  onPress={dismissBreastfeedingSuggestion}
                  accessibilityRole="button"
                  accessibilityLabel="Ignorer"
                >
                  <ThemedText variant="bodySmall" color="textTertiary" style={{ textAlign: 'center' }}>Ignorer</ThemedText>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Breastfeeding active banner */}
        {isBreastfeeding && (
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <View style={[styles.bfSuggestionBanner, { borderColor: BREASTFEEDING_PALETTE.accentLight }]}>
              <Feather name="heart" size={20} color={BREASTFEEDING_PALETTE.accent} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <ThemedText variant="labelLarge" style={{ color: BREASTFEEDING_PALETTE.accent }}>
                  Mode allaitement actif
                </ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
                  Vos analyses sont adaptées à la période d'allaitement
                </ThemedText>
              </View>
            </View>
          </Animated.View>
        )}

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

        {/* Pact Widget */}
        <Animated.View entering={FadeInDown.delay(120).duration(500)}>
          <PactWidget />
        </Animated.View>

        {/* Quick actions row */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.quickRow}>
          <Pressable
            style={({ pressed }) => [
              styles.quickCard,
              { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
            onPress={() => router.push(ROUTES.basketScan)}
            accessibilityRole="button"
            accessibilityLabel="Mon panier"
          >
            <View style={[styles.quickIcon, { backgroundColor: Colors.accentLight + '55', borderColor: Colors.accentLight }]}>
              <Feather name="shopping-cart" size={18} color={Colors.accent} />
            </View>
            <ThemedText variant="labelLarge" color="textPrimary" style={{ marginTop: Spacing.sm }}>
              Mon panier
            </ThemedText>
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2, textAlign: 'center' }}>
              Plusieurs produits
            </ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.quickCard,
              { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
            onPress={() => router.push(ROUTES.compare)}
            accessibilityRole="button"
            accessibilityLabel="Comparer deux produits"
          >
            <View style={[styles.quickIcon, { backgroundColor: Colors.safeBg, borderColor: Colors.safeLight }]}>
              <Feather name="git-branch" size={18} color={Colors.safe} />
            </View>
            <ThemedText variant="labelLarge" color="textPrimary" style={{ marginTop: Spacing.sm }}>
              Comparer
            </ThemedText>
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2, textAlign: 'center' }}>
              2 produits côte à côte
            </ThemedText>
          </Pressable>
        </Animated.View>

        {/* Feature discovery grid */}
        <Animated.View entering={FadeInDown.delay(155).duration(500)}>
          <View style={styles.featureSectionHeader}>
            <ThemedText variant="headlineMedium" color="textPrimary">Explorer</ThemedText>
          </View>
          <View style={styles.featureGrid}>
            {(() => {
              const allFeatures = [
                {
                  label: 'Nutrition',
                  subtitle: 'Besoins du trimestre',
                  icon: 'heart' as const,
                  iconBg: Colors.cautionLight,
                  iconColor: Colors.caution,
                  route: '/nutrition',
                },
                {
                  label: 'Maison',
                  subtitle: 'Score environnement',
                  icon: 'home' as const,
                  iconBg: Colors.safeBg,
                  iconColor: Colors.safe,
                  route: '/home-score',
                },
                {
                  label: 'Restau',
                  subtitle: 'Analysez le menu',
                  icon: 'coffee' as const,
                  iconBg: '#FFF0E8',
                  iconColor: '#C97B40',
                  route: '/(tabs)/scan',
                },
                {
                  label: 'Voyage',
                  subtitle: 'Briefing santé',
                  icon: 'map' as const,
                  iconBg: '#E8F0FF',
                  iconColor: '#6B8FDB',
                  route: '/travel',
                  premium: true,
                },
                {
                  label: 'Timeline',
                  subtitle: 'Semaine par semaine',
                  icon: 'calendar' as const,
                  iconBg: '#E8F5EE',
                  iconColor: Colors.safe,
                  route: '/timeline',
                },
                {
                  label: 'Widget Glow',
                  subtitle: 'Widget écran d\'accueil',
                  icon: 'watch' as const,
                  iconBg: '#F5F0FF',
                  iconColor: '#8B6BDB',
                  route: '/widget-preview',
                },
              ];
              return showAllFeatures ? allFeatures : allFeatures.slice(0, 4);
            })().map((f) => (
              <Pressable
                key={f.label}
                style={({ pressed }) => [
                  styles.featureCell,
                  { opacity: pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
                ]}
                onPress={() => router.push(f.route as Href)}
                accessibilityRole="button"
                accessibilityLabel={f.label}
              >
                <View style={[styles.featureCellIcon, { backgroundColor: f.iconBg }]}>
                  <Feather name={f.icon} size={20} color={f.iconColor} />
                </View>
                <ThemedText variant="labelLarge" color="textPrimary">{f.label}</ThemedText>
                <Text style={styles.featureCellSubtitle}>{f.subtitle}</Text>
                {'badge' in f && typeof f.badge === 'string' && (
                  <View style={styles.featureCellBadge}>
                    <ThemedText style={styles.featureCellBadgeText}>{f.badge}</ThemedText>
                  </View>
                )}
                {'premium' in f && f.premium && !isPremium && (
                  <View style={styles.featureCellPremiumDot}>
                    <Feather name="star" size={9} color={Colors.accentDark} />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => setShowAllFeatures((v) => !v)}
            style={({ pressed }) => ({
              alignSelf: 'center',
              marginTop: Spacing.md,
              paddingVertical: Spacing.sm,
              paddingHorizontal: Spacing.lg,
              opacity: pressed ? 0.7 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel={showAllFeatures ? 'Voir moins' : 'Voir plus de fonctionnalités'}
          >
            <ThemedText variant="labelLarge" color="accent">
              {showAllFeatures ? 'Voir moins ↑' : 'Voir plus →'}
            </ThemedText>
          </Pressable>
        </Animated.View>

        {/* Shelf scan CTA */}
        <Animated.View entering={FadeInDown.delay(165).duration(500)}>
          <Pressable
            style={({ pressed }) => [
              styles.shelfScanCard,
              { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
            onPress={() => router.push(ROUTES.shelfScan)}
            accessibilityRole="button"
            accessibilityLabel="Scanner une étagère"
          >
            <View style={styles.shelfScanIconWrap}>
              <Feather name="layers" size={22} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="labelLarge" color="textPrimary">
                Scanner une étagère
              </ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 2 }}>
                Analysez tous vos produits en une photo
              </ThemedText>
            </View>
            {!isPremium && (
              <View style={styles.shelfScanPremium}>
                <Feather name="star" size={10} color={Colors.accentDark} />
                <ThemedText style={styles.shelfScanPremiumText}>PREMIUM</ThemedText>
              </View>
            )}
          </Pressable>
        </Animated.View>

        {/* Stats row — empty state when no products yet */}
        {total === 0 ? (
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
        ) : (
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
        )}

        {/* Weekly brief */}
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

        {/* Glow Score */}
        <Animated.View entering={FadeInDown.delay(240).duration(500)}>
          <View style={styles.sectionHeader}>
            <ThemedText variant="headlineMedium" color="textPrimary">Votre Glow Score</ThemedText>
            <IconButton size={36} onPress={() => setGlowShareVisible(true)} accessibilityLabel="Partager le Glow Score">
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
            <ThemedText
              variant="bodyMedium"
              color="textSecondary"
              style={styles.glowSubtitle}
            >
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
                style={({ pressed }) => [
                  styles.improveCard,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
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

        {/* Recent scans */}
        <Animated.View entering={FadeInDown.delay(320).duration(500)}>
          <View style={styles.sectionHeader}>
            <ThemedText variant="headlineMedium" color="textPrimary">Récents</ThemedText>
            <Pressable
              onPress={() => router.push(ROUTES.history)}
              accessibilityRole="button"
              accessibilityLabel="Voir l'historique complet"
            >
              <ThemedText variant="labelLarge" color="accent">Voir l'historique</ThemedText>
            </Pressable>
          </View>

          <View style={styles.scanList}>
            {activeShelf.length === 0 ? (
              <Pressable
                onPress={() => router.push('/scan')}
                style={[styles.scanCard, { backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing.xl }]}
                accessibilityRole="button"
                accessibilityLabel="Scanner votre premier produit"
              >
                <Feather name="camera" size={24} color={Colors.accent} />
                <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
                  Scannez votre premier produit
                </ThemedText>
              </Pressable>
            ) : (
              activeShelf.slice(0, 3).map((item, index) => (
                <ScanCard key={item.id} item={item} index={index} />
              ))
            )}
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
