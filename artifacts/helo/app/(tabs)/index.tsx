import React, { useCallback, useMemo, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShareBottomSheet } from '@/components/share/ShareBottomSheet';
import { GlowScoreShareCard } from '@/components/share/GlowScoreShareCard';
import { BreastfeedingTransition } from '@/components/BreastfeedingTransition';
import { WelcomeOverlay } from '@/components/WelcomeOverlay';
import { PactWidget } from '@/components/PactWidget';
import { PartnerHomeScreen } from '@/components/home/PartnerHomeScreen';
import { BreastfeedingBanners } from '@/components/home/BreastfeedingBanners';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { GlowScoreSection } from '@/components/home/GlowScoreSection';
import { HomeHeader } from '@/components/home/HomeHeader';
import { HomeHeroCTA } from '@/components/home/HomeHeroCTA';
import { HomeQuickActions } from '@/components/home/HomeQuickActions';
import { HomeShelfScanCTA } from '@/components/home/HomeShelfScanCTA';
import { HomeStatsRow } from '@/components/home/HomeStatsRow';
import { HomeWeeklyBrief } from '@/components/home/HomeWeeklyBrief';
import { HomeRecentScans } from '@/components/home/HomeRecentScans';
import { HomeDisclaimer } from '@/components/home/HomeDisclaimer';
import { styles } from '@/components/home/homeStyles';

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

  // Stable handlers — without useCallback the inline arrows would change on
  // every render and defeat React.memo on the memoised sub-components.
  const handleShareGlow = useCallback(() => setGlowShareVisible(true), []);
  const handleCloseShare = useCallback(() => setGlowShareVisible(false), []);
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
        <HomeHeader displayName={displayName} weekOfPregnancy={weekOfPregnancy} />

        <BreastfeedingBanners
          shouldSuggest={shouldSuggestBreastfeeding}
          isBreastfeeding={isBreastfeeding}
          enableBreastfeeding={enableBreastfeeding}
          dismissSuggestion={dismissBreastfeedingSuggestion}
        />

        <HomeHeroCTA />

        <PactWidget />

        <HomeQuickActions />

        <FeatureGrid isPremium={isPremium} />

        <HomeShelfScanCTA isPremium={isPremium} />

        <HomeStatsRow
          total={total}
          countSafe={countSafe}
          countCaution={countCaution}
          countDanger={countDanger}
        />

        <HomeWeeklyBrief weekOfPregnancy={weekOfPregnancy} isNew={isNew} />

        <GlowScoreSection
          score={score}
          total={total}
          countSafe={countSafe}
          countCaution={countCaution}
          countDanger={countDanger}
          onShare={handleShareGlow}
        />

        <HomeRecentScans shelf={shelf} />

        <HomeDisclaimer />
      </ScrollView>
    </View>
  );
}
