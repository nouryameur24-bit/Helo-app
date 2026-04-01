// ─── Widget Preview & Instructions — Hēlo ──────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Svg, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { calculateGlowScore } from '@/lib/glowscore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function glowColor(score: number): string {
  if (score > 80) return '#7CB69F';
  if (score >= 60) return '#C9A96E';
  if (score >= 40) return '#D4A853';
  return '#C27B7B';
}

function glowLabel(score: number): string {
  if (score > 80) return 'Excellent ✨';
  if (score >= 60) return 'Bon niveau 👍';
  if (score > 0) return 'À améliorer';
  return 'Scannez vos produits';
}

function phaseEmoji(trimester: number): string {
  if (trimester === 1) return '🌱';
  if (trimester === 2) return '🌸';
  return '🌿';
}

// ─── Small Widget Preview ─────────────────────────────────────────────────────
function SmallWidgetPreview({
  score,
  week,
}: {
  score: number;
  week: number;
}) {
  const color = glowColor(score);
  const RADIUS = 18;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <LinearGradient
      colors={['#FFFAF6', '#FFF5EC']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.smallWidget}
    >
      {/* Logo name */}
      <ThemedText style={[styles.widgetName, { color: Colors.accent }]}>Hēlo</ThemedText>

      {/* Glow circle */}
      <View style={styles.circleWrap}>
        <Svg width={44} height={44}>
          {/* Track */}
          <Circle
            cx={22}
            cy={22}
            r={RADIUS}
            stroke="#EDE8E2"
            strokeWidth={3}
            fill="none"
          />
          {/* Fill */}
          <Circle
            cx={22}
            cy={22}
            r={RADIUS}
            stroke={color}
            strokeWidth={3}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation="-90"
            origin="22, 22"
          />
        </Svg>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.circleCenter}>
            <ThemedText style={[styles.scoreSmall, { color }]}>{score}</ThemedText>
          </View>
        </View>
      </View>

      {/* Week */}
      {week > 0 && (
        <ThemedText style={styles.weekSmall}>Semaine {week}</ThemedText>
      )}
    </LinearGradient>
  );
}

// ─── Medium Widget Preview ────────────────────────────────────────────────────
function MediumWidgetPreview({
  score,
  week,
  trimester,
}: {
  score: number;
  week: number;
  trimester: number;
}) {
  const color = glowColor(score);
  const RADIUS = 22;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <LinearGradient
      colors={['#FFFAF6', '#FFF5EC']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.mediumWidget}
    >
      {/* Left — Glow Score */}
      <View style={styles.medLeft}>
        <View style={styles.circleWrap}>
          <Svg width={52} height={52}>
            <Circle cx={26} cy={26} r={RADIUS} stroke="#EDE8E2" strokeWidth={3.5} fill="none" />
            <Circle
              cx={26} cy={26} r={RADIUS}
              stroke={color} strokeWidth={3.5} fill="none"
              strokeDasharray={`${CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              rotation="-90" origin="26, 26"
            />
          </Svg>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.circleCenter}>
              <ThemedText style={[styles.scoreMedium, { color }]}>{score}</ThemedText>
            </View>
          </View>
        </View>
        <ThemedText style={styles.glowLabel}>Glow Score</ThemedText>
      </View>

      {/* Divider */}
      <View style={styles.medDivider} />

      {/* Right — Week + Scan */}
      <View style={styles.medRight}>
        {/* Scanner button row */}
        <View style={styles.scannerRow}>
          <Feather name="camera" size={14} color={Colors.accent} />
          <ThemedText style={styles.scannerLabel}>Scanner</ThemedText>
        </View>

        <View style={styles.medHorizontalLine} />

        {/* Week + Trimester */}
        <View style={{ gap: 2 }}>
          {week > 0 ? (
            <>
              <ThemedText style={styles.weekMedium}>Semaine {week}</ThemedText>
              <ThemedText style={styles.trimesterMedium}>
                {phaseEmoji(trimester)} Trimestre {trimester}
              </ThemedText>
            </>
          ) : (
            <ThemedText style={styles.trimesterMedium}>Configurez votre profil</ThemedText>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

// ─── Step row ─────────────────────────────────────────────────────────────────
function StepRow({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <ThemedText style={styles.stepNum}>{n}</ThemedText>
      </View>
      <ThemedText variant="bodyMedium" color="textSecondary" style={{ flex: 1, lineHeight: 22 }}>
        {text}
      </ThemedText>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WidgetPreviewScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [score, setScore] = useState(72);
  const [week, setWeek] = useState(20);
  const [trimester, setTrimester] = useState(2);

  // Load real data from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        // Week / trimester
        const weekRaw = await AsyncStorage.getItem('@helo_last_trimester');
        // Try shelf for glow score
        const shelfRaw = await AsyncStorage.getItem('@helo_shelf');
        if (shelfRaw) {
          const shelf = JSON.parse(shelfRaw);
          if (Array.isArray(shelf) && shelf.length > 0) {
            const { score: s } = calculateGlowScore(shelf);
            setScore(s);
          }
        }
        if (weekRaw) {
          const t = parseInt(weekRaw, 10);
          if (!isNaN(t)) setTrimester(Math.min(3, Math.max(1, t)));
        }
        // Try @helo_week_of_pregnancy
        const wRaw = await AsyncStorage.getItem('@helo_week_of_pregnancy');
        if (wRaw) {
          const w = parseInt(wRaw, 10);
          if (!isNaN(w)) setWeek(w);
        }
      } catch {
        // AsyncStorage read failure — widget renders with default values
      }
    })();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + Spacing.sm }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText variant="labelLarge" color="textPrimary">Widget & Apple Watch</ThemedText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: (insets.bottom || 20) + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Widget iOS section ─────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#EEF4FF' }]}>
              <ThemedText style={{ fontSize: 20 }}>📱</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="headlineMedium" color="textPrimary">Widget iOS</ThemedText>
              <ThemedText variant="bodySmall" color="textTertiary">Écran d'accueil iPhone</ThemedText>
            </View>
          </View>

          {/* Widget previews */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <ThemedText variant="bodySmall" color="textTertiary" style={styles.previewLabel}>
              Aperçu — vos vraies données
            </ThemedText>

            <View style={styles.previewRow}>
              {/* Small */}
              <View style={styles.previewGroup}>
                <SmallWidgetPreview score={score} week={week} />
                <ThemedText variant="bodySmall" color="textTertiary" style={styles.previewCaption}>
                  Petit
                </ThemedText>
              </View>

              {/* Medium */}
              <View style={styles.previewGroup}>
                <MediumWidgetPreview score={score} week={week} trimester={trimester} />
                <ThemedText variant="bodySmall" color="textTertiary" style={styles.previewCaption}>
                  Moyen
                </ThemedText>
              </View>
            </View>
          </Animated.View>

          {/* Score badge */}
          <Animated.View entering={FadeInDown.delay(180).duration(350)} style={styles.scoreBadgeRow}>
            <View style={[styles.scoreBadge, { backgroundColor: glowColor(score) + '22' }]}>
              <View style={[styles.scoreDot, { backgroundColor: glowColor(score) }]} />
              <ThemedText variant="bodySmall" style={{ color: glowColor(score), fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                {glowLabel(score)}
              </ThemedText>
            </View>
            <ThemedText variant="bodySmall" color="textTertiary">
              Glow Score actuel : {score}/100
            </ThemedText>
          </Animated.View>
        </Animated.View>

        {/* ── Comment activer ────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.section}>
          <ThemedText variant="headlineMedium" color="textPrimary" style={{ marginBottom: Spacing.lg }}>
            Comment ajouter le widget
          </ThemedText>

          <View style={styles.stepsCard}>
            <StepRow n={1} text="Sur votre iPhone, maintenez appuyé l'écran d'accueil jusqu'au mode édition." />
            <View style={styles.stepDivider} />
            <StepRow n={2} text='Appuyez sur le bouton "+" en haut à gauche pour ajouter un widget.' />
            <View style={styles.stepDivider} />
            <StepRow n={3} text='Recherchez "Hēlo" dans la liste des widgets disponibles.' />
            <View style={styles.stepDivider} />
            <StepRow n={4} text='Choisissez la taille souhaitée (Petit ou Moyen) et appuyez sur "Ajouter le widget".' />
            <View style={styles.stepDivider} />
            <StepRow n={5} text='Le widget affiche votre Glow Score en temps réel. Il se met à jour à chaque scan !' />
          </View>

          {/* Dev build note */}
          <View style={styles.infoCard}>
            <Feather name="info" size={15} color={Colors.accent} />
            <ThemedText variant="bodySmall" color="textSecondary" style={{ flex: 1, lineHeight: 18 }}>
              Le widget est disponible dans la version native de Hēlo (App Store). Il utilise les App Groups iOS pour partager votre Glow Score en temps réel avec l'écran d'accueil.
            </ThemedText>
          </View>
        </Animated.View>

        {/* ── Données synchronisées ──────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(280).duration(400)} style={styles.section}>
          <ThemedText variant="headlineMedium" color="textPrimary" style={{ marginBottom: Spacing.md }}>
            Données en temps réel
          </ThemedText>

          <View style={styles.dataCard}>
            {[
              { icon: 'zap', label: 'Glow Score', desc: 'Mis à jour à chaque scan produit', color: Colors.accent },
              { icon: 'calendar', label: 'Semaine de grossesse', desc: 'Calculée depuis votre DPA', color: '#7CB69F' },
              { icon: 'layers', label: 'Trimestre actuel', desc: 'T1 → T2 → T3 automatiquement', color: Colors.caution },
            ].map((item, i) => (
              <React.Fragment key={item.label}>
                {i > 0 && <View style={styles.stepDivider} />}
                <View style={styles.dataRow}>
                  <View style={[styles.dataIcon, { backgroundColor: item.color + '22' }]}>
                    <Feather name={item.icon as keyof typeof Feather.glyphMap} size={16} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="labelLarge" color="textPrimary">{item.label}</ThemedText>
                    <ThemedText variant="bodySmall" color="textTertiary">{item.desc}</ThemedText>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>
        </Animated.View>

        {/* ── Apple Watch section ────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(340).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#F0F0F5' }]}>
              <ThemedText style={{ fontSize: 20 }}>⌚</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="headlineMedium" color="textPrimary">Apple Watch</ThemedText>
              <View style={styles.comingSoonBadge}>
                <ThemedText style={styles.comingSoonText}>En développement</ThemedText>
              </View>
            </View>
          </View>

          <ThemedText variant="bodyMedium" color="textSecondary" style={{ lineHeight: 22, marginBottom: Spacing.lg }}>
            La complication Apple Watch et l'app Watch sont en cours de développement pour une prochaine version de Hēlo.
          </ThemedText>

          {/* Watch feature cards (what's planned) */}
          <View style={styles.watchFeaturesCard}>
            {[
              {
                icon: '⌚',
                title: 'Complication cadran',
                desc: 'Glow Score + cercle coloré visible directement sur le cadran de votre montre.',
              },
              {
                icon: '📸',
                title: 'Quick Scan depuis la montre',
                desc: 'Démarrez un scan de produit depuis votre poignet, le scanner s\'ouvre sur l\'iPhone.',
              },
              {
                icon: '📳',
                title: 'Haptiques & alertes',
                desc: 'Vibration douce quand un produit de votre placard fait l\'objet d\'un rappel, ou lors d\'un changement de trimestre.',
              },
            ].map((feature, i) => (
              <React.Fragment key={feature.title}>
                {i > 0 && <View style={styles.stepDivider} />}
                <View style={styles.watchFeatureRow}>
                  <ThemedText style={{ fontSize: 24 }}>{feature.icon}</ThemedText>
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText variant="labelLarge" color="textPrimary">{feature.title}</ThemedText>
                    <ThemedText variant="bodySmall" color="textTertiary" style={{ lineHeight: 18 }}>
                      {feature.desc}
                    </ThemedText>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>

          <View style={[styles.infoCard, { marginTop: Spacing.md }]}>
            <Feather name="clock" size={15} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary" style={{ flex: 1, lineHeight: 18 }}>
              La complication Apple Watch requiert un développement WatchKit natif distinct. Elle sera disponible dans une prochaine mise à jour majeure de Hēlo.
            </ThemedText>
          </View>
        </Animated.View>

        {/* ── Support CTA ────────────────────────────────────────────────── */}
        {Platform.OS === 'ios' && (
          <Animated.View entering={FadeInDown.delay(400).duration(350)} style={styles.ctaCard}>
            <ThemedText variant="labelLarge" color="textPrimary">
              Un problème avec le widget ?
            </ThemedText>
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 4, marginBottom: Spacing.md }}>
              Notre équipe est là pour vous aider.
            </ThemedText>
            <Pressable
              onPress={() => Linking.openURL('mailto:support@helo-app.fr?subject=Widget iOS')}
              style={({ pressed }) => [styles.contactBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="mail" size={14} color={Colors.surface} />
              <ThemedText variant="labelLarge" style={{ color: Colors.surface }}>
                Contacter le support
              </ThemedText>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },

  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, gap: Spacing.xxl },

  section: { gap: Spacing.md },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Widget previews
  previewLabel: {
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  previewRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  previewGroup: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewCaption: {
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_500Medium',
  },

  // Small widget (130×130 ≈ iOS systemSmall at 1.5× scale)
  smallWidget: {
    width: 120,
    height: 120,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    ...Shadows.soft,
  },
  widgetName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  circleWrap: {
    width: 44,
    height: 44,
  },
  circleCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreSmall: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
  },
  weekSmall: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 10,
    color: '#7A6F68',
    marginTop: 2,
  },

  // Medium widget (≈ iOS systemMedium 264×128)
  mediumWidget: {
    width: 230,
    height: 120,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    ...Shadows.soft,
  },
  medLeft: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingLeft: Spacing.md,
  },
  glowLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 9,
    color: '#807268',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreMedium: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
  },
  medDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#E8E2DC',
  },
  medRight: {
    flex: 1.2,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  scannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scannerLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: Colors.textPrimary,
  },
  medHorizontalLine: {
    height: 1,
    backgroundColor: '#E8E2DC',
    marginVertical: 2,
  },
  weekMedium: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  trimesterMedium: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: '#7A6F68',
  },

  // Score badge row
  scoreBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  scoreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Steps
  stepsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNum: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: Colors.accent,
  },
  stepDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Data
  dataCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  dataIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Watch
  comingSoonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    marginTop: 4,
  },
  comingSoonText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: Colors.textTertiary,
  },
  watchFeaturesCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  watchFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
  },

  // CTA
  ctaCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'flex-start',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
});
