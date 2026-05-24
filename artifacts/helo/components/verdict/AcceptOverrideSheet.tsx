/**
 * AcceptOverrideSheet — UI pour "J'achète quand même" + révocation.
 *
 * v4 Lot 12. À intégrer dans `app/verdict/[scanId].tsx` après le verdict
 * card principal pour les verdicts `caution` / `danger`.
 *
 * 2 composants exportés :
 *
 *   1. <OverrideBanner barcode={...} /> — affiché en haut du verdict quand
 *      un override existe déjà (ex: "Vous avez accepté ce produit le 12
 *      mai" + bouton "Révoquer").
 *
 *   2. <AcceptOverrideButton barcode={...} verdict={...} /> — affiché
 *      en bas du verdict caution/danger pour permettre l'override.
 *      Bottom sheet de confirmation avec choix de la raison.
 *
 * Intégration suggérée dans verdict/[scanId].tsx :
 *
 *   ```tsx
 *   import { OverrideBanner, AcceptOverrideButton } from '@/components/verdict/AcceptOverrideSheet';
 *
 *   // ... après le ScoreCircle :
 *   <OverrideBanner barcode={barcode} />
 *
 *   // ... avant le bottom bar :
 *   {verdict !== 'safe' && (
 *     <AcceptOverrideButton barcode={barcode} verdict={verdict} />
 *   )}
 *   ```
 */
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { clearOverride, getOverride, setOverride, type UserOverride } from '@/lib/userOverrides';

// ─── OverrideBanner ─────────────────────────────────────────────────────────

export function OverrideBanner({ barcode }: { barcode: string }) {
  const [override, setOverrideState] = useState<UserOverride | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOverride(barcode)
      .then((o) => {
        if (!cancelled) setOverrideState(o);
      })
      .catch(() => {
        if (!cancelled) setOverrideState(null);
      });
    return () => {
      cancelled = true;
    };
  }, [barcode]);

  if (!override) return null;

  const date = new Date(override.accepted_at);
  const dateStr = isNaN(date.getTime())
    ? '?'
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

  const handleRevoke = () => {
    Alert.alert(
      'Révoquer votre décision',
      'Voulez-vous annuler votre choix précédent ? Les futurs scans afficheront le verdict normal.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Révoquer',
          style: 'destructive',
          onPress: async () => {
            await clearOverride(barcode);
            setOverrideState(null);
          },
        },
      ],
    );
  };

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.banner}>
      <Feather name="check-circle" size={16} color={Colors.accent} />
      <ThemedText
        variant="bodySmall"
        style={{ flex: 1, marginLeft: 8, color: Colors.textPrimary }}
      >
        Vous avez accepté ce produit le {dateStr}.
      </ThemedText>
      <TouchableOpacity onPress={handleRevoke} style={styles.revokeBtn} activeOpacity={0.7}>
        <ThemedText variant="bodySmall" style={{ color: Colors.accent }}>
          Révoquer
        </ThemedText>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── AcceptOverrideButton + Sheet ───────────────────────────────────────────

const REASONS: { value: UserOverride['reason']; label: string; subtitle: string }[] = [
  {
    value: 'doctor_ok',
    label: '✓ Mon médecin a validé',
    subtitle: 'Avis professionnel personnel',
  },
  {
    value: 'low_dose',
    label: '💧 Consommation occasionnelle',
    subtitle: 'Dose / fréquence acceptable',
  },
  {
    value: 'occasional',
    label: '🍽 Petite quantité',
    subtitle: "Je n'en consomme pas tous les jours",
  },
  {
    value: 'other',
    label: '⋯ Autre raison',
    subtitle: 'Je décide en pleine conscience',
  },
];

export function AcceptOverrideButton({
  barcode,
  verdict,
  onAccepted,
}: {
  barcode: string;
  verdict: 'caution' | 'danger';
  onAccepted?: () => void;
}) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [alreadyOverridden, setAlreadyOverridden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getOverride(barcode).then((o) => {
      if (!cancelled) setAlreadyOverridden(!!o);
    });
    return () => {
      cancelled = true;
    };
  }, [barcode]);

  // Si déjà accepté, on n'affiche pas le bouton (le banner suffit)
  if (alreadyOverridden) return null;

  const handleAccept = async (reason: UserOverride['reason']) => {
    setSheetVisible(false);
    await setOverride(barcode, reason);
    setAlreadyOverridden(true);
    onAccepted?.();
  };

  const buttonLabel = verdict === 'danger' ? "J'achète quand même" : "J'accepte ce produit";

  return (
    <>
      <Pressable
        onPress={() => setSheetVisible(true)}
        style={({ pressed }) => [styles.acceptBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <ThemedText variant="bodySmall" style={{ color: Colors.textSecondary, textDecorationLine: 'underline' }}>
          {buttonLabel}
        </ThemedText>
      </Pressable>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSheetVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSheetVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ThemedText variant="headlineMedium" style={styles.sheetTitle}>
            Pourquoi acceptez-vous ce produit ?
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary" style={styles.sheetSubtitle}>
            Votre choix sera mémorisé pour ne plus vous re-prévenir sur ce produit.
            Vous pourrez le révoquer à tout moment.
          </ThemedText>

          {REASONS.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={styles.reasonRow}
              onPress={() => handleAccept(r.value)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <ThemedText variant="labelLarge" color="textPrimary">
                  {r.label}
                </ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
                  {r.subtitle}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.cancelRow}
            onPress={() => setSheetVisible(false)}
            activeOpacity={0.7}
          >
            <ThemedText variant="bodyMedium" color="textSecondary">
              Annuler
            </ThemedText>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  revokeBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  acceptBtn: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 41, 38, 0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.huge,
    ...Shadows.elevated,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  sheetTitle: {
    marginBottom: Spacing.sm,
  },
  sheetSubtitle: {
    marginBottom: Spacing.xl,
    lineHeight: 18,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  cancelRow: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
});
