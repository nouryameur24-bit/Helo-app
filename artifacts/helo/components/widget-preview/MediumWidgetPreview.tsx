import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import styles from './widgetPreviewStyles';
import { glowColor, phaseEmoji } from './widgetHelpers';

interface Props {
  score: number;
  week: number;
  trimester: number;
}

export default function MediumWidgetPreview({ score, week, trimester }: Props) {
  const color = glowColor(score);
  const RADIUS = 22;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <LinearGradient
      colors={['#FFFAF6', '#FFF5EC']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.mediumWidget}
    >
      <View style={styles.medLeft}>
        <View style={styles.medCircleWrap}>
          <Svg width={52} height={52}>
            <Circle cx={26} cy={26} r={RADIUS} stroke="#EDE8E2" strokeWidth={3.5} fill="none" />
            <Circle
              cx={26} cy={26} r={RADIUS}
              stroke={color} strokeWidth={3.5} fill="none"
              strokeDasharray={`${CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              rotation="-90" origin="26, 26"
            />
          </Svg>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.circleCenter}>
              <ThemedText style={[styles.scoreMedium, { color }]}>{score}</ThemedText>
            </View>
          </View>
        </View>
        <ThemedText style={styles.glowLabel}>Glow Score</ThemedText>
      </View>

      <View style={styles.medDivider} />

      <View style={styles.medRight}>
        <View style={styles.scannerRow}>
          <Feather name="camera" size={14} color={Colors.accent} />
          <ThemedText style={styles.scannerLabel}>Scanner</ThemedText>
        </View>

        <View style={styles.medHorizontalLine} />

        <View style={styles.medWeekRow}>
          {week > 0 ? (
            <>
              <ThemedText style={styles.weekMedium}>Semaine {week}</ThemedText>
              <ThemedText style={styles.trimesterMedium}>
                {phaseEmoji(trimester)} Trimestre {trimester}
              </ThemedText>
            </>
          ) : (
            <ThemedText style={styles.trimesterMedium}>Configure ton profil</ThemedText>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}
