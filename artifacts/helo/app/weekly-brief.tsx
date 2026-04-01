import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { GlowScoreCircle } from '@/components/GlowScoreCircle';
import { GlowScoreMini } from '@/components/GlowScoreMini';
import { IllustrationGlowScore } from '@/components/illustrations/IllustrationGlowScore';
import { IllustrationShelf } from '@/components/illustrations/IllustrationShelf';
import { IllustrationTrimester } from '@/components/illustrations/IllustrationTrimester';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { calculateGlowScore } from '@/lib/glowscore';
import { getTipForWeek } from '@/constants/weeklyTips';
import { useTrimester } from '@/hooks/useTrimester';
import { useProfile } from '@/hooks/useProfile';
import { useShelfData } from '@/hooks/useShelfData';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import type { ShelfProduct } from '@/components/shelf/ShelfCard';

const { width: W, height: H } = Dimensions.get('window');
const SLIDE_COUNT = 5;

const BRIEF_READ_KEY = '@helo_last_brief_read';


const FEATURED_PRODUCT = {
  name: 'Sensibio H2O',
  brand: 'BIODERMA',
  category: 'salle-de-bain',
  adopters: 2847,
  description: 'Eau micellaire douce, sans alcool, sans parabènes. L\'une des formules les plus sûres du marché pour les peaux sensibles pendant la grossesse.',
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current }: { current: number }) {
  return (
    <View style={progressStyles.row}>
      {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
        <View
          key={i}
          style={[
            progressStyles.segment,
            { backgroundColor: i <= current ? Colors.accent : Colors.borderLight },
          ]}
        />
      ))}
    </View>
  );
}

const progressStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: Radius.full,
  },
});

// ─── Slide 1 — Votre semaine ──────────────────────────────────────────────────

function SlideVotreSemaine({
  week,
  glowScore,
  trimesterLabel,
}: {
  week: number;
  glowScore: number;
  trimesterLabel: string;
}) {
  const trend: 'up' | 'down' | 'stable' = 'up';

  return (
    <View style={[slide.root, { backgroundColor: Colors.background }]}>
      <View style={slide.content}>
        <View style={slide.topRow}>
          <View style={[slide.badge, { backgroundColor: Colors.accentLight }]}>
            <ThemedText variant="labelSmall" style={{ color: Colors.accentDark }}>
              {trimesterLabel}
            </ThemedText>
          </View>
        </View>

        <ThemedText variant="labelSmall" color="textTertiary" style={{ marginTop: Spacing.xl }}>
          CETTE SEMAINE
        </ThemedText>
        <ThemedText variant="displayLarge" color="textPrimary" style={{ marginTop: 4 }}>
          Semaine {week}
        </ThemedText>
        <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.sm }}>
          Voici votre résumé personnalisé
        </ThemedText>

        <View style={slide.divider} />

        <Card padding={Spacing.xl} style={slide.card}>
          <ThemedText variant="labelSmall" color="textTertiary" style={{ marginBottom: Spacing.md }}>
            VOTRE GLOW SCORE
          </ThemedText>
          <GlowScoreMini score={glowScore} trend={trend} animated />
        </Card>

        <View style={slide.illustrationRow}>
          <IllustrationGlowScore size={160} />
        </View>
      </View>
    </View>
  );
}

// ─── Slide 2 — Conseil ───────────────────────────────────────────────────────

function SlideConseil({ week }: { week: number }) {
  const tip = getTipForWeek(week);

  return (
    <View style={[slide.root, { backgroundColor: Colors.safeBg }]}>
      <View style={slide.content}>
        <View style={[slide.badge, { backgroundColor: Colors.safeLight }]}>
          <Feather name="book-open" size={12} color={Colors.safe} />
          <ThemedText variant="labelSmall" style={{ color: Colors.safe, marginLeft: 4 }}>
            CONSEIL
          </ThemedText>
        </View>

        <View style={slide.illustrationRowTop}>
          <IllustrationShelf size={120} />
        </View>

        <ThemedText variant="headlineLarge" color="textPrimary" style={slide.tipTitle}>
          {tip.title}
        </ThemedText>

        <ThemedText variant="bodyMedium" color="textSecondary" style={slide.tipBody}>
          {tip.body}
        </ThemedText>

        <View style={slide.sourceRow}>
          <Feather name="shield" size={12} color={Colors.textTertiary} />
          <ThemedText variant="bodySmall" color="textTertiary" style={{ marginLeft: 4 }}>
            Source : {tip.source}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

// ─── Slide 3 — Découverte ────────────────────────────────────────────────────

function SlideDecouverte({ onAddToList }: { onAddToList: () => void }) {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    setAdded(true);
    onAddToList();
  };

  return (
    <View style={[slide.root, { backgroundColor: Colors.background }]}>
      <View style={slide.content}>
        <View style={[slide.badge, { backgroundColor: Colors.accentLight }]}>
          <Feather name="star" size={12} color={Colors.accentDark} />
          <ThemedText variant="labelSmall" style={{ color: Colors.accentDark, marginLeft: 4 }}>
            DÉCOUVERTE
          </ThemedText>
        </View>

        <ThemedText variant="labelSmall" color="textTertiary" style={{ marginTop: Spacing.xl }}>
          PRODUIT MIS EN AVANT
        </ThemedText>

        <Card padding={Spacing.xl} style={slide.featuredCard}>
          <View style={slide.featuredHeader}>
            <View style={slide.featuredIconWrap}>
              <Feather name="droplet" size={24} color={Colors.safe} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="headlineMedium" color="textPrimary">
                {FEATURED_PRODUCT.name}
              </ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary">
                {FEATURED_PRODUCT.brand}
              </ThemedText>
            </View>
            <View style={[slide.safeChip, { backgroundColor: Colors.safeLight }]}>
              <Feather name="check" size={12} color={Colors.safe} />
              <ThemedText variant="labelSmall" style={{ color: Colors.safe, marginLeft: 2 }}>
                Sûr
              </ThemedText>
            </View>
          </View>

          <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.lg }}>
            {FEATURED_PRODUCT.description}
          </ThemedText>

          <View style={slide.adoptersRow}>
            <Feather name="users" size={14} color={Colors.accent} />
            <ThemedText variant="bodySmall" color="accent" style={{ marginLeft: Spacing.xs }}>
              Adopté par {FEATURED_PRODUCT.adopters.toLocaleString('fr-FR')} mamans
            </ThemedText>
          </View>
        </Card>

        <View style={{ marginTop: Spacing.xl }}>
          {added ? (
            <View style={slide.addedRow}>
              <Feather name="check-circle" size={20} color={Colors.safe} />
              <ThemedText variant="labelLarge" style={{ color: Colors.safe, marginLeft: Spacing.sm }}>
                Ajouté à votre liste !
              </ThemedText>
            </View>
          ) : (
            <View>
              <Button variant="primary" onPress={handleAdd} fullWidth>
                Ajouter à ma liste
              </Button>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Slide 4 — Alertes ───────────────────────────────────────────────────────

function AnimatedCheck() {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      300,
      withSequence(
        withTiming(1.2, { duration: 400, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 150 }),
      ),
    );
    opacity.value = withDelay(300, withTiming(1, { duration: 400 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[slide.checkCircle, style]}>
      <Feather name="check" size={48} color={Colors.safe} />
    </Animated.View>
  );
}

function SlideAlertes({ riskProducts }: { riskProducts: ShelfProduct[] }) {
  const allGreen = riskProducts.length === 0;

  return (
    <View style={[slide.root, { backgroundColor: allGreen ? Colors.safeBg : Colors.dangerBg }]}>
      <View style={slide.content}>
        <View style={[slide.badge, {
          backgroundColor: allGreen ? Colors.safeLight : Colors.dangerLight,
        }]}>
          <Feather
            name={allGreen ? 'shield' : 'alert-triangle'}
            size={12}
            color={allGreen ? Colors.safe : Colors.danger}
          />
          <ThemedText
            variant="labelSmall"
            style={{ color: allGreen ? Colors.safe : Colors.danger, marginLeft: 4 }}
          >
            ALERTES
          </ThemedText>
        </View>

        {allGreen ? (
          <View style={slide.allGreenWrap}>
            <AnimatedCheck />
            <ThemedText variant="headlineLarge" color="textPrimary" style={slide.allGreenTitle}>
              Tout est au vert !
            </ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary" style={slide.allGreenBody}>
              Votre placard ne contient aucun produit à risque pour cette semaine. Bravo !
            </ThemedText>
          </View>
        ) : (
          <View style={{ marginTop: Spacing.xxl }}>
            <ThemedText variant="headlineLarge" color="textPrimary">
              {riskProducts.length} produit{riskProducts.length > 1 ? 's' : ''} à surveiller
            </ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.sm, marginBottom: Spacing.xl }}>
              Ces produits de votre placard méritent votre attention.
            </ThemedText>

            <View style={slide.alertList}>
              {riskProducts.slice(0, 4).map((p) => (
                <View key={p.id} style={slide.alertRow}>
                  <View style={[
                    slide.alertDot,
                    { backgroundColor: p.verdict === 'danger' ? Colors.dangerLight : Colors.cautionLight },
                  ]}>
                    <Feather
                      name={p.verdict === 'danger' ? 'x-circle' : 'alert-circle'}
                      size={16}
                      color={p.verdict === 'danger' ? Colors.danger : Colors.caution}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="labelLarge" color="textPrimary" numberOfLines={1}>
                      {p.name}
                    </ThemedText>
                    <ThemedText variant="bodySmall" color="textTertiary">
                      {p.brand} · {p.verdictLabel}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>

            <View style={{ marginTop: Spacing.xl }}>
              <Button variant="secondary" onPress={() => router.push('/alternatives')} fullWidth>
                Voir les alternatives
              </Button>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Slide 5 — Partager ──────────────────────────────────────────────────────

function SlidePartager({ glowScore, week }: { glowScore: number; week: number }) {
  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Semaine ${week} de grossesse — mon Glow Score Hēlo est de ${glowScore}/100 ! Analysez vos produits en toute sécurité avec Hēlo.`,
      });
    } catch {
      // Share not supported in web renderer — no-op for native mobile app
    }
  }, [glowScore, week]);

  return (
    <View style={[slide.root, { backgroundColor: Colors.background }]}>
      <View style={slide.content}>
        <View style={[slide.badge, { backgroundColor: Colors.accentLight }]}>
          <Feather name="share-2" size={12} color={Colors.accentDark} />
          <ThemedText variant="labelSmall" style={{ color: Colors.accentDark, marginLeft: 4 }}>
            PARTAGER
          </ThemedText>
        </View>

        <ThemedText variant="headlineLarge" color="textPrimary" style={{ marginTop: Spacing.xl }}>
          Partagez votre score
        </ThemedText>
        <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.sm }}>
          Inspirez d'autres mamans à prendre soin d'elles pendant la grossesse.
        </ThemedText>

        <View style={slide.shareCircle}>
          <GlowScoreCircle score={glowScore} size="large" animated />
        </View>

        <ThemedText variant="bodySmall" color="textTertiary" style={slide.shareWeek}>
          Semaine {week} de grossesse
        </ThemedText>

        <View style={slide.shareButtons}>
          <View>
            <Button variant="primary" onPress={handleShare} fullWidth>
              Partager mon score
            </Button>
          </View>
          <View style={{ marginTop: Spacing.md }}>
            <Button variant="ghost" onPress={() => router.back()} fullWidth>
              Fermer le brief
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function WeeklyBriefScreen() {
  const insets = useSafeAreaInsets();
  const { weekOfPregnancy, trimester } = useTrimester();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const week = weekOfPregnancy;

  const { userId } = useProfile();
  const { shelf } = useShelfData(userId ?? undefined);
  const { score: glowScore } = calculateGlowScore(shelf);
  const riskProducts = useMemo(
    () => shelf.filter((p) => p.verdict === 'danger' || p.verdict === 'caution'),
    [shelf],
  );

  const trimesterLabel =
    trimester === 1 ? 'Premier trimestre' :
    trimester === 2 ? 'Deuxième trimestre' :
    'Troisième trimestre';

  useEffect(() => {
    AsyncStorage.setItem(BRIEF_READ_KEY, String(week));
  }, [week]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(e.nativeEvent.contentOffset.x / W);
      setCurrentPage(page);
    },
    [],
  );

  const handleAddToList = useCallback(() => {
    // In full version: add to AsyncStorage shopping list
  }, []);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* Header bar */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="x" size={22} color={Colors.textSecondary} />
        </Pressable>
        <ThemedText variant="labelLarge" color="textPrimary">
          Brief · Semaine {week}
        </ThemedText>
        <View style={{ width: 44 }} />
      </View>

      {/* Progress */}
      <ProgressBar current={currentPage} />

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        <SlideVotreSemaine
          week={week}
          glowScore={glowScore}
          trimesterLabel={trimesterLabel}
        />
        <SlideConseil week={week} />
        <SlideDecouverte onAddToList={handleAddToList} />
        <SlideAlertes riskProducts={riskProducts} />
        <SlidePartager glowScore={glowScore} week={week} />
      </ScrollView>

      {/* Next arrow (hidden on last slide) */}
      {currentPage < SLIDE_COUNT - 1 && (
        <Pressable
          style={[styles.nextBtn, { bottom: insets.bottom + 32 }]}
          onPress={() => {
            scrollRef.current?.scrollTo({ x: (currentPage + 1) * W, animated: true });
          }}
        >
          <Feather name="chevron-right" size={22} color={Colors.surface} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Shared slide styles ──────────────────────────────────────────────────────

const slide = StyleSheet.create({
  root: {
    width: W,
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xxl,
  },
  card: {
    ...Shadows.soft,
  },
  illustrationRow: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: Spacing.xxl,
  },
  illustrationRowTop: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  tipTitle: {
    marginTop: Spacing.lg,
    lineHeight: 30,
  },
  tipBody: {
    marginTop: Spacing.lg,
    lineHeight: 24,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  featuredCard: {
    marginTop: Spacing.lg,
    ...Shadows.soft,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featuredIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.safeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  adoptersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  addedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  allGreenWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.huge,
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.safeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  allGreenTitle: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  allGreenBody: {
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
  },
  alertList: {
    gap: Spacing.md,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.soft,
  },
  alertDot: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareCircle: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  shareWeek: {
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  shareButtons: {
    marginTop: 'auto',
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.borderLight,
  },
  nextBtn: {
    position: 'absolute',
    right: Spacing.xl,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
});
