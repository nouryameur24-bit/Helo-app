import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

type BadgeVariant = 'safe' | 'caution' | 'danger' | 'accent';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles = {
  safe: {
    bg: Colors.safeLight,
    text: Colors.safe,
  },
  caution: {
    bg: Colors.cautionLight,
    text: Colors.caution,
  },
  danger: {
    bg: Colors.dangerLight,
    text: Colors.danger,
  },
  accent: {
    bg: Colors.accentLight,
    text: Colors.accentDark,
  },
};

export function Badge({ variant = 'accent', children }: BadgeProps) {
  const { bg, text } = variantStyles[variant];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    ...Typography.labelSmall,
  },
});
