import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

type VerdictType = 'safe' | 'caution' | 'danger';

interface VerdictShareCardProps {
  productName: string;
  brand?: string;
  verdict: VerdictType;
  score: number;
  trimester: number;
}

function getVerdictColor(v: VerdictType) {
  if (v === 'danger') return Colors.danger;
  if (v === 'caution') return Colors.caution;
  return Colors.safe;
}

function getVerdictBg(v: VerdictType): [string, string] {
  if (v === 'danger') return [Colors.dangerBg, Colors.background];
  if (v === 'caution') return [Colors.cautionBg, Colors.background];
  return [Colors.safeBg, Colors.background];
}

function getVerdictLabel(v: VerdictType) {
  if (v === 'danger') return 'À éviter';
  if (v === 'caution') return 'Précaution';
  return 'Compatible';
}

function trimesterLabel(t: number) {
  if (t === 1) return '1er trimestre';
  if (t === 2) return '2ème trimestre';
  return '3ème trimestre';
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const CIRCLE_SIZE = 280;
const STROKE = 18;

export const VerdictShareCard = React.forwardRef<View, VerdictShareCardProps>(
  function VerdictShareCard({ productName, brand, verdict, score, trimester }, ref) {
    const color = getVerdictColor(verdict);
    const gradColors = getVerdictBg(verdict);
    const label = getVerdictLabel(verdict);

    return (
      <View ref={ref} style={styles.card} collapsable={false}>
        <LinearGradient
          colors={gradColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Logo */}
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>Hēlo</Text>
        </View>

        {/* Circle */}
        <View style={styles.circleSection}>
          <View style={[styles.circleOuter, { borderColor: color }]}>
            <View style={[styles.circleInner, { borderColor: Colors.borderLight }]} />
            <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
          </View>
          <Text style={[styles.verdictLabel, { color }]}>{label}</Text>
        </View>

        {/* Product info */}
        <View style={styles.productSection}>
          <Text style={styles.productName} numberOfLines={3}>{productName}</Text>
          {brand ? <Text style={styles.brand}>{brand}</Text> : null}
          <View style={[styles.trimesterBadge, { backgroundColor: Colors.accentLight }]}>
            <Text style={[styles.trimesterText, { color: Colors.accentDark }]}>
              {trimesterLabel(trimester)}
            </Text>
          </View>
        </View>

        {/* Decorative circles */}
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
    marginBottom: 80,
  },
  logoText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 72,
    letterSpacing: -2,
    color: Colors.textPrimary,
  },
  circleSection: {
    alignItems: 'center',
    marginBottom: 100,
  },
  circleOuter: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: STROKE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  circleInner: {
    position: 'absolute',
    width: CIRCLE_SIZE - STROKE * 2 - 8,
    height: CIRCLE_SIZE - STROKE * 2 - 8,
    borderRadius: (CIRCLE_SIZE - STROKE * 2 - 8) / 2,
    borderWidth: 2,
  },
  scoreNumber: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 96,
    letterSpacing: -4,
  },
  verdictLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 72,
    letterSpacing: -1,
  },
  productSection: {
    paddingHorizontal: 80,
    marginBottom: 80,
  },
  productName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 60,
    letterSpacing: -1,
    color: Colors.textPrimary,
    lineHeight: 72,
    marginBottom: 24,
  },
  brand: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 44,
    color: Colors.textSecondary,
    marginBottom: 40,
  },
  trimesterBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: Radius.full,
  },
  trimesterText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 36,
    letterSpacing: 0.5,
  },
  decoCircle1: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(201, 169, 110, 0.06)',
    right: -200,
    top: 300,
  },
  decoCircle2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(201, 169, 110, 0.04)',
    left: -100,
    bottom: 400,
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
