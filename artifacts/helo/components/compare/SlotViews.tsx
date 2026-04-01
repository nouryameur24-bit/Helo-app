/**
 * SlotViews — EmptySlot et LoadingSlot pour le comparateur.
 */

import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

// ─── EmptySlot ────────────────────────────────────────────────────────────────
interface EmptySlotProps {
  label: string;
  onScan: () => void;
}

export function EmptySlot({ label, onScan }: EmptySlotProps) {
  return (
    <View style={slot.root}>
      <View style={slot.badge}>
        <ThemedText variant="labelSmall" color="textTertiary">{label}</ThemedText>
      </View>
      <View style={slot.iconCircle}>
        <Feather name="package" size={32} color={Colors.textTertiary} />
      </View>
      <ThemedText variant="bodyMedium" color="textTertiary" style={slot.hint}>
        Scannez un produit
      </ThemedText>
      <TouchableOpacity style={slot.scanBtn} onPress={onScan} activeOpacity={0.8}>
        <Feather name="camera" size={18} color="#fff" style={{ marginRight: 6 }} />
        <ThemedText variant="labelLarge" style={slot.scanBtnText}>Scanner</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

// ─── LoadingSlot ──────────────────────────────────────────────────────────────
interface LoadingSlotProps {
  label: string;
}

export function LoadingSlot({ label }: LoadingSlotProps) {
  return (
    <View style={slot.root}>
      <View style={slot.badge}>
        <ThemedText variant="labelSmall" color="textTertiary">{label}</ThemedText>
      </View>
      <ActivityIndicator size="large" color={Colors.accent} />
      <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: Spacing.md }}>
        Analyse en cours…
      </ThemedText>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const slot = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.sm,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  hint: {
    textAlign: 'center',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    ...Shadows.soft,
  },
  scanBtnText: {
    color: '#fff',
  },
});
