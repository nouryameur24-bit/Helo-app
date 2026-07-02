import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
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

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <Card style={styles.section}>
      <ThemedText variant="headlineMedium" color="textPrimary" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {children}
    </Card>
  );
}

function BulletPoint({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <ThemedText variant="bodyMedium" color="textSecondary" style={styles.bulletText}>
        {text}
      </ThemedText>
    </View>
  );
}

export default function PrivacyScreen() {
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
          Confidentialité
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText variant="bodySmall" color="textTertiary" style={styles.lastUpdate}>
          Dernière mise à jour : mars 2026
        </ThemedText>

        <Section title="1. Données collectées">
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Dans le cadre de l'utilisation de Hēlo, nous collectons les données suivantes :
          </ThemedText>
          <BulletPoint text="Adresse e-mail (pour la création et la gestion du compte)" />
          <BulletPoint text="Prénom (pour personnaliser l'expérience)" />
          <BulletPoint text="Date prévue d'accouchement (pour adapter les recommandations au trimestre)" />
          <BulletPoint text="Historique des scans (produits analysés et résultats)" />
        </Section>

        <Section title="2. Finalité du traitement">
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Tes données sont traitées pour les finalités suivantes :
          </ThemedText>
          <BulletPoint text="Fournir le service d'analyse de produits personnalisé" />
          <BulletPoint text="Adapter les évaluations en fonction de ton trimestre de grossesse" />
          <BulletPoint text="Conserver ton historique de scans pour consultation ultérieure" />
          <BulletPoint text="Améliorer la qualité et la pertinence du service" />
          <BulletPoint text="Communiquer avec toi concernant ton compte (si nécessaire)" />
        </Section>

        <Section title="3. Durée de conservation">
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Tes données personnelles sont conservées pendant une durée de 3 ans à compter de ton dernier accès à l'application. Au-delà de cette période, tes données sont automatiquement supprimées de nos systèmes.
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Tu peux demander la suppression anticipée de tes données à tout moment (voir section « Tes droits »).
          </ThemedText>
        </Section>

        <Section title="4. Tes droits">
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Conformément au RGPD, tu disposes des droits suivants sur tes données personnelles :
          </ThemedText>
          <BulletPoint text="Droit d'accès : obtenir une copie de tes données personnelles" />
          <BulletPoint text="Droit de rectification : corriger des données inexactes ou incomplètes" />
          <BulletPoint text="Droit de suppression : demander l'effacement de tes données" />
          <BulletPoint text="Droit à la portabilité : recevoir tes données dans un format structuré et lisible" />
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Pour exercer ces droits, contactez-nous à l'adresse : privacy@helo-app.fr
          </ThemedText>
        </Section>

        <Section title="5. Partage des données">
          <View style={styles.highlightBox}>
            <Feather name="shield" size={18} color={Colors.safe} />
            <ThemedText variant="bodyMedium" color="textPrimary" style={styles.highlightText}>
              Nous ne vendons jamais tes données personnelles à des tiers.
            </ThemedText>
          </View>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Tes données ne sont partagées avec aucun annonceur, courtier en données ou autre tiers à des fins commerciales. Elles sont uniquement utilisées pour le fonctionnement du service Hēlo.
          </ThemedText>
        </Section>

        <Section title="6. Hébergement et sécurité">
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Tes données sont hébergées sur l'infrastructure Supabase, localisée dans l'Union européenne, garantissant le respect des normes RGPD en matière de transfert de données.
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger tes données contre tout accès non autorisé, modification, divulgation ou destruction.
          </ThemedText>
        </Section>

        <ThemedText variant="bodySmall" color="textTertiary" style={styles.footer}>
          Pour toute question relative à la protection de tes données, tu peux nous contacter à l'adresse : privacy@helo-app.fr
        </ThemedText>
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
  lastUpdate: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  paragraph: {
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingLeft: Spacing.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    lineHeight: 22,
  },
  highlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.safeLight,
    padding: Spacing.lg,
    borderRadius: Radius.md,
  },
  highlightText: {
    flex: 1,
  },
  footer: {
    textAlign: 'center',
    paddingVertical: Spacing.xl,
    lineHeight: 18,
  },
});
