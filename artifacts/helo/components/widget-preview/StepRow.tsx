import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import styles from './widgetPreviewStyles';

interface Props {
  n: number;
  text: string;
}

export default function StepRow({ n, text }: Props) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <ThemedText style={styles.stepNum}>{n}</ThemedText>
      </View>
      <ThemedText variant="bodyMedium" color="textSecondary" style={styles.stepBodyText}>
        {text}
      </ThemedText>
    </View>
  );
}
