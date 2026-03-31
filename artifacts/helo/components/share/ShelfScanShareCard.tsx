import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

interface ProductRow {
  name: string;
  verdict: 'safe' | 'caution' | 'danger' | 'unverified';
}

interface ShelfScanShareCardProps {
  safeCount: number;
  total: number;
  products: ProductRow[];
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

function getVerdictColor(v: string): string {
  if (v === 'danger') return Colors.danger;
  if (v === 'caution') return Colors.caution;
  if (v === 'safe') return Colors.safe;
  return Colors.textTertiary;
}

function getVerdictLabel(v: string): string {
  if (v === 'danger') return 'Déconseillé';
  if (v === 'caution') return 'Vigilance';
  if (v === 'safe') return 'Sûr';
  return 'Non vérifié';
}

export const ShelfScanShareCard = React.forwardRef<View, ShelfScanShareCardProps>(
  function ShelfScanShareCard({ safeCount, total, products }, ref) {
    const displayed = products.slice(0, 12);

    return (
      <View ref={ref} style={styles.card} collapsable={false}>
        {/* Decorative background circles */}
        <View style={styles.decoCircle1} />
        <View style={styles.decoCircle2} />

        {/* Logo */}
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>Hēlo</Text>
        </View>

        {/* Main headline */}
        <View style={styles.headlineSection}>
          <Text style={styles.headline}>J'ai scanné mon étagère</Text>
          <View style={styles.scorePill}>
            <Text style={styles.scoreText}>{safeCount}/{total} safe</Text>
          </View>
        </View>

        {/* Product list */}
        <View style={styles.productList}>
          {displayed.map((p, i) => {
            const color = getVerdictColor(p.verdict);
            return (
              <View key={i} style={[styles.productRow, { borderLeftColor: color }]}>
                <View style={[styles.productDot, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                </View>
                <View style={[styles.verdictBadge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.verdictText, { color }]}>{getVerdictLabel(p.verdict)}</Text>
                </View>
              </View>
            );
          })}
          {total > 12 && (
            <Text style={styles.moreText}>+ {total - 12} autres produits</Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: Colors.safeBg }]}>
            <View style={[styles.statDot, { backgroundColor: Colors.safe }]} />
            <Text style={[styles.statText, { color: Colors.safe }]}>
              {products.filter(p => p.verdict === 'safe').length} sûrs
            </Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: Colors.cautionBg }]}>
            <View style={[styles.statDot, { backgroundColor: Colors.caution }]} />
            <Text style={[styles.statText, { color: Colors.caution }]}>
              {products.filter(p => p.verdict === 'caution').length} vigilance
            </Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: Colors.dangerBg }]}>
            <View style={[styles.statDot, { backgroundColor: Colors.danger }]} />
            <Text style={[styles.statText, { color: Colors.danger }]}>
              {products.filter(p => p.verdict === 'danger').length} éviter
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerText}>Analysé par Hēlo · helo-app.fr</Text>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: Colors.background,
    overflow: 'hidden',
    position: 'relative',
  },
  decoCircle1: {
    position: 'absolute',
    width: 700,
    height: 700,
    borderRadius: 350,
    backgroundColor: 'rgba(201, 169, 110, 0.07)',
    right: -200,
    top: 300,
  },
  decoCircle2: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(201, 169, 110, 0.04)',
    left: -150,
    bottom: 200,
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
  headlineSection: {
    paddingHorizontal: 80,
    marginBottom: 80,
    gap: 32,
  },
  headline: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 72,
    letterSpacing: -2,
    color: Colors.textPrimary,
    lineHeight: 80,
  },
  scorePill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.safe,
    borderRadius: Radius.full,
    paddingHorizontal: 48,
    paddingVertical: 20,
  },
  scoreText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 52,
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  productList: {
    paddingHorizontal: 60,
    gap: 12,
    marginBottom: 60,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderLeftWidth: 6,
  },
  productDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    flexShrink: 0,
  },
  productName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 32,
    color: Colors.textPrimary,
  },
  verdictBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexShrink: 0,
  },
  verdictText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 24,
  },
  moreText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 32,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 60,
    gap: 16,
    marginBottom: 60,
    flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: Radius.full,
  },
  statDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  statText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 32,
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
