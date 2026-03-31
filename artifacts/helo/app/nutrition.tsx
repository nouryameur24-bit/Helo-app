// ─── Nutritionniste IA — Hēlo ─────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import {
  CAFFEINE_KEYWORDS,
  FOOD_SOURCES_BY_PHASE,
  NUTRIENT_DEFS,
  PHASE_NEEDS,
  type FoodSource,
  type NutrientKey,
  type PhaseNeed,
} from '@/constants/nutritionNeeds';
import { getRecipesForPhase, getWeekRotation, type Recipe } from '@/constants/recipes';
import { useBreastfeeding } from '@/hooks/useBreastfeeding';
import { useBabyMode } from '@/hooks/useBabyMode';
import { useTrimester } from '@/hooks/useTrimester';

// ─── Resolve current phase key ────────────────────────────────────────────────
function usePhaseKey(): string {
  const { trimester } = useTrimester();
  const { isBreastfeeding } = useBreastfeeding();
  const { babyMode } = useBabyMode();
  if (babyMode) return 'baby';
  if (isBreastfeeding) return 'breastfeeding';
  return String(trimester ?? 2);
}

function phaseLabel(key: string): string {
  switch (key) {
    case '1': return '1er Trimestre';
    case '2': return '2e Trimestre';
    case '3': return '3e Trimestre';
    case 'breastfeeding': return 'Allaitement';
    case 'baby': return 'Mode Bébé';
    default: return 'Grossesse';
  }
}

function phaseEmoji(key: string): string {
  switch (key) {
    case '1': return '🌱';
    case '2': return '🌸';
    case '3': return '🌿';
    case 'breastfeeding': return '🤱';
    case 'baby': return '👶';
    default: return '🤰';
  }
}

// ─── Importance dots ──────────────────────────────────────────────────────────
function ImportanceDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <View style={styles.dotsRow}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i <= level ? Colors.accent : Colors.border },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Nutrient fill bar ────────────────────────────────────────────────────────
function NutrientBar({ fill }: { fill: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(fill / 100, { duration: 900 });
  }, [fill]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
    height: 5,
    borderRadius: 3,
    backgroundColor:
      fill > 70 ? Colors.safe :
      fill > 40 ? Colors.caution :
      Colors.danger,
  }));

  return (
    <View style={styles.fillTrack}>
      <Animated.View style={barStyle} />
    </View>
  );
}

// ─── Nutrient row ─────────────────────────────────────────────────────────────
function NutrientRow({ need, fill }: { need: PhaseNeed; fill: number }) {
  const def = NUTRIENT_DEFS[need.key];
  const pct = Math.min(100, Math.round(fill));
  const fillLabel =
    pct >= 70 ? 'Bon apport' :
    pct >= 35 ? 'Apport partiel' :
    'Faible apport';
  const fillColor =
    pct >= 70 ? Colors.safe :
    pct >= 35 ? Colors.caution :
    Colors.textTertiary;

  return (
    <View style={styles.nutrientRow}>
      <View style={styles.nutrientLeft}>
        <ThemedText style={styles.nutrientEmoji}>{def.emoji}</ThemedText>
        <View style={styles.nutrientInfo}>
          <View style={styles.nutrientTitleRow}>
            <ThemedText variant="labelLarge" color="textPrimary">{def.name}</ThemedText>
            <ImportanceDots level={need.importance} />
          </View>
          <NutrientBar fill={pct} />
          <View style={styles.nutrientMeta}>
            <ThemedText variant="bodySmall" style={{ color: fillColor }}>{fillLabel}</ThemedText>
            <ThemedText variant="bodySmall" color="textTertiary">{pct}%</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Food card ────────────────────────────────────────────────────────────────
function FoodCard({ food }: { food: FoodSource }) {
  return (
    <View style={styles.foodCard}>
      <ThemedText style={styles.foodEmoji}>{food.emoji}</ThemedText>
      <View style={styles.foodInfo}>
        <ThemedText variant="labelLarge" color="textPrimary">{food.name}</ThemedText>
        <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
          {food.tip}
        </ThemedText>
        <View style={styles.foodTags}>
          {food.nutrients.slice(0, 2).map((n) => (
            <View key={n} style={styles.nutrientTag}>
              <ThemedText style={styles.nutrientTagText}>
                {NUTRIENT_DEFS[n]?.emoji} {NUTRIENT_DEFS[n]?.name}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.safeBadge}>
        <ThemedText style={styles.safeBadgeText}>✓ Safe</ThemedText>
      </View>
    </View>
  );
}

// ─── Recipe card ──────────────────────────────────────────────────────────────
function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        setExpanded((v) => !v);
      }}
      style={({ pressed }) => [
        styles.recipeCard,
        { opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.recipeHeader}>
        <ThemedText style={styles.recipeEmoji}>{recipe.emoji}</ThemedText>
        <View style={{ flex: 1 }}>
          <ThemedText variant="labelLarge" color="textPrimary">{recipe.title}</ThemedText>
          <View style={styles.recipeMeta}>
            <Feather name="clock" size={11} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary">{recipe.duration}</ThemedText>
            <View style={styles.recipeDot} />
            <ThemedText variant="bodySmall" color="textTertiary">{recipe.difficulty}</ThemedText>
          </View>
        </View>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.textTertiary}
        />
      </View>

      {/* Nutrient tags */}
      <View style={styles.recipeTagsRow}>
        {recipe.nutrients.slice(0, 3).map((n) => (
          <View key={n} style={styles.nutrientTag}>
            <ThemedText style={styles.nutrientTagText}>
              {NUTRIENT_DEFS[n]?.emoji} {NUTRIENT_DEFS[n]?.name}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* Expanded details */}
      {expanded && (
        <View style={styles.recipeBody}>
          <ThemedText variant="labelLarge" color="textSecondary" style={{ marginTop: Spacing.md }}>
            Ingrédients
          </ThemedText>
          {recipe.ingredients.map((ing, i) => (
            <ThemedText key={i} variant="bodySmall" color="textPrimary" style={styles.ingredientLine}>
              • {ing}
            </ThemedText>
          ))}
          <ThemedText variant="labelLarge" color="textSecondary" style={{ marginTop: Spacing.md }}>
            Préparation
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 4, lineHeight: 18 }}>
            {recipe.steps}
          </ThemedText>
          {recipe.safeNote && (
            <View style={styles.recipeNote}>
              <Feather name="shield" size={12} color={Colors.safe} />
              <ThemedText variant="bodySmall" style={{ color: Colors.safe, flex: 1 }}>
                {recipe.safeNote}
              </ThemedText>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ─── Tip pill ─────────────────────────────────────────────────────────────────
function TipPill({ icon, text, type = 'info' }: { icon: string; text: string; type?: 'info' | 'warn' | 'good' }) {
  const bg =
    type === 'good' ? Colors.safeBg :
    type === 'warn' ? Colors.cautionLight :
    Colors.surface;
  const border =
    type === 'good' ? Colors.safeLight :
    type === 'warn' ? Colors.caution + '44' :
    Colors.border;
  const textColor =
    type === 'good' ? Colors.safe :
    type === 'warn' ? Colors.caution :
    Colors.textSecondary;

  return (
    <View style={[styles.tipPill, { backgroundColor: bg, borderColor: border }]}>
      <ThemedText style={{ fontSize: 16 }}>{icon}</ThemedText>
      <ThemedText variant="bodySmall" style={{ color: textColor, flex: 1, lineHeight: 18 }}>
        {text}
      </ThemedText>
    </View>
  );
}

// ─── Read recent cuisine scans from shelf ─────────────────────────────────────
interface ShelfItem {
  productName?: string;
  category?: string;
  savedAt?: number;
}

async function loadRecentCuisineScans(userId?: string | null): Promise<ShelfItem[]> {
  try {
    const raw = await AsyncStorage.getItem('@helo_shelf') ?? '[]';
    const all: ShelfItem[] = JSON.parse(raw);
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // last 30 days
    return all.filter((item) => {
      const isFood = item.category === 'cuisine';
      const isRecent = !item.savedAt || item.savedAt > cutoff;
      return isFood && isRecent;
    });
  } catch {
    return [];
  }
}

// ─── Estimate nutrient fill from recent scans ────────────────────────────────
function estimateFills(
  phaseNeeds: PhaseNeed[],
  recentScans: ShelfItem[],
): Record<NutrientKey, number> {
  const fills: Record<string, number> = {};

  for (const need of phaseNeeds) {
    const def = NUTRIENT_DEFS[need.key];
    if (!def) continue;
    let total = 0;
    for (const scan of recentScans) {
      const name = (scan.productName ?? '').toLowerCase();
      for (const kw of def.keywords) {
        if (name.includes(kw.toLowerCase())) {
          total += def.contributionPerMatch;
          break; // one match per product per nutrient
        }
      }
    }
    fills[need.key] = Math.min(100, total);
  }

  return fills as Record<NutrientKey, number>;
}

// ─── Generate personalized tips ───────────────────────────────────────────────
interface NutritionTip {
  icon: string;
  text: string;
  type: 'info' | 'warn' | 'good';
}

function generateTips(
  phaseKey: string,
  recentScans: ShelfItem[],
  fills: Record<NutrientKey, number>,
): NutritionTip[] {
  const tips: NutritionTip[] = [];
  const names = recentScans.map((s) => (s.productName ?? '').toLowerCase());

  // Caffeine check
  const caffeineCount = names.filter((n) =>
    CAFFEINE_KEYWORDS.some((kw) => n.includes(kw)),
  ).length;
  if (caffeineCount >= 2) {
    tips.push({
      icon: '☕',
      text: `Vous avez scanné plusieurs produits contenant de la caféine récemment. Rappel : max 200mg/jour (≈2 espressos) pendant la grossesse.`,
      type: 'warn',
    });
  }

  // Dairy products (calcium)
  const dairyCount = names.filter((n) =>
    ['lait', 'fromage', 'yaourt', 'kéfir'].some((kw) => n.includes(kw)),
  ).length;
  if (dairyCount >= 3) {
    tips.push({
      icon: '🥛',
      text: `Vous avez scanné beaucoup de produits laitiers cette semaine — excellent pour le calcium et la vitamine D !`,
      type: 'good',
    });
  }

  // Iron tip for T3 if low iron
  if (phaseKey === '3' && (fills.iron ?? 0) < 40) {
    tips.push({
      icon: '🩸',
      text: `Pensez à inclure des lentilles, du boudin noir (bien cuit) ou de la viande rouge 2-3x par semaine pour atteindre vos besoins en fer au T3.`,
      type: 'info',
    });
  }

  // Folate tip T1 if low
  if (phaseKey === '1' && (fills.folate ?? 0) < 40) {
    tips.push({
      icon: '🥦',
      text: `L'acide folique est crucial au 1er trimestre. Misez sur les lentilles, l'avocat et les légumes verts feuillus chaque jour.`,
      type: 'info',
    });
  }

  // Omega3 encouragement if good
  const fishCount = names.filter((n) =>
    ['saumon', 'sardine', 'maquereau', 'hareng'].some((kw) => n.includes(kw)),
  ).length;
  if (fishCount >= 2) {
    tips.push({
      icon: '🐟',
      text: `Bravo ! Votre consommation de poisson gras couvre bien vos besoins en oméga-3. Continuez à en manger 2x/semaine.`,
      type: 'good',
    });
  }

  // Breastfeeding hydration tip
  if (phaseKey === 'breastfeeding') {
    tips.push({
      icon: '💧',
      text: `N'oubliez pas de bien vous hydrater (1,5 à 2L d'eau/jour) — la production de lait augmente vos besoins hydriques.`,
      type: 'info',
    });
  }

  // Generic encouraging tip if no scans
  if (recentScans.length === 0) {
    tips.push({
      icon: '📲',
      text: `Scannez vos produits alimentaires et ajoutez-les à votre cuisine pour obtenir des conseils nutritionnels personnalisés !`,
      type: 'info',
    });
  }

  return tips.slice(0, 3); // max 3 tips
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const phaseKey = usePhaseKey();
  const { weekOfPregnancy } = useTrimester();

  const phaseNeeds: PhaseNeed[] = useMemo(() => PHASE_NEEDS[phaseKey] ?? [], [phaseKey]);
  const foodSources: FoodSource[] = useMemo(() => FOOD_SOURCES_BY_PHASE[phaseKey] ?? [], [phaseKey]);
  const rotation = getWeekRotation();
  const recipes: Recipe[] = useMemo(() => getRecipesForPhase(phaseKey, rotation), [phaseKey, rotation]);

  const [recentScans, setRecentScans] = useState<ShelfItem[]>([]);
  const [fills, setFills] = useState<Record<NutrientKey, number>>({} as Record<NutrientKey, number>);
  const [tips, setTips] = useState<NutritionTip[]>([]);

  useEffect(() => {
    loadRecentCuisineScans().then((scans) => {
      setRecentScans(scans);
      const estimated = estimateFills(phaseNeeds, scans);
      setFills(estimated);
      setTips(generateTips(phaseKey, scans, estimated));
    });
  }, [phaseKey, phaseNeeds]);

  // Baby mode: show minimal content
  if (phaseKey === 'baby') {
    return (
      <View style={[styles.root, { backgroundColor: Colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: topPadding + Spacing.lg, paddingBottom: 60 }]}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          </Pressable>
          <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.emptyState}>
            <ThemedText style={{ fontSize: 48 }}>👶</ThemedText>
            <ThemedText variant="displayMedium" color="textPrimary" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
              Mode Bébé actif
            </ThemedText>
            <ThemedText variant="bodyMedium" color="textTertiary" style={{ marginTop: Spacing.sm, textAlign: 'center', lineHeight: 22 }}>
              Les conseils nutritionnels sont optimisés pour votre grossesse. Désactivez le Mode Bébé pour afficher vos besoins.
            </ThemedText>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  const weekLabel = phaseKey.startsWith('breastfeeding') ? '' : `Semaine ${weekOfPregnancy}`;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, {
          paddingTop: topPadding + Spacing.lg,
          paddingBottom: insets.bottom + 80,
        }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.header}>
          <ThemedText variant="displayMedium" color="textPrimary">
            Votre nutrition
          </ThemedText>
          <View style={styles.phaseBadge}>
            <ThemedText style={{ fontSize: 14 }}>{phaseEmoji(phaseKey)}</ThemedText>
            <ThemedText variant="labelLarge" style={{ color: Colors.accent }}>
              {phaseLabel(phaseKey)}{weekLabel ? ` · ${weekLabel}` : ''}
            </ThemedText>
          </View>
          <ThemedText variant="bodyMedium" color="textTertiary" style={{ marginTop: 4 }}>
            Apports estimés depuis votre cuisine — basé sur vos {recentScans.length} produit{recentScans.length !== 1 ? 's' : ''} scanné{recentScans.length !== 1 ? 's' : ''}
          </ThemedText>
        </Animated.View>

        {/* ── Section 1 : Besoins du trimestre ──────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
          <View style={styles.sectionHeader}>
            <Feather name="activity" size={15} color={Colors.accent} />
            <ThemedText variant="labelLarge" color="textSecondary">Besoins de votre phase</ThemedText>
          </View>
          <View style={styles.card}>
            {phaseNeeds.length === 0 ? (
              <ThemedText variant="bodySmall" color="textTertiary">
                Aucune donnée nutritionnelle pour cette phase.
              </ThemedText>
            ) : (
              phaseNeeds.map((need, i) => (
                <React.Fragment key={need.key}>
                  <NutrientRow need={need} fill={fills[need.key] ?? 0} />
                  {i < phaseNeeds.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))
            )}
            {phaseNeeds.length > 0 && (
              <View style={styles.importanceLegend}>
                <View style={[styles.dot, { backgroundColor: Colors.accent }]} />
                <ThemedText variant="bodySmall" color="textTertiary">= Importance du nutriment</ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary">•• = moyen •••  = critique</ThemedText>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Personalized tips ─────────────────────────────────────────────── */}
        {tips.length > 0 && (
          <Animated.View entering={FadeInDown.delay(120).duration(400)}>
            <View style={styles.sectionHeader}>
              <Feather name="zap" size={15} color={Colors.accent} />
              <ThemedText variant="labelLarge" color="textSecondary">Conseils personnalisés</ThemedText>
            </View>
            <View style={styles.tipsColumn}>
              {tips.map((tip, i) => (
                <TipPill key={i} icon={tip.icon} text={tip.text} type={tip.type} />
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Section 2 : Aliments recommandés ─────────────────────────────── */}
        {foodSources.length > 0 && (
          <Animated.View entering={FadeInDown.delay(160).duration(400)}>
            <View style={styles.sectionHeader}>
              <Feather name="star" size={15} color={Colors.accent} />
              <ThemedText variant="labelLarge" color="textSecondary">Aliments recommandés cette semaine</ThemedText>
            </View>
            <View style={styles.foodsColumn}>
              {foodSources.map((food) => (
                <FoodCard key={food.name} food={food} />
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Section 3 : Recettes ──────────────────────────────────────────── */}
        {recipes.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View style={styles.sectionHeader}>
              <Feather name="book-open" size={15} color={Colors.accent} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="labelLarge" color="textSecondary">Recettes safe de la semaine</ThemedText>
              </View>
              <View style={styles.weekBadge}>
                <ThemedText variant="bodySmall" style={{ color: Colors.accent }}>
                  Rotation {rotation + 1}/4
                </ThemedText>
              </View>
            </View>
            <View style={styles.recipesColumn}>
              {recipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} />
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Disclaimer ────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(240).duration(400)}>
          <View style={styles.disclaimer}>
            <Feather name="info" size={13} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary" style={{ flex: 1, lineHeight: 17 }}>
              Ces informations sont des suggestions générales et ne remplacent pas les conseils d'un médecin ou d'une sage-femme. Consultez votre professionnel de santé pour des recommandations personnalisées.
            </ThemedText>
          </View>
        </Animated.View>

        {/* ── CTA: Scan food ────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(260).duration(400)}>
          <Pressable
            onPress={() => router.push('/(tabs)/scan' as never)}
            style={({ pressed }) => [styles.scanCTA, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="camera" size={16} color={Colors.accent} />
            <ThemedText variant="labelLarge" color="accent">
              Scanner un aliment pour enrichir mon profil
            </ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  header: { gap: Spacing.sm },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentLight + '55',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs ?? 4,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    ...Shadows.soft,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs ?? 4,
  },
  nutrientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nutrientLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  nutrientEmoji: {
    fontSize: 22,
    lineHeight: 28,
    width: 28,
    textAlign: 'center',
  },
  nutrientInfo: { flex: 1, gap: Spacing.xs ?? 4 },
  nutrientTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  fillTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.border,
    overflow: 'hidden',
    marginTop: Spacing.xs ?? 4,
  },
  nutrientMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  importanceLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexWrap: 'wrap',
  },
  tipsColumn: { gap: Spacing.sm },
  tipPill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  foodsColumn: { gap: Spacing.md },
  foodCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  foodEmoji: {
    fontSize: 26,
    lineHeight: 32,
    width: 36,
    textAlign: 'center',
  },
  foodInfo: { flex: 1 },
  foodTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs ?? 4,
    marginTop: Spacing.sm,
  },
  nutrientTag: {
    backgroundColor: Colors.accentLight + '66',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  nutrientTagText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 10,
    color: Colors.textSecondary,
  },
  safeBadge: {
    backgroundColor: Colors.safeBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.safeLight,
  },
  safeBadgeText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: Colors.safe,
  },
  recipesColumn: { gap: Spacing.md },
  recipeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  recipeEmoji: {
    fontSize: 24,
    lineHeight: 30,
    width: 32,
    textAlign: 'center',
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 3,
  },
  recipeDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
  },
  recipeTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs ?? 4,
    marginTop: Spacing.md,
  },
  recipeBody: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 2,
  },
  ingredientLine: {
    marginTop: 4,
    lineHeight: 18,
  },
  recipeNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.safeBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  weekBadge: {
    backgroundColor: Colors.accentLight + '55',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scanCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xxl,
  },
});
