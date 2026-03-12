import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated';
  style?: ViewStyle;
  padding?: number;
}

export function Card({
  children,
  variant = 'default',
  style,
  padding = Spacing.xl,
}: CardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'elevated' ? styles.elevated : styles.default,
        { padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
  },
  default: {
    ...Shadows.soft,
  },
  elevated: {
    ...Shadows.medium,
  },
});
