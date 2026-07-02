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
import { Colors, Spacing } from '@/constants/theme';

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

export default function TermsScreen() {
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
          Mentions légales
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

        <Section title="1. Objet de l'application">
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Hēlo est une application mobile d'information destinée aux femmes enceintes. Elle permet d'analyser la composition de produits alimentaires et cosmétiques afin de fournir une évaluation indicative de leur compatibilité avec la grossesse.
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Hēlo n'est pas un dispositif médical au sens de la réglementation européenne (Règlement (UE) 2017/745). Les informations fournies ne constituent en aucun cas un avis médical, un diagnostic ou une prescription. Elles ne se substituent pas à la consultation d'un professionnel de santé qualifié.
          </ThemedText>
        </Section>

        <Section title="2. Limitation de responsabilité">
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            L'éditeur de Hēlo s'efforce de fournir des informations fiables et à jour, basées sur des sources scientifiques reconnues. Toutefois, il ne saurait garantir l'exhaustivité, l'exactitude ou l'actualité des données présentées.
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            L'utilisation de l'application et l'interprétation des résultats relèvent de la seule responsabilité de l'utilisatrice. L'éditeur décline toute responsabilité en cas de dommage direct ou indirect résultant de l'utilisation des informations fournies par l'application.
          </ThemedText>
        </Section>

        <Section title="3. Propriété intellectuelle">
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            L'ensemble des contenus de l'application Hēlo (textes, graphismes, logos, icônes, images, base de données, algorithmes) est protégé par le droit de la propriété intellectuelle. Toute reproduction, représentation ou exploitation, même partielle, est interdite sans autorisation préalable écrite de l'éditeur.
          </ThemedText>
        </Section>

        <Section title="4. Protection des données personnelles">
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Hēlo collecte et traite des données personnelles dans le respect du Règlement Général sur la Protection des Données (RGPD) et de la loi Informatique et Libertés. Pour plus de détails, consulte notre Politique de confidentialité.
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Les données collectées sont nécessaires au fonctionnement du service et ne sont jamais vendues à des tiers. Tu disposes d'un droit d'accès, de rectification, de suppression et de portabilité de tes données.
          </ThemedText>
        </Section>

        <Section title="5. Abonnement premium">
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Hēlo propose un abonnement premium offrant des fonctionnalités étendues. L'abonnement est géré via les plateformes Apple App Store et Google Play Store, selon leurs conditions respectives.
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Le renouvellement est automatique sauf résiliation par l'utilisatrice au moins 24 heures avant la fin de la période en cours, depuis les paramètres de son compte App Store ou Google Play.
          </ThemedText>
        </Section>

        <Section title="6. Droit de rétractation">
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne s'applique pas aux contenus numériques fournis sur un support immatériel dont l'exécution a commencé avec l'accord du consommateur.
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
            Pour les abonnements, tu peux annuler à tout moment depuis les paramètres de ton store (App Store ou Google Play). L'accès premium reste actif jusqu'à la fin de la période déjà payée.
          </ThemedText>
        </Section>

        <ThemedText variant="bodySmall" color="textTertiary" style={styles.footer}>
          Pour toute question relative aux présentes mentions légales, tu peux nous contacter à l'adresse : contact@helo-app.fr
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
  footer: {
    textAlign: 'center',
    paddingVertical: Spacing.xl,
    lineHeight: 18,
  },
});
