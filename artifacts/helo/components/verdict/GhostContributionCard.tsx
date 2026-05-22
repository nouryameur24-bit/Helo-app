import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { logError } from '@/lib/logger';
import { updateGhostCaptureNameBrand } from '@/lib/productLookup';

type CardState = 'form' | 'submitting' | 'thanks' | 'dismissed';

interface GhostContributionCardProps {
  barcode: string;
  onSubmitted?: (msg: string) => void;
}

export function GhostContributionCard({ barcode, onSubmitted }: GhostContributionCardProps) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [state, setState] = useState<CardState>('form');

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedBrand = brand.trim();
    if (!trimmedName && !trimmedBrand) return;

    setState('submitting');
    try {
      const ok = await updateGhostCaptureNameBrand({
        barcode,
        name: trimmedName,
        brand: trimmedBrand,
      });
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setState('thanks');
        onSubmitted?.('Merci ✨ Tu as aidé la communauté Hēlo');
      } else {
        // Persistence failed silently — revert to form so the user can retry
        setState('form');
      }
    } catch (err) {
      logError('GhostContributionCard.submit', err, { barcode });
      setState('form');
    }
  };

  const handleDismiss = () => {
    setState('dismissed');
  };

  if (state === 'dismissed') return null;

  if (state === 'thanks') {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={styles.wrapper}>
        <Card style={styles.card} padding={Spacing.xl}>
          <View style={styles.thanksRow}>
            <Feather name="heart" size={20} color={Colors.accent} />
            <ThemedText variant="headlineMedium" style={styles.thanksTitle}>
              Merci ✨
            </ThemedText>
          </View>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.thanksText}>
            Ton contribution est enregistrée. Les prochaines mamans vont pouvoir retrouver ce produit plus facilement.
          </ThemedText>
        </Card>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.delay(1000).duration(500)} style={styles.wrapper}>
      <Card style={styles.card} padding={Spacing.xl}>
        <View style={styles.header}>
          <ThemedText style={styles.heart}>🤍</ThemedText>
          <ThemedText variant="headlineMedium" style={styles.title}>
            Merci d&apos;avoir aidé la communauté Hēlo
          </ThemedText>
        </View>
        <ThemedText variant="bodyMedium" color="textSecondary" style={styles.subtitle}>
          Ce produit est maintenant dans notre base. Si tu veux, ajoute quelques infos pour aider les prochaines mamans à le retrouver :
        </ThemedText>

        <View style={styles.fieldGroup}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nom du produit (optionnel)"
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="next"
            editable={state === 'form'}
          />
          <TextInput
            style={styles.input}
            value={brand}
            onChangeText={setBrand}
            placeholder="Marque (optionnel)"
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="done"
            editable={state === 'form'}
            onSubmitEditing={handleSubmit}
          />
        </View>

        <View style={styles.actions}>
          <Button
            variant="primary"
            fullWidth
            onPress={handleSubmit}
            loading={state === 'submitting'}
            disabled={(!name.trim() && !brand.trim()) || state === 'submitting'}
          >
            Compléter ma contribution →
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onPress={handleDismiss}
            disabled={state === 'submitting'}
          >
            Plus tard
          </Button>
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  heart: {
    fontSize: 22,
  },
  title: {
    flex: 1,
    color: Colors.textPrimary,
  },
  subtitle: {
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    height: 48,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: Typography.bodyMedium.fontSize,
    color: Colors.textPrimary,
  },
  actions: {
    gap: Spacing.sm,
  },
  thanksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  thanksTitle: {
    color: Colors.textPrimary,
  },
  thanksText: {
    lineHeight: 20,
  },
});
