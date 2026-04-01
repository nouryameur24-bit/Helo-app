import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

type TextVariant = keyof typeof Typography;
type TextColor = keyof typeof Colors;

export interface ThemedTextProps {
  variant?: TextVariant;
  color?: TextColor | string;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
  selectable?: boolean;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
}

export function ThemedText({
  variant = 'bodyMedium',
  color = 'textPrimary',
  style,
  children,
  numberOfLines,
  selectable,
  adjustsFontSizeToFit,
  minimumFontScale,
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
      selectable={selectable}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
    >
      {children}
    </Text>
  );
}
