import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { METHODOLOGY_DISCLAIMER } from '@/constants/legalTexts';

const SOURCES = [
  { name: 'ANSM', full: 'Agence nationale de sécurité du médicament', url: 'https://ansm.sante.fr' },
  { name: 'OMS', full: 'Organisation mondiale de la santé', url: 'https://www.who.int/fr' },
  { name: 'HAS', full: 'Haute Autorité de santé', url: 'https://www.has-sante.fr' },
  { name: 'CRAT', full: 'Centre de référence sur les agents tératogènes', url: 'https://www.lecrat.fr' },
  { name: 'ANSES', full: 'Agence nationale de sécurité sanitaire', url: 'https://www.anses.fr' },
  { name: 'FDA', full: 'Food and Drug Administration', url: 'https://www.fda.gov' },
];

const VERDICT_LEVELS = [
  { label: 'Compatible', color: Colors.safe, bg: Colors.safeLight, description: 'Aucune contre-indication connue pour la grossesse selon les sources consultées.' },
  { label: 'Précaution', color: Colors.caution, bg: Colors.cautionLight, description: 'Certains ingrédients nécessitent une vigilance. Consulte ton professionnel de santé.' },
  { label: 'À éviter', color: Colors.danger, bg: Colors.dangerLight, description: 'Contient des ingrédients déconseillés ou contre-indiqués pendant la grossesse.' },
];

export default function MethodologyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <ThemedText variant="headlineMedium" color="textPrimary">
          Notre méthodologie
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Feather name="cpu" size={18} color={Colors.accent} />
            </View>
            <ThemedText variant="headlineMedium" color="textPrimary">
              Comment fonctionne Hēlo
            </ThemedText>
          </View>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Hēlo analyse les produits que tu scannes en suivant un processus en plusieurs étapes :
          </ThemedText>
          {[
            'Scan du produit — identification par code-barres ou photo',
            'Identification des ingrédients — extraction de la liste complète',
            'Croisement avec notre base de données — vérification de chaque ingrédient',
            "Génération de l'analyse — évaluation globale du produit",
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <ThemedText variant="bodySmall" color="accent">{i + 1}</ThemedText>
              </View>
              <ThemedText variant="bodyMedium" color="textSecondary" style={styles.stepText}>
                {step}
              </ThemedText>
            </View>
          ))}
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Feather name="book-open" size={18} color={Colors.accent} />
            </View>
            <ThemedText variant="headlineMedium" color="textPrimary">
              Nos sources
            </ThemedText>
          </View>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Notre base de données est compilée à partir de sources médicales et scientifiques reconnues :
          </ThemedText>
          {SOURCES.map((source) => (
            <Pressable
              key={source.name}
              onPress={() => Linking.openURL(source.url)}
              style={styles.sourceRow}
            >
              <View style={styles.sourceBadge}>
                <ThemedText variant="labelSmall" color="accent">{source.name}</ThemedText>
              </View>
              <View style={styles.sourceInfo}>
                <ThemedText variant="bodyMedium" color="textPrimary">{source.full}</ThemedText>
              </View>
              <Feather name="external-link" size={14} color={Colors.textTertiary} />
            </Pressable>
          ))}
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Feather name="bar-chart-2" size={18} color={Colors.accent} />
            </View>
            <ThemedText variant="headlineMedium" color="textPrimary">
              Niveaux d'analyse
            </ThemedText>
          </View>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Chaque produit scanné reçoit l'un des trois niveaux d'analyse suivants :
          </ThemedText>
          {VERDICT_LEVELS.map((level) => (
            <View key={level.label} style={[styles.verdictRow, { backgroundColor: level.bg }]}>
              <View style={[styles.verdictDot, { backgroundColor: level.color }]} />
              <View style={styles.verdictContent}>
                <ThemedText variant="labelLarge" style={{ color: level.color }}>
                  {level.label}
                </ThemedText>
                <ThemedText variant="bodySmall" color="textSecondary">
                  {level.description}
                </ThemedText>
              </View>
            </View>
          ))}
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Feather name="calendar" size={18} color={Colors.accent} />
            </View>
            <ThemedText variant="headlineMedium" color="textPrimary">
              Adaptation par trimestre
            </ThemedText>
          </View>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Certains ingrédients peuvent avoir des recommandations différentes selon le trimestre de grossesse. Hēlo prend en compte ton avancement pour affiner ses évaluations lorsque les données scientifiques le permettent.
          </ThemedText>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Feather name="alert-circle" size={18} color={Colors.accent} />
            </View>
            <ThemedText variant="headlineMedium" color="textPrimary">
              Ce que Hēlo ne fait pas
            </ThemedText>
          </View>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Hēlo n'est pas un dispositif médical et ne fournit pas de diagnostic. L'application ne remplace en aucun cas l'avis de ton médecin, sage-femme ou pharmacien. Les analyses sont basées sur les données disponibles (CRAT, ANSM, EFSA, SCCS) et peuvent ne pas couvrir toutes les situations individuelles.
          </ThemedText>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Feather name="refresh-cw" size={18} color={Colors.accent} />
            </View>
            <ThemedText variant="headlineMedium" color="textPrimary">
              Mise à jour continue
            </ThemedText>
          </View>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Notre base de données est régulièrement mise à jour pour refléter les dernières publications scientifiques et les recommandations des autorités de santé. Les analyses peuvent évoluer en fonction des nouvelles données disponibles.
          </ThemedText>
        </Card>

        <View style={styles.footer}>
          <Feather name="info" size={14} color={Colors.textTertiary} />
          <ThemedText variant="bodySmall" color="textTertiary" style={styles.footerText}>
            {METHODOLOGY_DISCLAIMER}
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paragraph: {
    lineHeight: 22,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    paddingTop: 3,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sourceBadge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    minWidth: 56,
    alignItems: 'center',
  },
  sourceInfo: {
    flex: 1,
  },
  verdictRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
  },
  verdictDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  verdictContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  footerText: {
    flex: 1,
    lineHeight: 18,
  },
});
