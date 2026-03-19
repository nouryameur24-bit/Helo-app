import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface NotificationPermissionScreenProps {
  visible: boolean;
  onAllow: () => void;
  onSkip: () => void;
}

export function NotificationPermissionScreen({
  visible,
  onAllow,
  onSkip,
}: NotificationPermissionScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <View style={[styles.inner, { paddingTop: topPadding + Spacing.xxl, paddingBottom: bottomPadding + Spacing.xxl }]}>
          <LinearGradient
            colors={[Colors.accentLight, Colors.accent]}
            style={styles.iconCircle}
          >
            <Feather name="bell" size={40} color="#fff" />
          </LinearGradient>

          <ThemedText variant="headlineLarge" color="textPrimary" style={styles.title}>
            Restez informée{'\n'}tout au long de votre grossesse
          </ThemedText>

          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.subtitle}>
            Autorisez Hēlo à vous envoyer des notifications pour ne manquer aucun moment important.
          </ThemedText>

          <View style={styles.features}>
            {[
              { icon: 'calendar' as const, text: 'Récapitulatif hebdomadaire de votre grossesse' },
              { icon: 'star' as const, text: 'Jalons de trimestre et changements importants' },
              { icon: 'package' as const, text: 'Alertes si un produit change de classification' },
              { icon: 'clock' as const, text: 'Rappels doux pour scanner vos produits' },
            ].map((item, idx) => (
              <View key={idx} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Feather name={item.icon} size={16} color={Colors.accent} />
                </View>
                <ThemedText variant="bodyMedium" color="textPrimary" style={styles.featureText}>
                  {item.text}
                </ThemedText>
              </View>
            ))}
          </View>

          <ThemedText variant="bodySmall" color="textTertiary" style={styles.note}>
            Vous pouvez modifier vos préférences à tout moment dans Profil {'>'} Notifications.
          </ThemedText>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: Colors.accent, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={onAllow}
            >
              <ThemedText variant="labelLarge" color="textPrimary" style={{ color: '#fff' }}>
                Autoriser les notifications
              </ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.7 : 1 }]}
              onPress={onSkip}
            >
              <ThemedText variant="bodyMedium" color="textTertiary">
                Pas maintenant
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    lineHeight: 32,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    marginTop: 6,
  },
  note: {
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
  primaryButton: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
});
