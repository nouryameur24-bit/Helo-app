import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaListeView } from '@/components/shelf/MaListeView';
import { MonPlacardView } from '@/components/shelf/MonPlacardView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Tab = 'placard' | 'liste';

function SegmentedControl({
  selected,
  onSelect,
}: {
  selected: Tab;
  onSelect: (tab: Tab) => void;
}) {
  return (
    <View style={styles.segmented}>
      <Pressable
        style={[styles.segment, selected === 'placard' && styles.segmentActive]}
        onPress={() => onSelect('placard')}
      >
        <ThemedText
          variant="labelLarge"
          color={selected === 'placard' ? 'accentDark' : 'textTertiary'}
        >
          Mon placard
        </ThemedText>
      </Pressable>
      <Pressable
        style={[styles.segment, selected === 'liste' && styles.segmentActive]}
        onPress={() => onSelect('liste')}
      >
        <ThemedText
          variant="labelLarge"
          color={selected === 'liste' ? 'accentDark' : 'textTertiary'}
        >
          Ma liste
        </ThemedText>
      </Pressable>
    </View>
  );
}

export default function ShelfScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const [activeTab, setActiveTab] = useState<Tab>('placard');

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[styles.headerContainer, { paddingTop: topPadding + Spacing.lg }]}
      >
        <SegmentedControl selected={activeTab} onSelect={setActiveTab} />
      </Animated.View>

      {activeTab === 'placard' ? (
        <MonPlacardView />
      ) : (
        <MaListeView />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.md,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  segmentActive: {
    backgroundColor: Colors.surface,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
