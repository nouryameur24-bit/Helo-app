import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Circle } from 'react-native-svg';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import styles from './widgetPreviewStyles';
import { glowColor } from './widgetHelpers';

interface Props {
  score: number;
  week: number;
}

export default function SmallWidgetPreview({ score, week }: Props) {
  const color = glowColor(score);
  const RADIUS = 18;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <LinearGradient
      colors={['#FFFAF6', '#FFF5EC']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.smallWidget}
    >
      <ThemedText style={[styles.widgetName, { color: Colors.accent }]}>Hēlo</ThemedText>

      <View style={styles.circleWrap}>
        <Svg width={44} height={44}>
          <Circle cx={22} cy={22} r={RADIUS} stroke="#EDE8E2" strokeWidth={3} fill="none" />
          <Circle
            cx={22} cy={22} r={RADIUS}
            stroke={color} strokeWidth={3} fill="none"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation="-90"
            origin="22, 22"
          />
        </Svg>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.circleCenter}>
            <ThemedText style={[styles.scoreSmall, { color }]}>{score}</ThemedText>
          </View>
        </View>
      </View>

      {week > 0 && (
        <ThemedText style={styles.weekSmall}>Semaine {week}</ThemedText>
      )}
    </LinearGradient>
  );
}
