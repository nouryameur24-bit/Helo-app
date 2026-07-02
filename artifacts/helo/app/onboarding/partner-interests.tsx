import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { STORAGE_KEYS } from '@/lib/storageKeys';

const PARTNER_INTERESTS = [
  { id: 'sante', label: 'Santé & nutrition', emoji: '🥗' },
  { id: 'produits', label: 'Produits sûrs', emoji: '🛁' },
  { id: 'rdv', label: 'Rendez-vous médicaux', emoji: '🏥' },
  { id: 'maison', label: 'Préparer la maison', emoji: '🏠' },
];

const PARTNER_INTERESTS_KEY = STORAGE_KEYS.partnerInterests;

export default function PartnerInterestsScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleContinue = async () => {
    await AsyncStorage.setItem(PARTNER_INTERESTS_KEY, JSON.stringify(selected));
    await AsyncStorage.setItem('onboarding_completed', 'true');
    router.replace('/(tabs)');
  };

  return (
    <View
      style={[
        styles.root,
        { paddingTop: topPadding + Spacing.huge, paddingBottom: bottomPadding + Spacing.xxl },
      ]}
    >
      {/* Lot 15B4 — Progress "Étape 3 sur 3" — dernière étape avant
          d'entrer dans l'app. Rassure : "encore un effort, c'est presque fini". */}
      <Animated.View entering={FadeInDown.delay(0).duration(400)} style={{ marginBottom: Spacing.lg }}>
        <OnboardingProgress step={3} total={3} label="Connexion partenaire" />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.header}>
        <ThemedText variant="displayMedium" color="textPrimary" style={styles.title}>
          Tes centres d'intérêt
        </ThemedText>
        <ThemedText variant="bodyLarge" color="textSecondary" style={styles.subtitle}>
          Quels sujets t'intéressent le plus ? Sélectionnes-en plusieurs, nous adapterons tes conseils.
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.chipsWrap}>
        {PARTNER_INTERESTS.map((interest) => {
          const isSelected = selected.includes(interest.id);
          return (
            <Pressable
              key={interest.id}
              onPress={() => toggle(interest.id)}
              style={[
                styles.chip,
                isSelected ? styles.chipSelected : styles.chipDefault,
              ]}
            >
              <ThemedText style={styles.chipEmoji}>{interest.emoji}</ThemedText>
              <ThemedText
                variant="labelLarge"
                style={{ color: isSelected ? Colors.accentDark : Colors.textPrimary }}
              >
                {interest.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.cta}>
        <Button variant="primary" fullWidth onPress={handleContinue}>
          {selected.length > 0 ? `Continuer (${selected.length} sélectionné${selected.length > 1 ? 's' : ''})` : 'Passer'}
        </Button>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xxxl,
  },
  header: {
    gap: Spacing.md,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 26,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 2,
  },
  chipDefault: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  chipEmoji: {
    fontSize: 18,
  },
  cta: {
    width: '100%',
  },
});
