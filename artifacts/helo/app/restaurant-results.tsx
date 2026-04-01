// ─── Restaurant Results — Hēlo ────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
import type { DishCourse, DishResult, DishRisk, MenuAnalysis } from '@/lib/restaurant';

// ─── Constants ───────────────────────────────────────────────────────────────

const RESTAURANT_USED_KEY = '@helo_restaurant_used';
const MENU_RESULT_KEY = '@helo_menu_result';

const RESTAURANT_DISCLAIMER =
  'Cette analyse est indicative et basée sur la reconnaissance de texte. Les compositions exactes des plats peuvent varier. Consultez toujours votre médecin ou sage-femme pour des conseils personnalisés. N\'hésitez pas à interroger le personnel du restaurant.';

const COURSE_LABELS: Record<DishCourse, string> = {
  entrée: 'Entrées',
  plat: 'Plats',
  dessert: 'Desserts',
  boisson: 'Boissons',
  autre: 'Autres',
};

const RISK_COLORS: Record<DishRisk, string> = {
  safe: Colors.safe,
  caution: Colors.caution,
  danger: Colors.danger,
};

const RISK_LABELS: Record<DishRisk, string> = {
  safe: 'Compatible',
  caution: 'À vérifier',
  danger: 'Déconseillé',
};

const RISK_ICONS: Record<DishRisk, keyof typeof Feather.glyphMap> = {
  safe: 'check-circle',
  caution: 'alert-triangle',
  danger: 'x-circle',
};

type TabKey = 'tous' | DishCourse;

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'tous', label: 'Tous' },
  { key: 'entrée', label: 'Entrées' },
  { key: 'plat', label: 'Plats' },
  { key: 'dessert', label: 'Desserts' },
  { key: 'boisson', label: 'Boissons' },
];

// ─── Dish card ────────────────────────────────────────────────────────────────

function DishCard({
  dish,
  index,
  onCopyQuestion,
}: {
  dish: DishResult;
  index: number;
  onCopyQuestion: (q: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = dish.reasons.length > 0 || dish.questions.length > 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
      <Card style={styles.dishCard} padding={Spacing.lg}>
        <TouchableOpacity
          activeOpacity={hasDetail ? 0.75 : 1}
          onPress={() => hasDetail && setExpanded((v) => !v)}
        >
          <View style={styles.dishHeader}>
            <View style={styles.dishNameRow}>
              <Feather
                name={RISK_ICONS[dish.risk]}
                size={16}
                color={RISK_COLORS[dish.risk]}
                style={{ marginTop: 1 }}
              />
              <ThemedText
                variant="bodyMedium"
                style={[styles.dishName, { flex: 1 }]}
                numberOfLines={expanded ? undefined : 2}
              >
                {dish.name}
              </ThemedText>
            </View>
            <View style={styles.dishRight}>
              <View
                style={[
                  styles.riskBadge,
                  { backgroundColor: RISK_COLORS[dish.risk] + '22', borderColor: RISK_COLORS[dish.risk] + '66' },
                ]}
              >
                <ThemedText style={[styles.riskBadgeText, { color: RISK_COLORS[dish.risk] }]}>
                  {RISK_LABELS[dish.risk]}
                </ThemedText>
              </View>
              {hasDetail && (
                <Feather
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={Colors.textTertiary}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>

        {expanded && hasDetail && (
          <View style={styles.dishDetail}>
            <Divider style={{ marginVertical: Spacing.sm }} />
            {dish.reasons.map((r, i) => (
              <View key={i} style={styles.reasonRow}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText variant="bodySmall" color="textSecondary" style={styles.reasonText}>
                  {r}
                </ThemedText>
              </View>
            ))}
            {dish.questions.length > 0 && (
              <View style={styles.questionsBlock}>
                <ThemedText variant="labelSmall" color="textTertiary" style={styles.questionsLabel}>
                  QUESTIONS POUR LE SERVEUR
                </ThemedText>
                {dish.questions.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.questionRow}
                    activeOpacity={0.7}
                    onPress={() => onCopyQuestion(q)}
                  >
                    <ThemedText variant="bodySmall" color="textSecondary" style={styles.questionText}>
                      {q}
                    </ThemedText>
                    <Feather name="copy" size={12} color={Colors.accent} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </Card>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RestaurantResultsScreen() {
  const insets = useSafeAreaInsets();
  const { isPremium, requirePremium } = usePremium();

  const [analysis, setAnalysis] = useState<MenuAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('tous');
  const [copiedQuestion, setCopiedQuestion] = useState<string | null>(null);
  const [premiumBlocked, setPremiumBlocked] = useState(false);

  // ── Load analysis from AsyncStorage ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // Premium gate: 1 free restaurant scan
        if (!isPremium) {
          const used = await AsyncStorage.getItem(RESTAURANT_USED_KEY);
          if (used) {
            setPremiumBlocked(true);
            setLoading(false);
            return;
          }
          await AsyncStorage.setItem(RESTAURANT_USED_KEY, '1');
        }

        const raw = await AsyncStorage.getItem(MENU_RESULT_KEY);
        if (raw) {
          setAnalysis(JSON.parse(raw) as MenuAnalysis);
        }
      } catch {
        // AsyncStorage read failure is non-critical — screen will show empty state
      } finally {
        setLoading(false);
      }
    })();
  }, [isPremium]);

  // ── Copy question to clipboard ────────────────────────────────────────────
  const handleCopyQuestion = useCallback(async (question: string) => {
    await Clipboard.setStringAsync(question);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedQuestion(question);
    setTimeout(() => setCopiedQuestion(null), 2000);
  }, []);

  // ── Share results ─────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!analysis) return;
    const safeDishes = analysis.dishes.filter((d) => d.risk === 'safe');
    const questions = [
      ...new Set(analysis.dishes.flatMap((d) => d.questions)),
    ];
    let text = `🍽 Analyse de menu — Hēlo\n`;
    text += `${analysis.dishes.length} plats analysés · ${analysis.safeCount} compatibles · ${analysis.cautionCount + analysis.dangerCount} à vérifier\n\n`;
    if (safeDishes.length > 0) {
      text += `✅ À commander sereinement :\n${safeDishes.map((d) => `• ${d.name}`).join('\n')}\n\n`;
    }
    if (questions.length > 0) {
      text += `❓ Questions pour le serveur :\n${questions.map((q) => `• ${q}`).join('\n')}\n\n`;
    }
    text += 'Analysé avec Hēlo — l\'appli grossesse & sécurité produits';
    try {
      await Share.share({ message: text });
    } catch {
      // Share not supported in web renderer — no-op for native mobile app
    }
  }, [analysis]);

  // ── Filtered dishes by tab ────────────────────────────────────────────────
  const filteredDishes =
    activeTab === 'tous'
      ? (analysis?.dishes ?? [])
      : (analysis?.dishes ?? []).filter((d) => d.course === activeTab);

  const safeDishes = (analysis?.dishes ?? []).filter((d) => d.risk === 'safe');
  const allQuestions = [...new Set((analysis?.dishes ?? []).flatMap((d) => d.questions))];

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.background }]}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.lg }}>
          Analyse en cours…
        </ThemedText>
      </View>
    );
  }

  // ── Premium gate ──────────────────────────────────────────────────────────
  if (premiumBlocked) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, backgroundColor: Colors.background }]}>
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + Spacing.sm }]}
          onPress={() => router.back()}
        >
          <Feather name="x" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.center}>
          <ThemedText style={styles.premiumEmoji}>🍽</ThemedText>
          <ThemedText variant="headlineLarge" style={styles.premiumTitle}>
            Mode Restaurant
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.premiumBody}>
            Vous avez utilisé votre analyse gratuite. Passez à Premium pour analyser autant de menus que vous souhaitez.
          </ThemedText>
          <TouchableOpacity
            style={styles.premiumBtn}
            activeOpacity={0.85}
            onPress={() => requirePremium('feature')}
          >
            <ThemedText style={styles.premiumBtnText}>Découvrir Premium</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Error states ──────────────────────────────────────────────────────────
  if (!analysis) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.background }]}>
        <Feather name="alert-circle" size={40} color={Colors.caution} />
        <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
          Impossible de charger les résultats.{'\n'}Veuillez réessayer.
        </ThemedText>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.xl }}>
          <ThemedText variant="bodyMedium" color="accent">Retour</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  if (analysis.error === 'NO_API_KEY') {
    return (
      <View style={[styles.root, { paddingTop: insets.top, backgroundColor: Colors.background }]}>
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + Spacing.sm }]}
          onPress={() => router.back()}
        >
          <Feather name="x" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.center}>
          <Feather name="key" size={40} color={Colors.caution} />
          <ThemedText variant="headlineMedium" style={{ textAlign: 'center', marginTop: Spacing.lg }}>
            Clé API manquante
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.sm, paddingHorizontal: Spacing.xl }}>
            Le Mode Restaurant nécessite une clé Google Vision. Ajoutez{' '}
            EXPO_PUBLIC_GOOGLE_VISION_KEY dans vos variables d'environnement.
          </ThemedText>
        </View>
      </View>
    );
  }

  if (analysis.error === 'NO_TEXT' || analysis.dishes.length === 0) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, backgroundColor: Colors.background }]}>
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + Spacing.sm }]}
          onPress={() => router.back()}
        >
          <Feather name="x" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.center}>
          <Feather name="file-text" size={40} color={Colors.textTertiary} />
          <ThemedText variant="headlineMedium" style={{ textAlign: 'center', marginTop: Spacing.lg }}>
            Aucun plat détecté
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.sm, paddingHorizontal: Spacing.xl }}>
            Essayez de photographier le menu en vous rapprochant pour améliorer la lisibilité du texte.
          </ThemedText>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.xl }}>
            <ThemedText style={styles.retryText}>Reprendre des photos</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Tab counts ────────────────────────────────────────────────────────────
  const tabCounts: Record<TabKey, number> = {
    tous: analysis.dishes.length,
    entrée: analysis.dishes.filter((d) => d.course === 'entrée').length,
    plat: analysis.dishes.filter((d) => d.course === 'plat').length,
    dessert: analysis.dishes.filter((d) => d.course === 'dessert').length,
    boisson: analysis.dishes.filter((d) => d.course === 'boisson').length,
    autre: analysis.dishes.filter((d) => d.course === 'autre').length,
  };

  // ── Main results ──────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* ── Header ── */}
      <Animated.View
        entering={FadeInUp.duration(300)}
        style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="headlineMedium" style={styles.headerTitle}>
          Menu analysé
        </ThemedText>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn} hitSlop={12}>
          <Feather name="share-2" size={20} color={Colors.accent} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary card ── */}
        <Animated.View entering={FadeInDown.delay(50).duration(350)}>
          <LinearGradient
            colors={['#2D2926', '#3d3530']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <ThemedText style={styles.summaryTitle}>
              {analysis.dishes.length} plat{analysis.dishes.length > 1 ? 's' : ''} détecté{analysis.dishes.length > 1 ? 's' : ''}
            </ThemedText>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statNumber, { color: Colors.safe }]}>
                  {analysis.safeCount}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Compatible{analysis.safeCount > 1 ? 's' : ''}</ThemedText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statNumber, { color: Colors.caution }]}>
                  {analysis.cautionCount}
                </ThemedText>
                <ThemedText style={styles.statLabel}>À vérifier</ThemedText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statNumber, { color: Colors.danger }]}>
                  {analysis.dangerCount}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Déconseillé{analysis.dangerCount > 1 ? 's' : ''}</ThemedText>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Course tabs ── */}
        <Animated.View entering={FadeInDown.delay(100).duration(350)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
            contentContainerStyle={styles.tabsContent}
          >
            {TABS.filter((t) => t.key === 'tous' || tabCounts[t.key] > 0).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.75}
              >
                <ThemedText
                  variant="bodySmall"
                  style={activeTab === tab.key ? [styles.tabText, styles.tabTextActive] : styles.tabText}
                >
                  {tab.label}
                  {tab.key !== 'tous' ? ` (${tabCounts[tab.key]})` : ''}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── Dish list ── */}
        <View style={styles.section}>
          {filteredDishes.length === 0 ? (
            <ThemedText variant="bodyMedium" color="textTertiary" style={styles.empty}>
              Aucun plat dans cette catégorie.
            </ThemedText>
          ) : (
            filteredDishes.map((dish, i) => (
              <DishCard
                key={`${dish.name}-${i}`}
                dish={dish}
                index={i}
                onCopyQuestion={handleCopyQuestion}
              />
            ))
          )}
        </View>

        {/* ── Commander sereinement ── */}
        {safeDishes.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(350)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="check-circle" size={16} color={Colors.safe} />
              <ThemedText variant="headlineMedium" style={styles.sectionTitle}>
                Commander sereinement
              </ThemedText>
            </View>
            <Card style={{ ...styles.safeCard, borderColor: Colors.safe + '44' }} padding={Spacing.lg}>
              {safeDishes.map((d, i) => (
                <View key={d.name}>
                  <View style={styles.safeDishRow}>
                    <Feather name="check" size={14} color={Colors.safe} />
                    <ThemedText variant="bodyMedium" style={styles.safeDishText}>
                      {d.name}
                    </ThemedText>
                  </View>
                  {i < safeDishes.length - 1 && <Divider style={{ marginVertical: Spacing.xs }} />}
                </View>
              ))}
            </Card>
          </Animated.View>
        )}

        {/* ── Questions pour le serveur ── */}
        {allQuestions.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250).duration(350)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="message-circle" size={16} color={Colors.accent} />
              <ThemedText variant="headlineMedium" style={styles.sectionTitle}>
                Questions pour le serveur
              </ThemedText>
            </View>
            <ThemedText variant="bodySmall" color="textTertiary" style={styles.questionsHint}>
              Appuyez pour copier et montrer au serveur
            </ThemedText>
            <View style={styles.questionsList}>
              {allQuestions.map((q, i) => {
                const isCopied = copiedQuestion === q;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.questionCard, isCopied ? styles.questionCardCopied : undefined]}
                    onPress={() => handleCopyQuestion(q)}
                    activeOpacity={0.75}
                  >
                    <ThemedText variant="bodyMedium" style={styles.questionCardText}>
                      {q}
                    </ThemedText>
                    <Feather
                      name={isCopied ? 'check' : 'copy'}
                      size={14}
                      color={isCopied ? Colors.safe : Colors.accent}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ── Disclaimer ── */}
        <View style={styles.disclaimer}>
          <Divider style={{ marginBottom: Spacing.lg }} />
          <ThemedText variant="bodySmall" color="textTertiary" style={styles.disclaimerText}>
            {RESTAURANT_DISCLAIMER}
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { flex: 1, textAlign: 'center' },
  backBtn: { padding: Spacing.xs },
  shareBtn: { padding: Spacing.xs },

  // Summary
  summaryCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  summaryTitle: {
    ...Typography.headlineLarge,
    color: '#fff',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: { alignItems: 'center' },
  statNumber: { ...Typography.displayMedium, fontFamily: 'PlusJakartaSans_700Bold' },
  statLabel: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Tabs
  tabsScroll: { marginBottom: Spacing.md },
  tabsContent: { paddingRight: Spacing.xl, gap: Spacing.sm },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText: { color: Colors.textSecondary },
  tabTextActive: { color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold' },

  // Section
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { flex: 1 },
  empty: { textAlign: 'center', marginVertical: Spacing.xl },

  // Dish card
  dishCard: { marginBottom: Spacing.sm, ...Shadows.soft },
  dishHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  dishNameRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  dishName: { fontFamily: 'PlusJakartaSans_500Medium' },
  dishRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  riskBadge: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  riskBadgeText: { ...Typography.labelSmall, fontFamily: 'PlusJakartaSans_600SemiBold' },
  dishDetail: { marginTop: Spacing.xs },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, marginBottom: 4 },
  bullet: { color: Colors.textTertiary, marginTop: 1 },
  reasonText: { flex: 1, lineHeight: 18 },
  questionsBlock: { marginTop: Spacing.md },
  questionsLabel: { marginBottom: Spacing.sm },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  questionText: { flex: 1, lineHeight: 18, fontStyle: 'italic' },

  // Safe section
  safeCard: { borderWidth: 1 },
  safeDishRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  safeDishText: { flex: 1 },

  // Questions for waiter
  questionsHint: { marginBottom: Spacing.md },
  questionsList: { gap: Spacing.sm },
  questionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  questionCardCopied: {
    backgroundColor: Colors.safe + '11',
    borderColor: Colors.safe + '44',
  },
  questionCardText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Disclaimer
  disclaimer: { paddingTop: Spacing.sm },
  disclaimerText: { lineHeight: 18, textAlign: 'center' },

  // Premium gate
  premiumEmoji: { fontSize: 48, marginBottom: Spacing.lg },
  premiumTitle: { textAlign: 'center', marginBottom: Spacing.sm },
  premiumBody: { textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 22 },
  premiumBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xxl,
    ...Shadows.medium,
  },
  premiumBtnText: { ...Typography.labelLarge, color: '#fff' },
  retryText: { ...Typography.labelLarge, color: Colors.accent },
});
