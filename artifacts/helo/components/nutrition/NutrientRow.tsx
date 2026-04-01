import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { NUTRIENT_DEFS, type NutrientKey, type PhaseNeed } from '@/constants/nutritionNeeds';
import styles from './nutritionStyles';

function ImportanceDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <View style={styles.dotsRow}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[styles.dot, { backgroundColor: i <= level ? Colors.accent : Colors.border }]}
        />
      ))}
    </View>
  );
}

function NutrientBar({ fill }: { fill: number }) {
  const width = useSharedValue(0);
  useEffect(() => { width.value = withTiming(fill / 100, { duration: 900 }); }, [fill]);
  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
    height: 5,
    borderRadius: 3,
    backgroundColor: fill > 70 ? Colors.safe : fill > 40 ? Colors.caution : Colors.danger,
  }));
  return (
    <View style={styles.fillTrack}>
      <Animated.View style={barStyle} />
    </View>
  );
}

interface NutrientRowProps {
  need: PhaseNeed;
  fill: number;
}

function NutrientRow({ need, fill }: NutrientRowProps) {
  const def = NUTRIENT_DEFS[need.key];
  const pct = Math.min(100, Math.round(fill));
  const fillLabel = pct >= 70 ? 'Bon apport' : pct >= 35 ? 'Apport partiel' : 'Faible apport';
  const fillColor = pct >= 70 ? Colors.safe : pct >= 35 ? Colors.caution : Colors.textTertiary;

  return (
    <View style={styles.nutrientRow}>
      <View style={styles.nutrientLeft}>
        <ThemedText style={styles.nutrientEmoji}>{def.emoji}</ThemedText>
        <View style={styles.nutrientInfo}>
          <View style={styles.nutrientTitleRow}>
            <ThemedText variant="labelLarge" color="textPrimary">{def.name}</ThemedText>
            <ImportanceDots level={need.importance} />
          </View>
          <NutrientBar fill={pct} />
          <View style={styles.nutrientMeta}>
            <ThemedText variant="bodySmall" style={{ color: fillColor }}>{fillLabel}</ThemedText>
            <ThemedText variant="bodySmall" color="textTertiary">{pct}%</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

export default React.memo(NutrientRow);
