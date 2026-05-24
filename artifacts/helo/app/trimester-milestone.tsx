import { Feather } from '@expo/vector-icons';
import { ROUTES } from '@/types/routes';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTrimester } from '@/hooks/useTrimester';
import { getTrimesterPalette } from '@/lib/trimester';

const TRIMESTER_INFO = {
  1: {
    label: '1er trimestre',
    weeks: 'Semaines 1–13',
    headline: 'Les fondations de la vie',
    description:
      'Votre bébé développe ses organes vitaux. C\'est une période de grandes transformations pour vous deux. Des soins adaptés sont essentiels dès maintenant.',
    tips: [
      'Évitez les rétinoïdes et les perturbateurs endocriniens',
      'Privilégiez les produits certifiés sans parabènes',
      'Consultez votre sage-femme pour toute question',
    ],
  },
  2: {
    label: '2e trimestre',
    weeks: 'Semaines 14–26',
    headline: 'La belle période',
    description:
      'Votre bébé grandit et bouge. Les nausées s\'atténuent pour la plupart. Profitez de cette énergie retrouvée tout en continuant à protéger votre grossesse.',
    tips: [
      'Continuez à éviter les huiles essentielles non validées',
      'Hydratez votre peau quotidiennement',
      'Certains ingrédients déconseillés en T1 sont tolérés en T2',
    ],
  },
  3: {
    label: '3e trimestre',
    weeks: 'Semaines 27–40',
    headline: 'La dernière ligne droite',
    description:
      'Votre bébé se prépare à naître. Votre corps travaille dur. Prenez soin de vous avec des produits doux et validés pour cette étape finale.',
    tips: [
      'Préparez votre peau à l\'accouchement avec des huiles douces',
      'Vérifiez vos produits de puériculture avec Hēlo',
      'Évitez tout nouveau produit non scanné',
    ],
  },
} as const;

export default function TrimesterMilestoneScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Lot 15B5 — milestone-screen est souvent atteint via notif weekly,
  // donc le user peut arriver en cold start sans historique → safeBack.
  const safeBack = useSafeBack('/(tabs)');
  const { trimester, weekOfPregnancy } = useTrimester();
  const palette = getTrimesterPalette(trimester);
  const info = TRIMESTER_INFO[trimester];
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + Spacing.lg, paddingBottom: bottomPadding + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.header}>
          <Pressable
            onPress={safeBack}
            style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(500)} style={styles.hero}>
          <LinearGradient
            colors={[palette.accentLight, palette.accent]}
            style={styles.heroGradient}
          >
            <ThemedText style={[styles.trimesterNumber, { color: '#fff' }]}>
              T{trimester}
            </ThemedText>
          </LinearGradient>

          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: palette.accentLight }]}>
              <ThemedText variant="labelSmall" style={{ color: palette.accent }}>
                {info.label.toUpperCase()}
              </ThemedText>
            </View>
            <View style={[styles.badge, { backgroundColor: Colors.backgroundSecondary }]}>
              <ThemedText variant="labelSmall" color="textSecondary">
                SA {weekOfPregnancy}
              </ThemedText>
            </View>
          </View>

          <ThemedText variant="headlineLarge" color="textPrimary" style={styles.headline}>
            {info.headline}
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.description}>
            {info.description}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
            CONSEILS POUR CE TRIMESTRE
          </ThemedText>
          <Card padding={Spacing.lg} style={styles.tipsCard}>
            {info.tips.map((tip, idx) => (
              <View key={idx} style={styles.tipRow}>
                <View style={[styles.tipDot, { backgroundColor: palette.accent }]} />
                <ThemedText variant="bodyMedium" color="textPrimary" style={styles.tipText}>
                  {tip}
                </ThemedText>
              </View>
            ))}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(400)}>
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: palette.accent, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push(ROUTES.shelf)}
          >
            <Feather name="package" size={18} color="#fff" />
            <ThemedText style={styles.ctaText}>
              Vérifier mon étagère
            </ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  heroGradient: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trimesterNumber: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  headline: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  tipsCard: {
    gap: Spacing.md,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    marginTop: 7,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    lineHeight: 22,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#fff',
  },
});
