import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PartnerChecklist } from '@/components/partner/PartnerChecklist';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';

import { FeatureDiscoverySheet } from '@/components/ui/FeatureDiscoverySheet';
import { useFeatureDiscovery } from "@/hooks/useFeatureDiscovery";
  

export default function PartnerChecklistTab() {
  const __discovery_partner = useFeatureDiscovery('partner');
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + Spacing.sm }]}>
        <ThemedText variant="headlineLarge" color="textPrimary">
          Ma checklist
        </ThemedText>
      </View>

      <PartnerChecklist showHeader={false} />
    <FeatureDiscoverySheet {...__discovery_partner.sheetProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
});
