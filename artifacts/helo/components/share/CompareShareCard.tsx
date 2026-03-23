import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/theme';

type Verdict = 'safe' | 'caution' | 'danger';

interface SlotData {
  productName: string;
  brand?: string;
  verdict: Verdict;
  score: number;
}

interface CompareShareCardProps {
  slotA: SlotData;
  slotB: SlotData;
}

const VERDICT_COLOR: Record<Verdict, string> = {
  safe: Colors.safe,
  caution: Colors.caution,
  danger: Colors.danger,
};

const VERDICT_LABEL: Record<Verdict, string> = {
  safe: 'Compatible',
  caution: 'Précaution',
  danger: 'À éviter',
};

const VERDICT_BG: Record<Verdict, string> = {
  safe: Colors.safeBg,
  caution: Colors.cautionBg,
  danger: Colors.dangerBg,
};

function ProductColumn({ slot, label }: { slot: SlotData; label: string }) {
  const color = VERDICT_COLOR[slot.verdict];
  const bg = VERDICT_BG[slot.verdict];

  return (
    <View style={[styles.column, { backgroundColor: bg }]}>
      {/* Product label */}
      <View style={[styles.slotBadge, { backgroundColor: Colors.accent }]}>
        <Text style={styles.slotBadgeText}>{label}</Text>
      </View>

      {/* Score circle (static) */}
      <View style={[styles.scoreCircle, { borderColor: color }]}>
        <Text style={[styles.scoreNumber, { color }]}>{slot.score}</Text>
        <Text style={[styles.scoreLabel, { color }]}>/ 100</Text>
      </View>

      {/* Verdict badge */}
      <View style={[styles.verdictBadge, { backgroundColor: color + '22', borderColor: color + '66' }]}>
        <Text style={[styles.verdictBadgeText, { color }]}>
          {VERDICT_LABEL[slot.verdict]}
        </Text>
      </View>

      {/* Product info */}
      <Text style={styles.productName} numberOfLines={3}>{slot.productName}</Text>
      {slot.brand ? (
        <Text style={styles.productBrand} numberOfLines={1}>{slot.brand}</Text>
      ) : null}
    </View>
  );
}

export function CompareShareCard({ slotA, slotB }: CompareShareCardProps) {
  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hēlo</Text>
        <Text style={styles.headerSub}>Comparateur de produits</Text>
      </View>

      {/* Split comparison */}
      <View style={styles.splitRow}>
        <ProductColumn slot={slotA} label="Produit A" />
        <View style={styles.divider}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        <ProductColumn slot={slotB} label="Produit B" />
      </View>

      {/* Winner banner */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {slotA.verdict === 'safe' && slotB.verdict !== 'safe'
            ? `✓ Produit A recommandé pour la grossesse`
            : slotB.verdict === 'safe' && slotA.verdict !== 'safe'
            ? `✓ Produit B recommandé pour la grossesse`
            : slotA.verdict === 'safe' && slotB.verdict === 'safe'
            ? `✓ Les deux produits sont compatibles`
            : `⚠ Consultez votre professionnel de santé`}
        </Text>
      </View>

      {/* Branding */}
      <Text style={styles.branding}>Analysé avec Hēlo • helo.app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: 1080,
    height: 1920,
    backgroundColor: Colors.background,
    padding: 80,
    justifyContent: 'center',
    gap: 60,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 96,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.accent,
    letterSpacing: -2,
  },
  headerSub: {
    fontSize: 42,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 0,
    alignItems: 'stretch',
  },
  column: {
    flex: 1,
    borderRadius: 40,
    padding: 48,
    alignItems: 'center',
    gap: 28,
  },
  divider: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: 36,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.textTertiary,
  },
  slotBadge: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  slotBadgeText: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#fff',
  },
  scoreCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  scoreNumber: {
    fontSize: 64,
    fontFamily: 'PlusJakartaSans_700Bold',
    lineHeight: 72,
  },
  scoreLabel: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  verdictBadge: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  verdictBadgeText: {
    fontSize: 30,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  productName: {
    fontSize: 32,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 40,
  },
  productBrand: {
    fontSize: 26,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    backgroundColor: Colors.accentLight + '88',
    borderRadius: 32,
    padding: 48,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 40,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 52,
  },
  branding: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
