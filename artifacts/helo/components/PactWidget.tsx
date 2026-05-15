// ─── PactWidget — Flame widget for home screen ───────────────────────────────
//
// Affiché sur l'accueil quand un Pacte est actif.
// S'auto-charge depuis AsyncStorage.

import { router } from 'expo-router';
import { ROUTES } from '@/types/routes';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import {
  computePactDay,
  flameSize,
  loadPact,
  type PactState,
} from '@/lib/pact';

interface PactWidgetProps {
  onReload?: number;
}

export function PactWidget({ onReload }: PactWidgetProps) {
  const [pact, setPact] = useState<PactState | null>(null);
  const pulse = useSharedValue(1);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadPact().then((p) => {
      if (isMounted.current) {
        setPact(p && p.status === 'active' ? p : null);
      }
    });
    return () => { isMounted.current = false; };
  }, [onReload]);

  useEffect(() => {
    if (!pact) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [pact]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  if (!pact) return null;

  const day = computePactDay(pact);
  const streak = pact.currentStreak;
  const fontSize = flameSize(streak);

  return (
    <Pressable
      onPress={() => router.push(ROUTES.pact)}
      style={({ pressed }) => [
        styles.root,
        { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <LinearGradient
        colors={['#FFF8E8', '#FFF2CC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {/* Flame */}
        <View style={styles.flameWrap}>
          <Animated.Text style={[{ fontSize }, flameStyle]}>🔥</Animated.Text>
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Mon Pacte</ThemedText>
          <ThemedText style={styles.dayText}>
            Jour {day}/{pact.duration} · Série de {streak} jour{streak > 1 ? 's' : ''}
          </ThemedText>
          {/* Mini progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, (day / pact.duration) * 100)}%` },
              ]}
            />
          </View>
        </View>

        <Feather name="chevron-right" size={16} color={Colors.accent} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.accentLight + 'BB',
    ...Shadows.soft,
  },

  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },

  flameWrap: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: Colors.accentDark,
    letterSpacing: 0.1,
  },

  dayText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.xs,
  },

  progressTrack: {
    height: 4,
    backgroundColor: Colors.accentLight + '55',
    borderRadius: 2,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
});
