import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const REPORT_TYPES = [
  { key: 'wrong_ingredient', label: 'Ingrédient mal classé' },
  { key: 'wrong_product',    label: 'Produit mal identifié' },
  { key: 'other',            label: 'Autre' },
] as const;

type ReportType = typeof REPORT_TYPES[number]['key'];

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  scanId: string;
  productName: string;
}

export function ReportBottomSheet({ visible, onClose, userId, scanId, productName }: Props) {
  const [selected, setSelected] = useState<ReportType>('wrong_ingredient');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const translateY = useSharedValue(400);
  const opacity = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setDone(false);
      setSelected('wrong_ingredient');
      setDetails('');
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(400, { duration: 220 });
    }
  }, [visible, opacity, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      if (isSupabaseConfigured) {
        await supabase.from('ingredient_reports').insert({
          user_id: userId ?? null,
          scan_id: scanId,
          product_name: productName,
          report_type: selected,
          details: details.trim() || null,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
      setTimeout(() => {
        onClose();
      }, 2200);
    } catch {
      // Non-critical — close anyway
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, sheetStyle]}>
          {/* Handle */}
          <View style={styles.handle} />

          {done ? (
            <View style={styles.successWrap}>
              <Feather name="heart" size={36} color={Colors.accent} />
              <ThemedText variant="headlineMedium" style={styles.successTitle}>
                Merci pour votre vigilance 💛
              </ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary" style={styles.successSub}>
                Votre signalement nous aide à améliorer la base de données.
              </ThemedText>
            </View>
          ) : (
            <>
              {/* Header */}
              <View style={styles.header}>
                <ThemedText variant="headlineMedium" color="textPrimary">
                  Signaler une erreur
                </ThemedText>
                <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fermer">
                  <Feather name="x" size={20} color={Colors.textTertiary} />
                </Pressable>
              </View>

              {productName ? (
                <ThemedText variant="bodySmall" color="textTertiary" style={styles.productLabel}>
                  {productName}
                </ThemedText>
              ) : null}

              {/* Radio options */}
              <View style={styles.radioGroup}>
                {REPORT_TYPES.map((rt) => (
                  <Pressable
                    key={rt.key}
                    style={[styles.radioRow, selected === rt.key && styles.radioRowActive]}
                    onPress={() => setSelected(rt.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected === rt.key }}
                    accessibilityLabel={rt.label}
                  >
                    <View style={[styles.radioDot, selected === rt.key && styles.radioDotActive]}>
                      {selected === rt.key && <View style={styles.radioDotInner} />}
                    </View>
                    <ThemedText
                      variant="bodyMedium"
                      color={selected === rt.key ? 'textPrimary' : 'textSecondary'}
                    >
                      {rt.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              {/* Optional details */}
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                placeholder="Détails (optionnel)"
                placeholderTextColor={Colors.textTertiary}
                value={details}
                onChangeText={setDetails}
                multiline
                numberOfLines={3}
                returnKeyType="done"
                blurOnSubmit
              />

              {/* Submit */}
              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  { opacity: pressed || submitting ? 0.75 : 1 },
                ]}
                onPress={handleSubmit}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Envoyer le signalement"
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText variant="labelLarge" style={styles.submitText}>
                    Envoyer
                  </ThemedText>
                )}
              </Pressable>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.massive,
    paddingTop: Spacing.sm,
    ...Shadows.elevated,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  productLabel: {
    marginBottom: Spacing.xl,
  },
  radioGroup: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  radioRowActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotActive: {
    borderColor: Colors.accent,
  },
  radioDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.bodyMedium.fontSize,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textPrimary,
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: Spacing.xl,
  },
  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#fff',
  },
  successWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.massive,
    gap: Spacing.lg,
  },
  successTitle: {
    textAlign: 'center',
  },
  successSub: {
    textAlign: 'center',
    maxWidth: 260,
  },
});
