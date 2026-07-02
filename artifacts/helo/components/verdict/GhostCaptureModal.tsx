import React, { useEffect } from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

interface GhostCaptureModalProps {
  visible: boolean;
  barcode: string;
  onPhotograph: () => void;
  onDismiss: () => void;
  /**
   * Task #110 — Si le backend connaît le produit (OBF/OFF) mais pas sa
   * composition, on affiche le nom/marque/photo + un message dédié au lieu du
   * generic "produit inconnu". L'utilisatrice voit qu'on a fait notre part et
   * sait précisément ce qui manque (les ingrédients).
   */
  partialInfo?: {
    name: string | null;
    brand: string | null;
    imageUrl: string | null;
  } | null;
}

export function GhostCaptureModal({
  visible,
  barcode: _barcode,
  onPhotograph,
  onDismiss,
  partialInfo,
}: GhostCaptureModalProps) {
  const hasPartial = Boolean(partialInfo && (partialInfo.name || partialInfo.brand));
  const translateY = useSharedValue(400);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 220 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 160 });
    } else {
      opacity.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(400, { duration: 200 });
    }
  }, [visible, opacity, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Icon ou Image produit */}
        <View style={styles.iconWrap}>
          {hasPartial && partialInfo?.imageUrl ? (
            <Image
              source={{ uri: partialInfo.imageUrl }}
              style={styles.productImage}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.iconCircle}>
              <ThemedText style={styles.iconEmoji}>📸</ThemedText>
            </View>
          )}
        </View>

        {/* Title */}
        <ThemedText variant="headlineMedium" style={styles.title}>
          {hasPartial ? 'Composition manquante' : 'Aidez-nous à vérifier ce produit'}
        </ThemedText>

        {/* Subtitle */}
        {hasPartial ? (
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.subtitle}>
            On a trouvé{' '}
            <ThemedText variant="bodyMedium" style={styles.accentText}>
              {partialInfo?.name ?? 'ton produit'}
              {partialInfo?.brand ? ` (${partialInfo.brand})` : ''}
            </ThemedText>
            {'\n'}mais sa composition n'est pas encore connue.{'\n\n'}
            Photographie les ingrédients et on l'analyse pour toi{' '}
            <ThemedText variant="bodyMedium" style={styles.accentText}>et toute la communauté</ThemedText>
            {' '}✨
          </ThemedText>
        ) : (
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.subtitle}>
            Ce produit n'est pas encore dans notre base.{'\n'}
            Photographie la composition et nous l'analysera pour toi{' '}
            <ThemedText variant="bodyMedium" style={styles.accentText}>et toute la communauté</ThemedText>
            {' '}✨
          </ThemedText>
        )}

        {/* Info row */}
        <View style={styles.infoRow}>
          <Feather name="zap" size={14} color={Colors.accent} />
          <ThemedText variant="bodySmall" color="textTertiary" style={styles.infoText}>
            Analyse instantanée sur nos 4 962 ingrédients référencés
          </ThemedText>
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <Button
            variant="primary"
            fullWidth
            onPress={onPhotograph}
          >
            Photographier la composition
          </Button>
        </View>

        {/* Dismiss */}
        <TouchableOpacity onPress={onDismiss} style={styles.dismissRow} activeOpacity={0.6}>
          <ThemedText variant="bodySmall" color="textTertiary">
            Scanner un autre produit
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: Spacing.massive,
    paddingTop: Spacing.sm,
    alignItems: 'center',
    ...Shadows.elevated,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: Spacing.xl,
    alignSelf: 'center',
  },
  iconWrap: {
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 32,
  },
  productImage: {
    width: 96,
    height: 96,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accentLight,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  accentText: {
    color: Colors.accent,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.accentLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.xl,
  },
  infoText: {
    flex: 1,
  },
  cta: {
    marginBottom: Spacing.md,
  },
  dismissRow: {
    paddingVertical: Spacing.sm,
  },
});
