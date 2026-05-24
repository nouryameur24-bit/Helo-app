/**
 * Lot 15A3 — BottomSheet listant les modes de scan secondaires.
 *
 * Avant : 5 chips alignés en bas de l'écran scan (Code-barres / Ingrédients /
 * Menu / Ordonnance / Photo). Pour un nouveau user, surcharge cognitive :
 * "Quand utiliser quoi ? Quels sont gratuits ?". Tous présentés au même
 * niveau hiérarchique alors que 95 % des scans = code-barres.
 *
 * Après : "Code-barres" reste primary (gros chip), et un seul bouton
 * "Plus d'options ▼" ouvre cette sheet qui :
 *   • décrit clairement chaque mode en 1 phrase
 *   • signale les modes Premium par un badge ✦
 *   • aide la nouvelle user à comprendre l'intention de chaque mode
 *
 * UX : tap sur une option → ferme la sheet + déclenche le onSelect (le
 * parent met à jour scanMode et lance le flow correspondant).
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
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

export type ScanModeOption = 'ingredients' | 'menu' | 'prescription' | 'photo';

interface ModeDescriptor {
  id: ScanModeOption;
  icon: keyof typeof Feather.glyphMap;
  emoji?: string;
  label: string;
  description: string;
  premium: boolean;
}

const MODES: ModeDescriptor[] = [
  {
    id: 'ingredients',
    icon: 'file-text',
    label: 'Ingrédients',
    description: "Photographie la liste d'ingrédients quand le code-barres n'est pas reconnu.",
    premium: false,
  },
  {
    id: 'menu',
    icon: 'book-open',
    emoji: '🍽',
    label: 'Menu de restaurant',
    description: "Photographie le menu, l'IA analysera chaque plat pour toi.",
    premium: false,
  },
  {
    id: 'prescription',
    icon: 'package',
    emoji: '💊',
    label: 'Ordonnance',
    description: 'Scanne ta prescription pour identifier les médicaments.',
    premium: false,
  },
  {
    id: 'photo',
    icon: 'camera',
    emoji: '📷',
    label: 'Photo de produit',
    description: "Identifie visuellement un produit sans étiquette ni code-barres.",
    premium: true,
  },
];

interface MoreScanModesSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (mode: ScanModeOption) => void;
  /** Used to mark the currently active mode (if any) with a checkmark */
  currentMode?: ScanModeOption | null;
}

export function MoreScanModesSheet({
  visible,
  onClose,
  onSelect,
  currentMode,
}: MoreScanModesSheetProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Haptics.selectionAsync().catch(() => {});
    }
  }, [visible]);

  const handlePick = (mode: ScanModeOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelect(mode);
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
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(140)}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropTouch} onPress={onClose} />

        <Animated.View
          entering={SlideInDown.duration(280).springify().damping(18)}
          exiting={SlideOutDown.duration(220)}
          style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <ThemedText variant="headlineMedium" color="textPrimary">
              Autres modes de scan
            </ThemedText>
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 4 }}>
              Quand le code-barres ne suffit pas.
            </ThemedText>
          </View>

          {/* Modes list */}
          <View style={styles.list}>
            {MODES.map((m) => {
              const isActive = currentMode === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => handlePick(m.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.label} — ${m.description}${m.premium ? ' (Premium)' : ''}`}
                  style={({ pressed }) => [
                    styles.row,
                    isActive && styles.rowActive,
                    { opacity: pressed ? 0.92 : 1 },
                  ]}
                >
                  <View style={[styles.rowIcon, isActive && styles.rowIconActive]}>
                    {m.emoji ? (
                      <ThemedText style={styles.rowEmoji}>{m.emoji}</ThemedText>
                    ) : (
                      <Feather name={m.icon} size={20} color={isActive ? '#FFFFFF' : Colors.accentDark} />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.rowTitleLine}>
                      <ThemedText variant="labelLarge" color="textPrimary">
                        {m.label}
                      </ThemedText>
                      {m.premium && (
                        <View style={styles.premiumBadge}>
                          <Feather name="star" size={9} color={Colors.accentDark} />
                          <ThemedText style={styles.premiumBadgeText}>PREMIUM</ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
                      {m.description}
                    </ThemedText>
                  </View>

                  {isActive ? (
                    <Feather name="check" size={20} color={Colors.accentDark} />
                  ) : (
                    <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Footer link back to barcode */}
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            style={styles.dismissBtn}
          >
            <ThemedText variant="bodyMedium" color="textTertiary" style={{ textAlign: 'center' }}>
              Annuler
            </ThemedText>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 18, 16, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    ...Shadows.soft,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary + '55',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  list: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowActive: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent + '55',
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconActive: {
    backgroundColor: Colors.accentDark,
  },
  rowEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accent + '33',
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.accentDark,
    letterSpacing: 0.5,
  },
  dismissBtn: {
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
});
