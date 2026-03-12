import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { IconButton } from '@/components/ui/IconButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RECENT_SCANS = [
  {
    id: '1',
    name: 'Crème hydratante Nuxe',
    brand: 'NUXE',
    status: 'safe' as const,
    statusLabel: 'Sûr',
    date: 'Aujourd\'hui',
    ingredients: 12,
  },
  {
    id: '2',
    name: 'Shampooing doux Klorane',
    brand: 'KLORANE',
    status: 'caution' as const,
    statusLabel: 'Vigilance',
    date: 'Hier',
    ingredients: 8,
  },
  {
    id: '3',
    name: 'Sérum vitamine C',
    brand: 'VICHY',
    status: 'safe' as const,
    statusLabel: 'Sûr',
    date: '12 mars',
    ingredients: 15,
  },
];

const statusColors = {
  safe: { bg: Colors.safeBg, accent: Colors.safe, icon: 'check-circle' as const },
  caution: { bg: Colors.cautionBg, accent: Colors.caution, icon: 'alert-circle' as const },
  danger: { bg: Colors.dangerBg, accent: Colors.danger, icon: 'x-circle' as const },
};

function ScanCard({ item, index }: { item: typeof RECENT_SCANS[0]; index: number }) {
  const { bg, accent, icon } = statusColors[item.status];
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <Pressable
        style={({ pressed }) => [
          styles.scanCard,
          { backgroundColor: Colors.surface, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <View style={[styles.scanCardIcon, { backgroundColor: bg }]}>
          <Feather name={icon} size={20} color={accent} />
        </View>
        <View style={styles.scanCardContent}>
          <ThemedText variant="labelLarge" color="textPrimary" numberOfLines={1}>
            {item.name}
          </ThemedText>
          <ThemedText variant="bodySmall" color="textTertiary">
            {item.brand} · {item.date}
          </ThemedText>
        </View>
        <Badge variant={item.status}>{item.statusLabel}</Badge>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding + Spacing.lg, paddingBottom: bottomPadding + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.header}>
          <View>
            <ThemedText variant="bodySmall" color="textTertiary">Bonjour</ThemedText>
            <ThemedText variant="headlineLarge" color="textPrimary">Hēlo</ThemedText>
          </View>
          <IconButton size={44}>
            <Feather name="bell" size={20} color={Colors.textSecondary} />
          </IconButton>
        </Animated.View>

        {/* Hero Scan CTA */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroSection}>
          <LinearGradient
            colors={['#E8D5B0', '#C9A96E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroContent}>
              <ThemedText variant="headlineMedium" style={{ color: '#FFFFFF', marginBottom: 4 }}>
                Scanner un produit
              </ThemedText>
              <ThemedText variant="bodySmall" style={{ color: 'rgba(255,255,255,0.85)', marginBottom: Spacing.xl }}>
                Analysez la sécurité des ingrédients en quelques secondes
              </ThemedText>
              <Pressable
                style={({ pressed }) => [
                  styles.heroButton,
                  { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
                onPress={() => router.push('/(tabs)/scan')}
              >
                <Feather name="camera" size={18} color={Colors.accentDark} />
                <Text style={styles.heroButtonText}>Scanner maintenant</Text>
              </Pressable>
            </View>
            <View style={styles.heroDecoration}>
              <View style={styles.heroCircle1} />
              <View style={styles.heroCircle2} />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.delay(180).duration(500)} style={styles.statsRow}>
          <Card style={styles.statCard} padding={Spacing.lg}>
            <ThemedText variant="displayMedium" color="accent">3</ThemedText>
            <ThemedText variant="bodySmall" color="textSecondary">Scans aujourd'hui</ThemedText>
          </Card>
          <Card style={styles.statCard} padding={Spacing.lg}>
            <ThemedText variant="displayMedium" style={{ color: Colors.safe }}>2</ThemedText>
            <ThemedText variant="bodySmall" color="textSecondary">Produits sûrs</ThemedText>
          </Card>
          <Card style={styles.statCard} padding={Spacing.lg}>
            <ThemedText variant="displayMedium" style={{ color: Colors.caution }}>1</ThemedText>
            <ThemedText variant="bodySmall" color="textSecondary">À vérifier</ThemedText>
          </Card>
        </Animated.View>

        {/* Recent scans */}
        <Animated.View entering={FadeInDown.delay(240).duration(500)}>
          <View style={styles.sectionHeader}>
            <ThemedText variant="headlineMedium" color="textPrimary">Récents</ThemedText>
            <Pressable>
              <ThemedText variant="labelLarge" color="accent">Voir tout</ThemedText>
            </Pressable>
          </View>

          <View style={styles.scanList}>
            {RECENT_SCANS.map((item, index) => (
              <ScanCard key={item.id} item={item} index={index} />
            ))}
          </View>
        </Animated.View>

        {/* Disclaimer */}
        <Animated.View entering={FadeInDown.delay(320).duration(500)}>
          <Card style={styles.disclaimerCard} padding={Spacing.lg}>
            <View style={styles.disclaimerHeader}>
              <Feather name="info" size={14} color={Colors.textTertiary} />
              <ThemedText variant="labelSmall" color="textTertiary" style={{ marginLeft: 6 }}>
                INFORMATION MÉDICALE
              </ThemedText>
            </View>
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 6, lineHeight: 18 }}>
              Hēlo est un outil d'information. Consultez votre médecin avant de modifier vos habitudes pendant la grossesse.
            </ThemedText>
          </Card>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroSection: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  heroBanner: {
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    overflow: 'hidden',
  },
  heroContent: {
    zIndex: 1,
  },
  heroButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    ...Typography.labelLarge,
    color: Colors.accentDark,
  },
  heroDecoration: {
    position: 'absolute',
    right: -20,
    top: -20,
    bottom: -20,
  },
  heroCircle1: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    position: 'absolute',
    right: 10,
    top: 10,
  },
  heroCircle2: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.1)',
    position: 'absolute',
    right: 50,
    bottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  scanList: {
    gap: Spacing.sm,
  },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    ...Shadows.soft,
  },
  scanCardIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanCardContent: {
    flex: 1,
    gap: 2,
  },
  disclaimerCard: {
    backgroundColor: Colors.backgroundSecondary,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
