import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { SCAN_DISCLAIMER } from '@/constants/legalTexts';

export function ScanDisclaimerBanner() {
  const [expanded, setExpanded] = useState(false);
  const contentHeight = useSharedValue(0);
  const measuredHeight = useSharedValue(0);
  const router = useRouter();

  const animatedStyle = useAnimatedStyle(() => ({
    height: contentHeight.value,
    overflow: 'hidden',
  }));

  const onContentLayout = useCallback((event: LayoutChangeEvent) => {
    const h = event.nativeEvent.layout.height;
    if (h > 0) {
      measuredHeight.value = h;
      if (expanded) {
        contentHeight.value = h;
      }
    }
  }, [expanded]);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    contentHeight.value = withTiming(next ? measuredHeight.value : 0, { duration: 300 });
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={toggle} style={styles.header}>
        <Feather name="info" size={14} color={Colors.textTertiary} />
        <ThemedText variant="bodySmall" color="textTertiary" style={styles.headerText}>
          Évaluation à titre informatif
        </ThemedText>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={Colors.textTertiary}
        />
      </Pressable>

      <Animated.View style={animatedStyle}>
        <View style={styles.expandedContent} onLayout={onContentLayout}>
          <ThemedText variant="bodySmall" color="textSecondary" style={styles.disclaimerText}>
            {SCAN_DISCLAIMER}
          </ThemedText>
          <Pressable
            onPress={() => router.push('/methodology')}
            style={styles.methodologyLink}
          >
            <Feather name="book-open" size={14} color={Colors.accent} />
            <ThemedText variant="bodySmall" color="accent">
              Notre méthodologie
            </ThemedText>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  expandedContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  disclaimerText: {
    lineHeight: 20,
  },
  methodologyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
