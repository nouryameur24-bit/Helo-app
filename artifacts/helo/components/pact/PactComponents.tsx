import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
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
import { Colors } from '@/constants/theme';
import { flameSize, PACT_BADGES, type PactBadgeId } from '@/lib/pact';
import type { CircleMember } from '@/lib/circleUtils';
import styles from './pactStyles';

export function FlameIcon({ streak, size }: { streak: number; size?: number }) {
  const fontSize = size ?? flameSize(streak);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.Text style={[{ fontSize }, pulseStyle]}>🔥</Animated.Text>
  );
}

export function SignatureUnderline({ active }: { active: boolean }) {
  const width = useSharedValue(0);

  useEffect(() => {
    if (active) {
      width.value = withTiming(220, { duration: 900, easing: Easing.out(Easing.cubic) });
    } else {
      width.value = 0;
    }
  }, [active]);

  const lineStyle = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <View style={styles.signatureRow}>
      <Animated.View style={[styles.signatureLine, lineStyle]} />
      <ThemedText style={styles.signatureText}>
        {active ? '✦ signée ✦' : ''}
      </ThemedText>
    </View>
  );
}

export function ProgressBar({ progress }: { progress: number }) {
  const pct = Math.min(1, Math.max(0, progress));
  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withTiming(pct, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [pct]);

  const barStyle = useAnimatedStyle(() => ({ flex: barWidth.value }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, barStyle]} />
    </View>
  );
}

export function WitnessChip({
  member,
  selected,
  onPress,
}: {
  member: CircleMember;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.witnessChip,
        selected && styles.witnessChipSelected,
        { opacity: pressed ? 0.8 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${selected ? 'Désélectionner' : 'Sélectionner'} ${member.first_name} comme témoin`}
      accessibilityState={{ selected }}
    >
      <View style={[styles.witnessAvatar, selected && styles.witnessAvatarSelected]}>
        <ThemedText style={styles.witnessInitial}>
          {member.first_name.charAt(0).toUpperCase()}
        </ThemedText>
      </View>
      <ThemedText
        style={selected ? [styles.witnessName, { color: Colors.accent }] : styles.witnessName}
        numberOfLines={1}
      >
        {member.first_name}
      </ThemedText>
      {selected && (
        <Feather name="check-circle" size={14} color={Colors.accent} />
      )}
    </Pressable>
  );
}

export function BadgeTile({ id, earned }: { id: PactBadgeId; earned: boolean }) {
  const badge = PACT_BADGES.find((b) => b.id === id)!;
  return (
    <View style={[styles.badgeTile, !earned && styles.badgeTileLocked]}>
      <ThemedText style={styles.badgeEmoji}>{badge.emoji}</ThemedText>
      <ThemedText style={!earned ? [styles.badgeLabel, { color: Colors.textTertiary }] : styles.badgeLabel}>
        {badge.label}
      </ThemedText>
      <ThemedText style={styles.badgeSub}>{badge.description}</ThemedText>
    </View>
  );
}
