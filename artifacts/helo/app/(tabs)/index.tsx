import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ShareBottomSheet } from '@/components/share/ShareBottomSheet';
import { GlowScoreShareCard } from '@/components/share/GlowScoreShareCard';
import { BreastfeedingTransition } from '@/components/BreastfeedingTransition';
import { WelcomeOverlay } from '@/components/WelcomeOverlay';
import { PartnerHomeScreen } from '@/components/home/PartnerHomeScreen';
import { BreastfeedingBanners } from '@/components/home/BreastfeedingBanners';
import { GlowScoreSection } from '@/components/home/GlowScoreSection';
import { HomeHeader } from '@/components/home/HomeHeader';
import { HomeHeroCTA } from '@/components/home/HomeHeroCTA';
import { HomeWeeklyBrief } from '@/components/home/HomeWeeklyBrief';
import { HomeRecentScans } from '@/components/home/HomeRecentScans';
import { HomeDisclaimer } from '@/components/home/HomeDisclaimer';
import { MoreToolsSheet } from '@/components/home/MoreToolsSheet';
import { GlowScoreDeltaToast } from '@/components/home/GlowScoreDeltaToast';
import { ThemedText } from '@/components/ui/ThemedText';
import { styles } from '@/components/home/homeStyles';
import { Radius } from '@/constants/theme';

import { Colors, Spacing } from '@/constants/theme';
import { calculateGlowScore } from '@/lib/glowscore';
import { useTrimester } from '@/hooks/useTrimester';
import { useWeeklyBrief } from '@/hooks/useWeeklyBrief';
import { useProfile } from '@/hooks/useProfile';
import { useShelfData } from '@/hooks/useShelfData';
import { useBreastfeeding } from '@/hooks/useBreastfeeding';
import { usePremium } from '@/hooks/usePremium';
import { useWelcomeOverlay } from '@/hooks/useWelcomeOverlay';

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

  const { shelf } = useShelfData(userId || undefined);
  // Recompute the glow score only when the shelf reference changes — the hook
  // already memoises `shelf`, so this avoids re-running the reducer on every
  // unrelated state update (premium, weekly brief, welcome overlay…).
  const { score, countSafe, countCaution, countDanger, total } = useMemo(
    () => calculateGlowScore(shelf),
    [shelf],
  );
  const { isPremium } = usePremium();

  const welcome = useWelcomeOverlay();
  const [glowShareVisible, setGlowShareVisible] = useState(false);
  // Lot 15C — Plus d'outils sheet : groupe les features secondaires
  // (Voyage, Nutrition, Maison, Timeline, Widget Glow) qui surchargeaient
  // le home avec un FeatureGrid de 6 cellules. Le user voit "Plus d'outils ▼",
  // tap → sheet → choisit, et le home reste épuré.
  const [moreToolsVisible, setMoreToolsVisible] = useState(false);

  // Stable handlers — without useCallback the inline arrows would change on
  // every render and defeat React.memo on the memoised sub-components.
  const handleShareGlow = useCallback(() => setGlowShareVisible(true), []);
  const handleCloseShare = useCallback(() => setGlowShareVisible(false), []);
  const handleOpenMoreTools = useCallback(() => setMoreToolsVisible(true), []);
  const handleCloseMoreTools = useCallback(() => setMoreToolsVisible(false), []);
  const displayName = firstName || 'Hēlo';

  if (isPartner) {
    return <PartnerHomeScreen />;
  }

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {welcome.visible && (
        <WelcomeOverlay firstName={firstName} onDismiss={welcome.dismiss} />
      )}

      <BreastfeedingTransition
        visible={showBFTransition}
        changedProductsCount={bfChangedCount}
        onDismiss={dismissBFTransition}
      />

      {glowShareVisible && (
        <ShareBottomSheet
          visible={glowShareVisible}
          onClose={handleCloseShare}
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
        {/* ── Lot 15C — Home refonte : 12 sections → 6 ──
            Sections gardées (essentielles) :
              1. Header (greeting + week)
              2. BreastfeedingBanners (conditionnel, fonctionnel)
              3. Hero CTA "Scanner maintenant" (action primaire)
              4. GlowScoreSection (signature feature + stats inline)
              5. WeeklyBrief (personalization)
              6. RecentScans (proof of activity)
              7. "Plus d'outils ▼" → MoreToolsSheet (Nutrition, Maison,
                 Voyage, Timeline, Widget Glow — toutes les secondaires)
              8. Disclaimer (footer subtle)
            Retirées : PactWidget (feature-flagged), HomeQuickActions,
            HomeShelfScanCTA, HomeStatsRow (mergé), FeatureGrid (→ sheet). */}

        <HomeHeader displayName={displayName} weekOfPregnancy={weekOfPregnancy} />

        <BreastfeedingBanners
          shouldSuggest={shouldSuggestBreastfeeding}
          isBreastfeeding={isBreastfeeding}
          enableBreastfeeding={enableBreastfeeding}
          dismissSuggestion={dismissBreastfeedingSuggestion}
        />

        <HomeHeroCTA />

        <View style={{ position: 'relative' }}>
          {/* Lot 16-12 — Toast "+N ✨" / "−N ⚠️" qui flash quand le score
              change. Overlay positionné sur le wrapper relative au-dessus
              de la GlowScoreSection. */}
          <GlowScoreDeltaToast score={score} />
          <GlowScoreSection
            score={score}
            total={total}
            countSafe={countSafe}
            countCaution={countCaution}
            countDanger={countDanger}
            onShare={handleShareGlow}
          />
        </View>

        <HomeWeeklyBrief weekOfPregnancy={weekOfPregnancy} isNew={isNew} />

        <HomeRecentScans shelf={shelf} />

        {/* "Plus d'outils" — bouton minimaliste qui ouvre la sheet. */}
        <Animated.View entering={FadeInDown.delay(220).duration(400)}>
          <Pressable
            onPress={handleOpenMoreTools}
            accessibilityRole="button"
            accessibilityLabel="Voir tous les outils Hēlo"
            style={({ pressed }) => [
              moreToolsBtn.btn,
              { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <View style={moreToolsBtn.row}>
              <View style={moreToolsBtn.iconWrap}>
                <Feather name="grid" size={18} color={Colors.accentDark} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="labelLarge" color="textPrimary">
                  Plus d'outils
                </ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary">
                  Nutrition, voyage, timeline...
                </ThemedText>
              </View>
              <Feather name="chevron-down" size={18} color={Colors.textTertiary} />
            </View>
          </Pressable>
        </Animated.View>

        <HomeDisclaimer />
      </ScrollView>

      <MoreToolsSheet
        visible={moreToolsVisible}
        onClose={handleCloseMoreTools}
        isPremium={isPremium}
      />
    </View>
  );
}

// Lot 15C — Bouton "Plus d'outils" inline du home.
const moreToolsBtn = StyleSheet.create({
  btn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent + '22',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
