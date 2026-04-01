import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Shadows } from '@/constants/theme';
import styles from './nutritionStyles';

interface TipPillProps {
  icon: string;
  text: string;
  type?: 'info' | 'warn' | 'good';
}

function TipPill({ icon, text, type = 'info' }: TipPillProps) {
  const bg = type === 'good' ? Colors.safeBg : type === 'warn' ? Colors.cautionLight : Colors.surface;
  const border = type === 'good' ? Colors.safeLight : type === 'warn' ? Colors.caution + '44' : Colors.border;
  const textColor = type === 'good' ? Colors.safe : type === 'warn' ? Colors.caution : Colors.textSecondary;

  return (
    <View style={[styles.tipPill, { backgroundColor: bg, borderColor: border }]}>
      <ThemedText style={{ fontSize: 16 }}>{icon}</ThemedText>
      <ThemedText variant="bodySmall" style={{ color: textColor, flex: 1, lineHeight: 18 }}>
        {text}
      </ThemedText>
    </View>
  );
}

export default React.memo(TipPill);
