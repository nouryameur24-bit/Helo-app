import { router } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';

export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { paddingTop: topPad + Spacing.md, paddingBottom: bottomPad + Spacing.lg }]}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Feather name="user" size={32} color={Colors.accent} />
        </View>

        <ThemedText variant="headlineMedium" style={styles.title}>
          Mon profil
        </ThemedText>

        <ThemedText variant="bodyLarge" color="textSecondary" style={styles.body}>
          Fonctionnalité bientôt disponible — soyez la première informée !
        </ThemedText>

        <ThemedText variant="bodyMedium" color="textTertiary" style={styles.subBody}>
          Vous pourrez bientôt modifier vos informations, votre date prévue d&apos;accouchement et vos préférences directement ici.
        </ThemedText>
      </View>

      <View style={styles.footer}>
        <Button variant="primary" fullWidth onPress={() => router.back()}>
          Retour
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  subBody: {
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  footer: {
    paddingTop: Spacing.md,
  },
});
