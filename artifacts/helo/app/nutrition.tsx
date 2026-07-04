import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROUTES } from '@/types/routes';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
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

import NutrientRow from '@/components/nutrition/NutrientRow';
import FoodCard from '@/components/nutrition/FoodCard';
import RecipeCard from '@/components/nutrition/RecipeCard';
import TipPill from '@/components/nutrition/TipPill';

import { FeatureDiscoverySheet } from '@/components/ui/FeatureDiscoverySheet';
import { useFeatureDiscovery } from "@/hooks/useFeatureDiscovery";
import { STORAGE_KEYS } from '@/lib/storageKeys';
  

interface ShelfItem { productName?: string; category?: string; savedAt?: number; }
interface NutritionTip { icon: string; text: string; type: 'info' | 'warn' | 'good'; }

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
    case '1': return '1er Trimestre'; case '2': return '2e Trimestre'; case '3': return '3e Trimestre';
    case 'breastfeeding': return 'Allaitement'; case 'baby': return 'Mode Bébé'; default: return 'Grossesse';
  }
}

function phaseEmoji(key: string): string {
  switch (key) {
    case '1': return '🌱'; case '2': return '🌸'; case '3': return '🌿';
    case 'breastfeeding': return '🤱'; case 'baby': return '👶'; default: return '🤰';
  }
}

async function loadRecentCuisineScans(): Promise<ShelfItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.shelf) ?? '[]';
    const all: ShelfItem[] = JSON.parse(raw);
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return all.filter((item) => item.category === 'cuisine' && (!item.savedAt || item.savedAt > cutoff));
  } catch { return []; }
}

function estimateFills(phaseNeeds: PhaseNeed[], recentScans: ShelfItem[]): Record<NutrientKey, number> {
  const fills: Record<string, number> = {};
  for (const need of phaseNeeds) {
    const def = NUTRIENT_DEFS[need.key];
    if (!def) continue;
    let total = 0;
    for (const scan of recentScans) {
      const name = (scan.productName ?? '').toLowerCase();
      for (const kw of def.keywords) { if (name.includes(kw.toLowerCase())) { total += def.contributionPerMatch; break; } }
    }
    fills[need.key] = Math.min(100, total);
  }
  return fills as Record<NutrientKey, number>;
}

function generateTips(phaseKey: string, recentScans: ShelfItem[], fills: Record<NutrientKey, number>): NutritionTip[] {
  const tips: NutritionTip[] = [];
  const names = recentScans.map((s) => (s.productName ?? '').toLowerCase());
  const caffeineCount = names.filter((n) => CAFFEINE_KEYWORDS.some((kw) => n.includes(kw))).length;
  if (caffeineCount >= 2) tips.push({ icon: '☕', text: 'Tu as scanné plusieurs produits contenant de la caféine récemment. Rappel : max 200mg/jour (≈2 espressos) pendant la grossesse.', type: 'warn' });
  const dairyCount = names.filter((n) => ['lait', 'fromage', 'yaourt', 'kéfir'].some((kw) => n.includes(kw))).length;
  if (dairyCount >= 3) tips.push({ icon: '🥛', text: 'Tu as scanné beaucoup de produits laitiers cette semaine — excellent pour le calcium et la vitamine D !', type: 'good' });
  if (phaseKey === '3' && (fills.iron ?? 0) < 40) tips.push({ icon: '🩸', text: 'Pense à inclure des lentilles, du boudin noir (bien cuit) ou de la viande rouge 2-3x par semaine pour atteindre tes besoins en fer au T3.', type: 'info' });
  if (phaseKey === '1' && (fills.folate ?? 0) < 40) tips.push({ icon: '🥦', text: "L'acide folique est crucial au 1er trimestre. Misez sur les lentilles, l'avocat et les légumes verts feuillus chaque jour.", type: 'info' });
  const fishCount = names.filter((n) => ['saumon', 'sardine', 'maquereau', 'hareng'].some((kw) => n.includes(kw))).length;
  if (fishCount >= 2) tips.push({ icon: '🐟', text: 'Bravo ! Ta consommation de poisson gras couvre bien tes besoins en oméga-3. Continue à en manger 2x/semaine.', type: 'good' });
  if (phaseKey === 'breastfeeding') tips.push({ icon: '💧', text: "N'oublie pas de bien t'hydrater (1,5 à 2L d'eau/jour) — la production de lait augmente tes besoins hydriques.", type: 'info' });
  if (recentScans.length === 0) tips.push({ icon: '📲', text: 'Scanne tes produits alimentaires et ajoute-les à ta cuisine pour obtenir des conseils nutritionnels personnalisés !', type: 'info' });
  return tips.slice(0, 3);
}

export default function NutritionScreen() {
  const __discovery_nutrition = useFeatureDiscovery('nutrition');
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

  if (phaseKey === 'baby') {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <ScrollView contentContainerStyle={[s.content, { paddingTop: topPadding + Spacing.lg, paddingBottom: 60 }]} showsVerticalScrollIndicator={false}>
          <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          </Pressable>
          <Animated.View entering={FadeInDown.delay(0).duration(400)} style={{ alignItems: 'center', paddingVertical: 60 }}>
            <ThemedText style={{ fontSize: 48 }}>👶</ThemedText>
            <ThemedText variant="displayMedium" color="textPrimary" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>Mode Bébé actif</ThemedText>
            <ThemedText variant="bodyMedium" color="textTertiary" style={{ marginTop: Spacing.sm, textAlign: 'center', lineHeight: 22 }}>Les conseils nutritionnels sont optimisés pour ta grossesse. Désactive le Mode Bébé pour afficher tes besoins.</ThemedText>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  const weekLabel = phaseKey.startsWith('breastfeeding') ? '' : `Semaine ${weekOfPregnancy}`;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingTop: topPadding + Spacing.lg, paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>

        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={s.header}>
          <ThemedText variant="displayMedium" color="textPrimary">Ta nutrition</ThemedText>
          <View style={s.phaseBadge}>
            <ThemedText style={{ fontSize: 14 }}>{phaseEmoji(phaseKey)}</ThemedText>
            <ThemedText variant="labelLarge" style={{ color: Colors.accent }}>
              {phaseLabel(phaseKey)}{weekLabel ? ` · ${weekLabel}` : ''}
            </ThemedText>
          </View>
          <ThemedText variant="bodyMedium" color="textTertiary" style={{ marginTop: 4 }}>
            Apports estimés depuis ta cuisine — basé sur tes {recentScans.length} produit{recentScans.length !== 1 ? 's' : ''} scanné{recentScans.length !== 1 ? 's' : ''}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
          <View style={s.sectionHeader}>
            <Feather name="activity" size={15} color={Colors.accent} />
            <ThemedText variant="labelLarge" color="textSecondary">Besoins de ta phase</ThemedText>
          </View>
          <View style={s.card}>
            {phaseNeeds.length === 0 ? (
              <ThemedText variant="bodySmall" color="textTertiary">Aucune donnée nutritionnelle pour cette phase.</ThemedText>
            ) : phaseNeeds.map((need, i) => (
              <React.Fragment key={need.key}>
                <NutrientRow need={need} fill={fills[need.key] ?? 0} />
                {i < phaseNeeds.length - 1 && <View style={s.divider} />}
              </React.Fragment>
            ))}
          </View>
        </Animated.View>

        {tips.length > 0 && (
          <Animated.View entering={FadeInDown.delay(120).duration(400)}>
            <View style={s.sectionHeader}>
              <Feather name="zap" size={15} color={Colors.accent} />
              <ThemedText variant="labelLarge" color="textSecondary">Conseils personnalisés</ThemedText>
            </View>
            <View style={{ gap: Spacing.sm }}>
              {tips.map((tip, i) => <TipPill key={i} icon={tip.icon} text={tip.text} type={tip.type} />)}
            </View>
          </Animated.View>
        )}

        {foodSources.length > 0 && (
          <Animated.View entering={FadeInDown.delay(160).duration(400)}>
            <View style={s.sectionHeader}>
              <Feather name="star" size={15} color={Colors.accent} />
              <ThemedText variant="labelLarge" color="textSecondary">Aliments recommandés cette semaine</ThemedText>
            </View>
            <View style={{ gap: Spacing.md }}>
              {foodSources.map((food) => <FoodCard key={food.name} food={food} />)}
            </View>
          </Animated.View>
        )}

        {recipes.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View style={s.sectionHeader}>
              <Feather name="book-open" size={15} color={Colors.accent} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="labelLarge" color="textSecondary">Recettes safe de la semaine</ThemedText>
              </View>
              <View style={s.weekBadge}>
                <ThemedText variant="bodySmall" style={{ color: Colors.accent }}>Rotation {rotation + 1}/4</ThemedText>
              </View>
            </View>
            <View style={{ gap: Spacing.md }}>
              {recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(240).duration(400)}>
          <View style={s.disclaimer}>
            <Feather name="info" size={13} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary" style={{ flex: 1, lineHeight: 17 }}>
              Ces informations sont des suggestions générales et ne remplacent pas les conseils d'un médecin ou d'une sage-femme. Consulte ton professionnel de santé pour des recommandations personnalisées.
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(400)}>
          <Pressable
            onPress={() => router.push(ROUTES.scan)}
            style={({ pressed }) => [s.scanCTA, { opacity: pressed ? 0.8 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Scanner un aliment"
          >
            <Feather name="camera" size={16} color={Colors.accent} />
            <ThemedText variant="labelLarge" color="accent">Scanner un aliment pour enrichir mon profil</ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    <FeatureDiscoverySheet {...__discovery_nutrition.sheetProps} />
    </View>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.xl, gap: Spacing.lg },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  header: { gap: Spacing.sm },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'flex-start', backgroundColor: Colors.accentLight + '55', borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 4, borderWidth: 1, borderColor: Colors.accentLight },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, ...Shadows.soft },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  weekBadge: { backgroundColor: Colors.accentLight, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 3 },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight },
  scanCTA: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, borderColor: Colors.accentLight, borderRadius: Radius.lg, padding: Spacing.lg, justifyContent: 'center' },
});
