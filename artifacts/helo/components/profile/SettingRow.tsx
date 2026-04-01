import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import styles from './profileStyles';

export interface SettingRowProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  rightContent?: React.ReactNode;
}

export function SettingRow({ icon, title, subtitle, onPress, danger, rightContent }: SettingRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        { opacity: pressed ? 0.7 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? Colors.dangerLight : Colors.accentLight }]}>
        <Feather name={icon} size={18} color={danger ? Colors.danger : Colors.accentDark} />
      </View>
      <View style={styles.settingContent}>
        <ThemedText variant="bodyLarge" color={danger ? 'danger' : 'textPrimary'}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText variant="bodySmall" color="textTertiary">{subtitle}</ThemedText>
        ) : null}
      </View>
      {rightContent ?? <Feather name="chevron-right" size={16} color={Colors.textTertiary} />}
    </Pressable>
  );
}

export function PartnerCodeChip({ code }: { code: string }) {
  const handleCopy = () => {
    Clipboard.setStringAsync(code);
  };
  return (
    <Pressable
      onPress={handleCopy}
      style={styles.codeChip}
      accessibilityRole="button"
      accessibilityLabel={`Copier le code partenaire ${code}`}
    >
      <ThemedText variant="headlineMedium" color="accent" style={styles.codeText}>
        {code}
      </ThemedText>
      <Feather name="copy" size={16} color={Colors.accent} />
    </Pressable>
  );
}
