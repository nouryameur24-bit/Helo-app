/**
 * FilledSlotCard — carte résumé d'un produit scanné dans le comparateur.
 */

import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { GlowScoreCircle } from '@/components/GlowScoreCircle';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { verdictColor, verdictBg, verdictLabel, type SlotData } from './compareHelpers';

interface FilledSlotCardProps {
  data: SlotData;
  label: string;
  onRescan: () => void;
}

export function FilledSlotCard({ data, label, onRescan }: FilledSlotCardProps) {
  const color = verdictColor(data.verdict.verdict);
  const bg = verdictBg(data.verdict.verdict);

  return (
    <View style={[filled.root, { backgroundColor: bg }]}>
      <View style={filled.topRow}>
        <View style={[filled.badge, { backgroundColor: Colors.accent }]}>
          <ThemedText variant="labelSmall" style={{ color: '#fff', textTransform: 'uppercase' }}>
            {label}
          </ThemedText>
        </View>
        <TouchableOpacity onPress={onRescan} style={filled.rescanBtn}>
          <Feather name="refresh-cw" size={14} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {data.product.imageUrl ? (
        <Image
          source={{ uri: data.product.imageUrl }}
          style={filled.productImage}
          contentFit="contain"
        />
      ) : (
        <View style={filled.productImagePlaceholder}>
          <Feather name="package" size={20} color={Colors.textTertiary} />
        </View>
      )}

      <GlowScoreCircle score={data.score} size="small" animated />

      <View style={[filled.verdictBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
        <ThemedText variant="labelSmall" style={{ color, textTransform: 'uppercase' }}>
          {verdictLabel(data.verdict.verdict)}
        </ThemedText>
      </View>

      <ThemedText variant="bodySmall" color="textPrimary" style={filled.productName} numberOfLines={2}>
        {data.product.name}
      </ThemedText>
      {data.product.brand ? (
        <ThemedText variant="bodySmall" color="textTertiary" numberOfLines={1}>
          {data.product.brand}
        </ThemedText>
      ) : null}
    </View>
  );
}

const filled = StyleSheet.create({
  root: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    margin: Spacing.xs,
    ...Shadows.soft,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  rescanBtn: {
    padding: 4,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: Radius.sm,
  },
  productImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: Radius.sm,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdictBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  productName: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
