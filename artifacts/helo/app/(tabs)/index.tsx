import { swallow } from '@/lib/swallow';
import { LinearGradient } from 'expo-linear-gradient';
import { ROUTES } from '@/types/routes';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
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
import { IconButton } from '@/components/ui/IconButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { calculateGlowScore } from '@/lib/glowscore';
import { useTrimester } from '@/hooks/useTrimester';
import { useWeeklyBrief } from '@/hooks/useWeeklyBrief';
import { useProfile } from '@/hooks/useProfile';
import { useShelfData } from '@/hooks/useShelfData';
import { useBreastfeeding } from '@/hooks/useBreastfeeding';
import { usePremium } from '@/hooks/usePremium';
import { BreastfeedingTransition } from '@/components/BreastfeedingTransition';
import type { ShelfProduct } from '@/components/shelf/ShelfCard';
import { PactWidget } from '@/components/PactWidget';
import { PartnerHomeScreen } from '@/components/home/PartnerHomeScreen';
import { BreastfeedingBanners } from '@/components/home/BreastfeedingBanners';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { GlowScoreSection } from '@/components/home/GlowScoreSection';
import { styles } from '@/components/home/homeStyles';
import { WelcomeOverlay } from '@/components/WelcomeOverlay';
import { PulsingHelpButton } from '@/components/ui/PulsingHelpButton';

const WELCOME_FLAG = '@helo_show_welcome_overlay';

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
  const { isPremium } = usePremium();

  const [glowShareVisible, setGlowShareVisible] = useState(false);

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

        <BreastfeedingBanners
          shouldSuggest={shouldSuggestBreastfeeding}
          isBreastfeeding={isBreastfeeding}
          enableBreastfeeding={enableBreastfeeding}
          dismissSuggestion={dismissBreastfeedingSuggestion}
        />

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

        <FeatureGrid isPremium={isPremium} />

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

        <GlowScoreSection
          score={score}
          total={total}
          countSafe={countSafe}
          countCaution={countCaution}
          countDanger={countDanger}
          onShare={() => setGlowShareVisible(true)}
        />

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
