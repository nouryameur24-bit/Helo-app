import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

interface DividerProps {
  color?: string;
  style?: ViewStyle;
}

export function Divider({ color = Colors.border, style }: DividerProps) {
  return <View style={[styles.divider, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    width: '100%',
  },
});
