import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlowScoreMini } from '@/components/GlowScoreMini';
import { Colors, Radius } from '@/constants/theme';
import type { ShelfProduct } from '@/components/shelf/ShelfCard';

interface ShelfShareCardProps {
  products: ShelfProduct[];
  score: number;
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const GRID_COLS = 3;

function getVerdictColor(v?: string) {
  if (v === 'danger') return Colors.danger;
  if (v === 'caution') return Colors.caution;
  return Colors.safe;
}

export const ShelfShareCard = React.forwardRef<View, ShelfShareCardProps>(
  function ShelfShareCard({ products, score }, ref) {
    const displayed = products.slice(0, 9);
    const safeCount = products.filter((p) => p.verdict === 'safe').length;
    const cautionCount = products.filter((p) => p.verdict === 'caution').length;
    const dangerCount = products.filter((p) => p.verdict === 'danger').length;

    const rows: ShelfProduct[][] = [];
    for (let i = 0; i < displayed.length; i += GRID_COLS) {
      rows.push(displayed.slice(i, i + GRID_COLS));
    }

    return (
      <View ref={ref} style={styles.card} collapsable={false}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>Hēlo</Text>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Mon Placard Hēlo</Text>
          <Text style={styles.subtitle}>{products.length} produit{products.length > 1 ? 's' : ''} analysés</Text>
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {rows.map((row, ri) => (
            <View key={ri} style={styles.gridRow}>
              {row.map((p, ci) => {
                const dotColor = getVerdictColor(p.verdict);
                return (
                  <View key={ci} style={styles.gridCell}>
                    <View style={[styles.gridDot, { backgroundColor: dotColor }]} />
                    <Text style={styles.gridName} numberOfLines={2}>{p.name}</Text>
                  </View>
                );
              })}
              {row.length < GRID_COLS &&
                Array(GRID_COLS - row.length).fill(null).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.gridCell} />
                ))}
            </View>
          ))}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: Colors.safeBg }]}>
            <View style={[styles.statDot, { backgroundColor: Colors.safe }]} />
            <Text style={[styles.statText, { color: Colors.safe }]}>{safeCount} sûrs</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: Colors.cautionBg }]}>
            <View style={[styles.statDot, { backgroundColor: Colors.caution }]} />
            <Text style={[styles.statText, { color: Colors.caution }]}>{cautionCount} vigilance</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: Colors.dangerBg }]}>
            <View style={[styles.statDot, { backgroundColor: Colors.danger }]} />
            <Text style={[styles.statText, { color: Colors.danger }]}>{dangerCount} à éviter</Text>
          </View>
        </View>

        {/* GlowScoreMini — static */}
        <View style={styles.glowRow}>
          <View style={styles.glowMiniWrapper}>
            <GlowScoreMini score={score} animated={false} />
          </View>
        </View>

        {/* Decorative */}
        <View style={styles.decoCircle1} />
        <View style={styles.decoCircle2} />

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerText}>Analysé par Hēlo · helo-app.fr</Text>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: Colors.background,
    overflow: 'hidden',
    position: 'relative',
  },
  logoRow: {
    paddingTop: 120,
    paddingHorizontal: 80,
    marginBottom: 40,
  },
  logoText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 72,
    letterSpacing: -2,
    color: Colors.textPrimary,
  },
  titleSection: {
    paddingHorizontal: 80,
    marginBottom: 60,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 76,
    letterSpacing: -2,
    color: Colors.textPrimary,
    lineHeight: 84,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 44,
    color: Colors.textSecondary,
    marginTop: 20,
  },
  grid: {
    paddingHorizontal: 60,
    gap: 20,
    marginBottom: 60,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 20,
  },
  gridCell: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 32,
    minHeight: 180,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  gridDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  gridName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 30,
    color: Colors.textPrimary,
    lineHeight: 36,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 60,
    gap: 20,
    marginBottom: 60,
    flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: Radius.full,
  },
  statDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  statText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 36,
    letterSpacing: 0.3,
  },
  glowRow: {
    paddingHorizontal: 80,
    marginBottom: 60,
  },
  glowMiniWrapper: {
    transform: [{ scale: 2 }],
    transformOrigin: 'left center',
  },
  decoCircle1: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(201, 169, 110, 0.05)',
    right: -200,
    top: 400,
  },
  decoCircle2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(201, 169, 110, 0.03)',
    left: -100,
    bottom: 300,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 80,
    paddingBottom: 80,
  },
  footerDivider: {
    height: 2,
    backgroundColor: Colors.border,
    marginBottom: 36,
  },
  footerText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 36,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
});
