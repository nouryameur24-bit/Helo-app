// ─── Widget Preview & Instructions — Hēlo ──────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { calculateGlowScore } from '@/lib/glowscore';

import SmallWidgetPreview from '@/components/widget-preview/SmallWidgetPreview';
import MediumWidgetPreview from '@/components/widget-preview/MediumWidgetPreview';
import StepRow from '@/components/widget-preview/StepRow';
import styles from '@/components/widget-preview/widgetPreviewStyles';
import { glowColor, glowLabel } from '@/components/widget-preview/widgetHelpers';
import { STORAGE_KEYS } from '@/lib/storageKeys';

export default function WidgetPreviewScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [score, setScore] = useState(72);
  const [week, setWeek] = useState(20);
  const [trimester, setTrimester] = useState(2);

  useEffect(() => {
    (async () => {
      try {
        const weekRaw = await AsyncStorage.getItem(STORAGE_KEYS.lastTrimester);
        const shelfRaw = await AsyncStorage.getItem(STORAGE_KEYS.shelf);
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
        const wRaw = await AsyncStorage.getItem(STORAGE_KEYS.weekOfPregnancy);
        if (wRaw) {
          const w = parseInt(wRaw, 10);
          if (!isNaN(w)) setWeek(w);
        }
      } catch {
        // AsyncStorage read failure — widget renders with default values
      }
    })();
  }, []);

  const accentColor = glowColor(score);

  return (
    <View style={styles.root}>
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
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: (insets.bottom || 20) + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Widget iOS section ─────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, styles.sectionIconBlue]}>
              <ThemedText style={styles.emojiText}>📱</ThemedText>
            </View>
            <View style={styles.sectionFlex}>
              <ThemedText variant="headlineMedium" color="textPrimary">Widget iOS</ThemedText>
              <ThemedText variant="bodySmall" color="textTertiary">Écran d'accueil iPhone</ThemedText>
            </View>
          </View>

          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <ThemedText variant="bodySmall" color="textTertiary" style={styles.previewLabel}>
              Aperçu — vos vraies données
            </ThemedText>

            <View style={styles.previewRow}>
              <View style={styles.previewGroup}>
                <SmallWidgetPreview score={score} week={week} />
                <ThemedText variant="bodySmall" color="textTertiary" style={styles.previewCaption}>
                  Petit
                </ThemedText>
              </View>

              <View style={styles.previewGroup}>
                <MediumWidgetPreview score={score} week={week} trimester={trimester} />
                <ThemedText variant="bodySmall" color="textTertiary" style={styles.previewCaption}>
                  Moyen
                </ThemedText>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(350)} style={styles.scoreBadgeRow}>
            <View style={[styles.scoreBadge, { backgroundColor: accentColor + '22' }]}>
              <View style={[styles.scoreDot, { backgroundColor: accentColor }]} />
              <ThemedText variant="bodySmall" style={[styles.scoreBadgeLabel, { color: accentColor }]}>
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
          <ThemedText variant="headlineMedium" color="textPrimary" style={styles.sectionTitle}>
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

          <View style={styles.infoCard}>
            <Feather name="info" size={15} color={Colors.accent} />
            <ThemedText variant="bodySmall" color="textSecondary" style={styles.infoText}>
              Le widget est disponible dans la version native de Hēlo (App Store). Il utilise les App Groups iOS pour partager votre Glow Score en temps réel avec l'écran d'accueil.
            </ThemedText>
          </View>
        </Animated.View>

        {/* ── Données synchronisées ──────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(280).duration(400)} style={styles.section}>
          <ThemedText variant="headlineMedium" color="textPrimary" style={styles.sectionTitleMd}>
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
                  <View style={styles.dataBody}>
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
            <View style={[styles.sectionIcon, styles.sectionIconGray]}>
              <ThemedText style={styles.emojiText}>⌚</ThemedText>
            </View>
            <View style={styles.sectionFlex}>
              <ThemedText variant="headlineMedium" color="textPrimary">Apple Watch</ThemedText>
              <View style={styles.comingSoonBadge}>
                <ThemedText style={styles.comingSoonText}>En développement</ThemedText>
              </View>
            </View>
          </View>

          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.watchIntro}>
            La complication Apple Watch et l'app Watch sont en cours de développement pour une prochaine version de Hēlo.
          </ThemedText>

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
                desc: "Démarrez un scan de produit depuis votre poignet, le scanner s'ouvre sur l'iPhone.",
              },
              {
                icon: '📳',
                title: 'Haptiques & alertes',
                desc: "Vibration douce quand un produit de votre placard fait l'objet d'un rappel, ou lors d'un changement de trimestre.",
              },
            ].map((feature, i) => (
              <React.Fragment key={feature.title}>
                {i > 0 && <View style={styles.stepDivider} />}
                <View style={styles.watchFeatureRow}>
                  <ThemedText style={styles.watchFeatureEmoji}>{feature.icon}</ThemedText>
                  <View style={styles.watchFeatureBody}>
                    <ThemedText variant="labelLarge" color="textPrimary">{feature.title}</ThemedText>
                    <ThemedText variant="bodySmall" color="textTertiary" style={styles.watchFeatureDesc}>
                      {feature.desc}
                    </ThemedText>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>

          <View style={[styles.infoCard, styles.infoCardTop]}>
            <Feather name="clock" size={15} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary" style={styles.infoText}>
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
            <ThemedText variant="bodySmall" color="textTertiary" style={styles.ctaSub}>
              Notre équipe est là pour vous aider.
            </ThemedText>
            <Pressable
              onPress={() => Linking.openURL('mailto:support@helo-app.fr?subject=Widget iOS')}
              style={({ pressed }) => [styles.contactBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="mail" size={14} color={Colors.surface} />
              <ThemedText variant="labelLarge" style={styles.contactBtnText}>
                Contacter le support
              </ThemedText>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
