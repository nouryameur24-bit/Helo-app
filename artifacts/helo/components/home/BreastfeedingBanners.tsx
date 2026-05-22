import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Spacing } from '@/constants/theme';
import { BREASTFEEDING_PALETTE } from '@/hooks/useBreastfeeding';
import { styles } from './homeStyles';

interface Props {
  shouldSuggest: boolean;
  isBreastfeeding: boolean;
  enableBreastfeeding: () => Promise<unknown>;
  dismissSuggestion: () => void;
}

export function BreastfeedingBanners({
  shouldSuggest,
  isBreastfeeding,
  enableBreastfeeding,
  dismissSuggestion,
}: Props) {
  if (!shouldSuggest && !isBreastfeeding) return null;

  if (isBreastfeeding) {
    return (
      <Animated.View entering={FadeInDown.delay(50).duration(400)}>
        <View style={[styles.bfSuggestionBanner, { borderColor: BREASTFEEDING_PALETTE.accentLight }]}>
          <Feather name="heart" size={20} color={BREASTFEEDING_PALETTE.accent} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText variant="labelLarge" style={{ color: BREASTFEEDING_PALETTE.accent }}>
              Mode allaitement actif
            </ThemedText>
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
              Vos analyses sont adaptées à la période d&apos;allaitement
            </ThemedText>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
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
              dismissSuggestion();
            }}
            style={styles.bfSuggestionCTA}
            accessibilityRole="button"
            accessibilityLabel="Activer le mode allaitement"
          >
            <ThemedText variant="labelSmall" style={{ color: '#FFF' }}>Activer</ThemedText>
          </Pressable>
          <Pressable
            onPress={dismissSuggestion}
            accessibilityRole="button"
            accessibilityLabel="Ignorer"
          >
            <ThemedText variant="bodySmall" color="textTertiary" style={{ textAlign: 'center' }}>Ignorer</ThemedText>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
