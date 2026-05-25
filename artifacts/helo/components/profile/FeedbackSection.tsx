/**
 * Lot 16-03 — Section Feedback dans le Profil.
 *
 * Pourquoi : pour une beta, il est CRITIQUE de recueillir facilement les
 * retours utilisateurs. Sans bouton de feedback visible, les mamans qui
 * trouvent un bug ou une amélioration n'auront pas le réflexe de chercher
 * un mail caché — elles arrêteront simplement d'utiliser l'app.
 *
 * 3 options regroupées :
 *   • Signaler un bug (mailto: avec sujet pré-rempli)
 *   • Suggérer une amélioration (mailto: distinct pour trier les emails)
 *   • Noter sur App Store (StoreReview natif iOS ≥10.3)
 *
 * Mailto: privilégié sur form distant pour la beta : zéro infra à mettre
 * en place, format brut suffit, on triera côté humain.
 */

import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';

const FEEDBACK_EMAIL = 'feedback@gethelo.app';

interface FeedbackRowProps {
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  description: string;
  onPress: () => void;
}

function FeedbackRow({ icon, iconBg, iconColor, label, description, onPress }: FeedbackRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} — ${description}`}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText variant="labelLarge" color="textPrimary">
          {label}
        </ThemedText>
        <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
          {description}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
    </Pressable>
  );
}

export function FeedbackSection() {
  const handleBugReport = async () => {
    Haptics.selectionAsync().catch(() => {});
    track('feedback_bug_tapped').catch(() => {});
    const subject = encodeURIComponent('[Bug] Hēlo');
    const body = encodeURIComponent(
      `Décris le bug rencontré :\n\n\n---\nVersion : v1.0 beta\nPlateforme : ${Platform.OS}`,
    );
    const url = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Impossible d\'ouvrir l\'app mail',
          `Écris-nous directement à ${FEEDBACK_EMAIL}`,
        );
      }
    } catch {
      Alert.alert('Erreur', `Écris-nous à ${FEEDBACK_EMAIL}`);
    }
  };

  const handleSuggestion = async () => {
    Haptics.selectionAsync().catch(() => {});
    track('feedback_suggestion_tapped').catch(() => {});
    const subject = encodeURIComponent('[Idée] Hēlo');
    const body = encodeURIComponent(
      `Partage ton idée pour améliorer Hēlo :\n\n\n---\nVersion : v1.0 beta`,
    );
    const url = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Impossible d\'ouvrir l\'app mail',
          `Écris-nous à ${FEEDBACK_EMAIL}`,
        );
      }
    } catch {
      Alert.alert('Erreur', `Écris-nous à ${FEEDBACK_EMAIL}`);
    }
  };

  const handleRate = async () => {
    Haptics.selectionAsync().catch(() => {});
    track('feedback_rate_tapped').catch(() => {});
    // En beta : pas encore d'App Store ID. On affiche un message d'attente.
    // Post-launch : remplacer par Linking vers l'App Store URL
    // (`itms-apps://itunes.apple.com/app/idXXXXXX?action=write-review`).
    Alert.alert(
      'Merci 💛',
      "Hēlo n'est pas encore sur l'App Store. Tu pourras laisser un avis dès la sortie publique. En attendant, envoie-nous tes retours par mail !",
    );
  };

  return (
    <Animated.View entering={FadeInDown.delay(120).duration(380)} style={styles.section}>
      <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
        AIDE & FEEDBACK
      </ThemedText>

      <View style={styles.card}>
        <FeedbackRow
          icon="alert-circle"
          iconBg={Colors.dangerBg}
          iconColor={Colors.danger}
          label="Signaler un bug"
          description="Quelque chose ne fonctionne pas comme prévu ?"
          onPress={handleBugReport}
        />
        <View style={styles.separator} />
        <FeedbackRow
          icon="zap"
          iconBg={Colors.cautionLight}
          iconColor={Colors.caution}
          label="Suggérer une amélioration"
          description="Une idée pour rendre Hēlo encore mieux ?"
          onPress={handleSuggestion}
        />
        <View style={styles.separator} />
        <FeedbackRow
          icon="star"
          iconBg={Colors.accentLight}
          iconColor={Colors.accentDark}
          label="Noter Hēlo"
          description="Tu apprécies l'app ? Laisse-nous un avis"
          onPress={handleRate}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  sectionLabel: {
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight ?? 'rgba(0,0,0,0.08)',
    marginLeft: Spacing.lg + 36 + Spacing.md,
  },
});
