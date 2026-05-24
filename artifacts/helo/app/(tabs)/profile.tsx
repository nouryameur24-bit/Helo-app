import React from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountActions } from '@/components/profile/AccountActions';
import { CircleSection } from '@/components/profile/CircleSection';
import { FeedbackSection } from '@/components/profile/FeedbackSection';
import { OverlayGates } from '@/components/profile/OverlayGates';
import { PartnerSection } from '@/components/profile/PartnerSection';
import { PreferencesSection } from '@/components/profile/PreferencesSection';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileProvider } from '@/components/profile/ProfileContext';
import styles from '@/components/profile/profileStyles';
import { Colors, Spacing } from '@/constants/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  return (
    <ProfileProvider>
      <View style={[styles.root, { backgroundColor: Colors.background }]}>
        <OverlayGates />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: topPadding + Spacing.lg, paddingBottom: bottomPadding + 120 },
          ]}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <ProfileHeader />
          <CircleSection />
          <PartnerSection />
          <PreferencesSection />
          {/* Lot 16-03 — Aide & Feedback : critique pour collecter les
              retours beta. Mailto direct + StoreReview natif iOS. */}
          <FeedbackSection />
          <AccountActions />
        </ScrollView>
      </View>
    </ProfileProvider>
  );
}
