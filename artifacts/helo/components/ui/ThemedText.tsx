import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
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

  // When the caller overrides fontSize but omits lineHeight, the base Typography
  // variant's small lineHeight stays in effect and clips large text/emoji on iOS.
  // We detect this and auto-correct lineHeight to ≥ fontSize × 1.3.
  const flatStyle = StyleSheet.flatten(style) as TextStyle | null;
  const fontSizeOverride = flatStyle?.fontSize;
  const lineHeightOverride = flatStyle?.lineHeight;
  const lineHeightFix: TextStyle | null =
    fontSizeOverride != null && lineHeightOverride == null
      ? { lineHeight: Math.ceil(fontSizeOverride * 1.3) }
      : null;

  return (
    <Text
      style={[
        Typography[variant],
        { color: resolvedColor as string },
        style,
        lineHeightFix,
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
