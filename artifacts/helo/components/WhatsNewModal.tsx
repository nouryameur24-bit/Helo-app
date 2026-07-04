/**
 * Lot 16-11 — Modal "Quoi de neuf" affichée après chaque update d'app.
 *
 * Pourquoi : sans cette modale, les users qui mettent à jour ne voient
 * jamais les nouveautés. Sentiment "rien n'a changé" → désengagement.
 *
 * Trigger : depuis app/_layout.tsx au cold start. Compare CURRENT_VERSION
 * vs AsyncStorage `lastSeenVersion`. Si delta (ou first ever), monte le
 * modal puis persiste la nouvelle version comme "vue".
 *
 * UX : célébratif (haptic Success + animation entrante), pas une dialog
 * système austère. Une seule action ("J'ai compris") qui ferme + persiste.
 */

import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ui/ThemedText';
import type { WhatsNewEntry } from '@/constants/whatsNew';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

interface WhatsNewModalProps {
  visible: boolean;
  entry: WhatsNewEntry | null;
  onClose: () => void;
}

export function WhatsNewModal({ visible, entry, onClose }: WhatsNewModalProps) {
  useEffect(() => {
    if (visible && entry) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [visible, entry]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onClose();
  };

  if (!entry) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(160)}
        style={styles.backdrop}
      >
        <Animated.View
          entering={ZoomIn.duration(380).springify().damping(14)}
          style={styles.card}
        >
          {/* Hero gradient */}
          <LinearGradient
            colors={[Colors.accentLight, Colors.surface]}
            style={styles.heroBg}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <Animated.View entering={ZoomIn.delay(120).duration(420)}>
              <ThemedText style={styles.heroEmoji}>✨</ThemedText>
            </Animated.View>
            <ThemedText variant="labelSmall" style={styles.versionBadge}>
              VERSION {entry.version}
            </ThemedText>
            <ThemedText variant="headlineLarge" color="textPrimary" style={styles.heroTitle}>
              {entry.title}
            </ThemedText>
          </LinearGradient>

          {/* Bullets */}
          <ScrollView style={styles.scroll} contentContainerStyle={styles.bullets}>
            {entry.bullets.map((bullet, index) => (
              <Animated.View
                key={`${entry.version}-${index}`}
                entering={FadeInDown.delay(200 + index * 80).duration(380)}
                style={styles.bulletRow}
              >
                <ThemedText variant="bodyMedium" color="textPrimary" style={styles.bulletText}>
                  {bullet}
                </ThemedText>
              </Animated.View>
            ))}
          </ScrollView>

          {/* CTA */}
          <Animated.View
            entering={FadeInDown.delay(500).duration(360)}
            style={styles.ctaWrap}
          >
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="J'ai compris, fermer"
              style={({ pressed }) => [
                styles.cta,
                { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <ThemedText style={styles.ctaText}>Découvrir</ThemedText>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
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
    overflow: 'hidden',
    maxHeight: '85%',
    ...Shadows.soft,
  },
  heroBg: {
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  heroEmoji: {
    fontSize: 56,
    lineHeight: 64,
  },
  versionBadge: {
    color: Colors.accentDark,
    letterSpacing: 1.5,
    marginTop: Spacing.sm,
  },
  heroTitle: {
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  scroll: {
    flexShrink: 1,
  },
  bullets: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  bulletRow: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  bulletText: {
    lineHeight: 22,
  },
  ctaWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  cta: {
    height: 54,
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
