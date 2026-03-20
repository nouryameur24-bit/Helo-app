import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlowScoreCircle } from '@/components/GlowScoreCircle';
import { Colors, Radius } from '@/constants/theme';

interface GlowScoreShareCardProps {
  score: number;
  week: number;
  scanCount: number;
  safeCount: number;
  dangerCount: number;
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

export const GlowScoreShareCard = React.forwardRef<View, GlowScoreShareCardProps>(
  function GlowScoreShareCard({ score, week, scanCount, safeCount, dangerCount }, ref) {
    return (
      <View ref={ref} style={styles.card} collapsable={false}>
        <LinearGradient
          colors={[Colors.accentLight, Colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Logo */}
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>Hēlo</Text>
          <Text style={styles.logoTagline}>Santé & Grossesse</Text>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Mon Glow Score</Text>
          <Text style={styles.weekLabel}>Semaine {week} de grossesse</Text>
        </View>

        {/* Score circle — static (animated=false) */}
        <View style={styles.circleSection}>
          <View style={styles.circleWrapper}>
            <GlowScoreCircle score={score} size="large" animated={false} />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={[styles.statCard, { backgroundColor: Colors.surface }]}>
            <Text style={styles.statNumber}>{scanCount}</Text>
            <Text style={styles.statLabel}>Produits{'\n'}analysés</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.safeBg }]}>
            <Text style={[styles.statNumber, { color: Colors.safe }]}>{safeCount}</Text>
            <Text style={styles.statLabel}>Produits{'\n'}sûrs</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.dangerBg }]}>
            <Text style={[styles.statNumber, { color: Colors.danger }]}>{dangerCount}</Text>
            <Text style={styles.statLabel}>À{'\n'}éviter</Text>
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
    marginBottom: 60,
  },
  logoText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 72,
    letterSpacing: -2,
    color: Colors.textPrimary,
  },
  logoTagline: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 40,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  titleSection: {
    paddingHorizontal: 80,
    marginBottom: 80,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 80,
    letterSpacing: -2,
    color: Colors.textPrimary,
    lineHeight: 88,
  },
  weekLabel: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 44,
    color: Colors.textSecondary,
    marginTop: 20,
  },
  circleSection: {
    alignItems: 'center',
    marginBottom: 100,
  },
  circleWrapper: {
    transform: [{ scale: 2 }],
    marginVertical: 100,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 60,
    gap: 28,
    marginBottom: 80,
  },
  statCard: {
    flex: 1,
    borderRadius: Radius.xl,
    padding: 40,
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 72,
    letterSpacing: -2,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 36,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 44,
  },
  decoCircle1: {
    position: 'absolute',
    width: 700,
    height: 700,
    borderRadius: 350,
    backgroundColor: 'rgba(201, 169, 110, 0.07)',
    right: -250,
    top: 400,
  },
  decoCircle2: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(201, 169, 110, 0.04)',
    left: -150,
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
