/**
 * Lot 16-13 — Hint discret "maintiens pour les options" sur le placard.
 *
 * Pourquoi : ShelfCard supporte un long-press qui ouvre un ActionSheet
 * (supprimer, changer catégorie). Mais zéro signal visuel ne le dit —
 * l'utilisatrice ne le découvre que par accident, ou jamais.
 *
 * Cette pastille apparaît UNE SEULE FOIS, à l'arrivée sur le placard
 * (>= 1 produit présent), explique le geste, et se dismiss auto après
 * 5s. AsyncStorage flag empêche le re-show.
 */

import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { STORAGE_KEYS } from '@/lib/storageKeys';

interface LongPressHintProps {
  /** Le placard doit avoir au moins 1 produit pour que le hint soit pertinent. */
  enabled: boolean;
}

const AUTO_DISMISS_MS = 5000;

export function LongPressHint({ enabled }: LongPressHintProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEYS.shelfLongPressHintSeen)
      .then((seen) => {
        if (cancelled || seen === '1') return;
        setTimeout(() => {
          if (!cancelled) setVisible(true);
        }, 800);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setVisible(false);
      AsyncStorage.setItem(STORAGE_KEYS.shelfLongPressHintSeen, '1').catch(() => {});
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(280)}
      exiting={FadeOut.duration(220)}
      style={styles.wrap}
      pointerEvents="none"
    >
      <View style={styles.pill}>
        <Feather name="info" size={14} color={Colors.accentDark} />
        <ThemedText variant="bodySmall" style={styles.text}>
          💡 Maintiens un produit pour les options
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 120, // au-dessus de la tab bar
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
    ...Shadows.soft,
  },
  text: {
    color: Colors.accentDark,
    fontWeight: '600',
  },
});
