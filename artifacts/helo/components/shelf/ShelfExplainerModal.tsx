/**
 * Lot 15A4 — Modale explicative "Placard vs À acheter".
 *
 * Problème résolu : avant ce lot, l'onglet Placard contenait DEUX sous-vues
 * (segmented control "Mon placard" / "Ma liste") sans aucune explication
 * de leur différence. Beaucoup d'utilisatrices restaient confuses :
 *   - "C'est quoi 'Ma liste' ? Une wishlist ? Un panier de courses ?"
 *   - "Pourquoi y a deux endroits ? Quelle est la différence ?"
 *   - "Si je scanne un produit, ça va dans lequel ?"
 *
 * Cette modale s'affiche UNE SEULE FOIS, au premier visit de l'onglet
 * Placard, pour poser clairement le mental model :
 *   📦 Mon placard = les produits que tu AS DÉJÀ.
 *   🛒 À acheter   = les produits que tu VEUX ACHETER.
 *
 * Persisté via `STORAGE_KEYS.shelfExplainerSeen`.
 */

import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

interface ShelfExplainerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ShelfExplainerModal({ visible, onClose }: ShelfExplainerModalProps) {
  useEffect(() => {
    if (visible) {
      Haptics.selectionAsync().catch(() => {});
    }
  }, [visible]);

  const handleGotIt = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(160)}
        style={styles.backdrop}
      >
        <Animated.View
          entering={ZoomIn.duration(380).springify().damping(14)}
          style={styles.card}
        >
          {/* Header */}
          <View style={styles.header}>
            <ThemedText variant="headlineMedium" color="textPrimary" style={{ textAlign: 'center' }}>
              Ton placard, en deux vues
            </ThemedText>
            <ThemedText
              variant="bodyMedium"
              color="textSecondary"
              style={{ textAlign: 'center', marginTop: Spacing.xs }}
            >
              Pour ne plus jamais mélanger "j'ai" et "je veux".
            </ThemedText>
          </View>

          {/* Two cards: Placard + Liste */}
          <Animated.View entering={FadeInDown.delay(140).duration(380)} style={styles.row}>
            <View style={styles.emoji}>
              <ThemedText style={styles.emojiText}>📦</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="labelLarge" color="textPrimary">
                Mon placard
              </ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 2 }}>
                Les produits que tu AS déjà chez toi.{"\n"}
                Tout ce que tu scannes y atterrit automatiquement.
              </ThemedText>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).duration(380)} style={styles.row}>
            <View style={[styles.emoji, { backgroundColor: '#FDE8E0' }]}>
              <ThemedText style={styles.emojiText}>🛒</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="labelLarge" color="textPrimary">
                À acheter
              </ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 2 }}>
                Les produits que tu VEUX acheter.{"\n"}
                Ta liste de courses qui te suit en magasin.
              </ThemedText>
            </View>
          </Animated.View>

          {/* CTA */}
          <Animated.View entering={FadeInDown.delay(340).duration(380)}>
            <Pressable
              onPress={handleGotIt}
              accessibilityRole="button"
              accessibilityLabel="J'ai compris"
              style={({ pressed }) => [
                styles.cta,
                { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <ThemedText style={styles.ctaText}>J'ai compris</ThemedText>
              <Feather name="check" size={18} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 18, 16, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...Shadows.soft,
  },
  header: {
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  emoji: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 26,
    lineHeight: 30,
  },
  cta: {
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accentDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.soft,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
