import React from 'react';
import { Text, TextStyle } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

type TextVariant = keyof typeof Typography;
type TextColor = keyof typeof Colors;

interface ThemedTextProps {
  variant?: TextVariant;
  color?: TextColor | string;
  style?: TextStyle | TextStyle[];
  children: React.ReactNode;
  numberOfLines?: number;
}

export function ThemedText({
  variant = 'bodyMedium',
  color = 'textPrimary',
  style,
  children,
  numberOfLines,
}: ThemedTextProps) {
  const resolvedColor =
    color in Colors
      ? Colors[color as TextColor]
      : color;

  return (
    <Text
      style={[
        Typography[variant],
        { color: resolvedColor as string },
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}
