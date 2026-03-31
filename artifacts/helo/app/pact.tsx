// ─── Le Pacte Hēlo ──────────────────────────────────────────────────────────
//
// Engagement social : scanner 1 produit/jour pendant N jours.
// Deux vues : création + suivi quotidien.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { useCircle } from '@/hooks/useCircle';
import type { CircleMember } from '@/lib/circleUtils';
import {
  abandonPact,
  computePactDay,
  createPact,
  flameSize,
  loadEarnedBadges,
  loadPact,
  PACT_BADGES,
  schedulePactReminder,
  type PactBadgeId,
  type PactState,
  type PactWitness,
} from '@/lib/pact';

// ─── Duration options ─────────────────────────────────────────────────────────

const DURATIONS: { days: number; label: string; sub: string }[] = [
  { days: 7, label: '7 jours', sub: 'Débutante' },
  { days: 14, label: '14 jours', sub: 'Motivée' },
  { days: 30, label: '30 jours', sub: 'Engagée' },
];

// ─── Flame component ──────────────────────────────────────────────────────────

function FlameIcon({ streak, size }: { streak: number; size?: number }) {
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

// ─── Signature animation ──────────────────────────────────────────────────────

function SignatureUnderline({ active }: { active: boolean }) {
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

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ progress }: { progress: number }) {
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

// ─── Witness chip ─────────────────────────────────────────────────────────────

function WitnessChip({
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

// ─── Badge tile ───────────────────────────────────────────────────────────────

function BadgeTile({ id, earned }: { id: PactBadgeId; earned: boolean }) {
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PactScreen() {
  const insets = useSafeAreaInsets();
  const { userId, firstName } = useProfile();
  const { members: circleMembers } = useCircle(userId, firstName || 'Toi');

  const [pact, setPact] = useState<PactState | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<PactBadgeId[]>([]);
  const [loading, setLoading] = useState(true);

  // Creation state
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [selectedWitnesses, setSelectedWitnesses] = useState<string[]>([]);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  // ── Load pact on mount ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [p, badges] = await Promise.all([loadPact(), loadEarnedBadges()]);
      setPact(p && p.status === 'active' ? p : null);
      setEarnedBadges(badges);
      setLoading(false);
    })();
  }, []);

  // ── Create pact handler ───────────────────────────────────────────────────
  const handleEngage = useCallback(async () => {
    if (signing || signed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSigning(true);

    // Build witnesses from selected circle members
    const witnesses: PactWitness[] = selectedWitnesses
      .map((id) => circleMembers.find((m) => m.user_id === id))
      .filter(Boolean)
      .map((m) => ({ id: m!.user_id, name: m!.first_name }));

    // Wait for signature animation
    await new Promise((r) => setTimeout(r, 950));
    setSigned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newPact = await createPact(selectedDuration, witnesses);
    await schedulePactReminder(newPact);

    await new Promise((r) => setTimeout(r, 600));
    setPact(newPact);
    setSigning(false);
  }, [signing, signed, selectedWitnesses, circleMembers, selectedDuration]);

  // ── Share pact link ───────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    const msg = `${firstName || 'Je'} vous invite à rejoindre son Pacte Hēlo — 30 jours de scan grossesse ! Téléchargez Hēlo 🤱`;
    try {
      const available = await Sharing.isAvailableAsync();
      if (available) {
        // On iOS, Sharing.shareAsync requires a file URI; use Share module instead
        const { Share } = await import('react-native');
        await Share.share({ message: msg });
      }
    } catch {}
  }, [firstName]);

  // ── Abandon pact ──────────────────────────────────────────────────────────
  const handleAbandon = useCallback(() => {
    Alert.alert(
      'Abandonner le pacte ?',
      'Votre série sera perdue. Vous pourrez en créer un nouveau.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Abandonner',
          style: 'destructive',
          onPress: async () => {
            await abandonPact();
            setPact(null);
            setSigned(false);
            setSigning(false);
          },
        },
      ],
    );
  }, []);

  // ── Toggle witness selection ──────────────────────────────────────────────
  const toggleWitness = useCallback((userId: string) => {
    setSelectedWitnesses((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      if (prev.length >= 3) return prev;
      return [...prev, userId];
    });
  }, []);

  if (loading) {
    return <View style={[styles.root, { backgroundColor: Colors.background }]} />;
  }

  // ── Active pact — status view ──────────────────────────────────────────────
  if (pact) {
    const day = computePactDay(pact);
    const progress = day / pact.duration;
    const streak = pact.currentStreak;

    return (
      <View style={[styles.root, { backgroundColor: Colors.background }]}>
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.sm }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
            </Pressable>
            <ThemedText variant="headlineMedium" color="textPrimary">Le Pacte Hēlo</ThemedText>
            <Pressable onPress={handleAbandon} style={{ padding: 4 }}>
              <Feather name="more-horizontal" size={20} color={Colors.textTertiary} />
            </Pressable>
          </View>

          {/* Flame + day counter */}
          <Animated.View entering={FadeInDown.delay(50).duration(500)} style={styles.flameCard}>
            <LinearGradient
              colors={['#FFF5E0', '#FFF0CC']}
              style={styles.flameGradient}
            >
              <FlameIcon streak={streak} />
              <View style={{ alignItems: 'center', marginTop: Spacing.sm }}>
                <ThemedText style={styles.dayLabel}>Jour {day} / {pact.duration}</ThemedText>
                <ThemedText style={styles.streakLabel}>
                  Série : {streak} jour{streak > 1 ? 's' : ''} consécutif{streak > 1 ? 's' : ''}
                </ThemedText>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Progress bar */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <ThemedText variant="bodySmall" color="textTertiary">Progression</ThemedText>
              <ThemedText variant="bodySmall" color="accent">{Math.round(progress * 100)}%</ThemedText>
            </View>
            <ProgressBar progress={progress} />
          </Animated.View>

          {/* Badges */}
          <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.section}>
            <ThemedText variant="labelLarge" color="textPrimary" style={styles.sectionTitle}>
              Mes récompenses
            </ThemedText>
            <View style={styles.badgesRow}>
              {PACT_BADGES.map((b) => (
                <BadgeTile
                  key={b.id}
                  id={b.id}
                  earned={earnedBadges.includes(b.id)}
                />
              ))}
            </View>
          </Animated.View>

          {/* Witnesses */}
          {pact.witnesses.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.section}>
              <ThemedText variant="labelLarge" color="textPrimary" style={styles.sectionTitle}>
                Mes témoins
              </ThemedText>
              {pact.witnesses.map((w) => (
                <View key={w.id} style={styles.witnessRow}>
                  <View style={styles.witnessAvatarSmall}>
                    <ThemedText style={styles.witnessInitialSmall}>
                      {w.name.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                  <ThemedText variant="bodyMedium" color="textPrimary">{w.name}</ThemedText>
                  <View style={styles.witnessStatusDot} />
                </View>
              ))}
            </Animated.View>
          )}

          {/* Longest streak */}
          <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.statsRow}>
            <View style={styles.statBox}>
              <ThemedText style={styles.statNumber}>{pact.longestStreak}</ThemedText>
              <ThemedText variant="bodySmall" color="textTertiary">Record de série</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <ThemedText style={styles.statNumber}>{pact.duration - day}</ThemedText>
              <ThemedText variant="bodySmall" color="textTertiary">Jours restants</ThemedText>
            </View>
          </Animated.View>

          {/* Scan CTA */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <Pressable
              onPress={() => router.push('/(tabs)/scan')}
              style={({ pressed }) => [
                styles.scanCTA,
                { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={[Colors.accent, Colors.accentDark ?? '#B8945A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.scanCTAGradient}
              >
                <Feather name="camera" size={18} color="white" />
                <ThemedText style={styles.scanCTAText}>Scanner maintenant</ThemedText>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      </View>
    );
  }

  // ── Creation view ──────────────────────────────────────────────────────────
  const members = circleMembers;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.sm }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>

        {/* Hero illustration */}
        <Animated.View entering={FadeInDown.delay(0).duration(600)} style={styles.heroSection}>
          {/* Handshake illustration — two arcs */}
          <View style={styles.handsIllustration}>
            <View style={[styles.handArc, { transform: [{ rotate: '-15deg' }], borderColor: Colors.accent }]} />
            <View style={[styles.handArc, { transform: [{ rotate: '15deg' }, { scaleX: -1 }], borderColor: Colors.accent }]} />
            <View style={styles.handCenter}>
              <ThemedText style={{ fontSize: 42 }}>🤝</ThemedText>
            </View>
          </View>

          <ThemedText style={styles.heroTitle}>Le Pacte Hēlo</ThemedText>
          <ThemedText style={styles.heroSub}>
            Engagez-vous à scanner au moins{'\n'}
            1 produit par jour pour votre bébé.
          </ThemedText>
        </Animated.View>

        {/* Duration chips */}
        <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.section}>
          <ThemedText variant="labelLarge" color="textPrimary" style={styles.sectionTitle}>
            Choisissez votre durée
          </ThemedText>
          <View style={styles.durationRow}>
            {DURATIONS.map((d) => (
              <Pressable
                key={d.days}
                onPress={() => setSelectedDuration(d.days)}
                style={({ pressed }) => [
                  styles.durationChip,
                  selectedDuration === d.days && styles.durationChipSelected,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <ThemedText
                  style={
                    selectedDuration === d.days
                      ? [styles.durationLabel, { color: 'white' as const }]
                      : styles.durationLabel
                  }
                >
                  {d.label}
                </ThemedText>
                <ThemedText
                  style={
                    selectedDuration === d.days
                      ? [styles.durationSub, { color: 'rgba(255,255,255,0.8)' as const }]
                      : styles.durationSub
                  }
                >
                  {d.sub}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Witness selection */}
        <Animated.View entering={FadeInDown.delay(130).duration(500)} style={styles.section}>
          <ThemedText variant="labelLarge" color="textPrimary" style={styles.sectionTitle}>
            Invitez vos témoins
            <ThemedText variant="bodySmall" color="textTertiary"> (jusqu'à 3)</ThemedText>
          </ThemedText>

          {members.length === 0 ? (
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: Spacing.sm }}>
              Votre Cercle est vide — ajoutez des amies pour les inviter comme témoins.
            </ThemedText>
          ) : (
            <View style={styles.witnessGrid}>
              {members.slice(0, 6).map((m) => (
                <WitnessChip
                  key={m.user_id}
                  member={m}
                  selected={selectedWitnesses.includes(m.user_id)}
                  onPress={() => toggleWitness(m.user_id)}
                />
              ))}
            </View>
          )}

          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.linkShareBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="share-2" size={14} color={Colors.accent} />
            <ThemedText style={styles.linkShareText}>Partager un lien d'invitation</ThemedText>
          </Pressable>
        </Animated.View>

        {/* Rewards preview */}
        <Animated.View entering={FadeInDown.delay(170).duration(500)} style={styles.section}>
          <ThemedText variant="labelLarge" color="textPrimary" style={styles.sectionTitle}>
            Vos récompenses
          </ThemedText>
          <View style={styles.rewardsRow}>
            {PACT_BADGES.map((b) => (
              <View key={b.id} style={styles.rewardPreview}>
                <ThemedText style={{ fontSize: 28 }}>{b.emoji}</ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary" style={{ textAlign: 'center', marginTop: 2 }}>
                  {b.requiredDays}j
                </ThemedText>
              </View>
            ))}
            <View style={styles.rewardPreview}>
              <ThemedText style={{ fontSize: 28 }}>⭐</ThemedText>
              <ThemedText variant="bodySmall" color="textTertiary" style={{ textAlign: 'center', marginTop: 2 }}>
                30j +
              </ThemedText>
            </View>
          </View>
          <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: Spacing.sm }}>
            30 jours = badge "Maman Engagée" + 1 mois de Premium offert 🎁
          </ThemedText>
        </Animated.View>

        {/* Sign button */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.signSection}>
          <Pressable
            onPress={handleEngage}
            disabled={signing || signed}
            style={({ pressed }) => [
              styles.signBtn,
              signed && styles.signBtnSigned,
              { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <LinearGradient
              colors={signed ? ['#7CB69F', '#5A9A7A'] : [Colors.accent, Colors.accentDark ?? '#B8945A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.signBtnGradient}
            >
              {signed ? (
                <>
                  <Feather name="check" size={20} color="white" />
                  <ThemedText style={styles.signBtnText}>Pacte signé !</ThemedText>
                </>
              ) : signing ? (
                <ThemedText style={styles.signBtnText}>Signature en cours…</ThemedText>
              ) : (
                <>
                  <ThemedText style={styles.signBtnText}>Je m'engage</ThemedText>
                  <Feather name="arrow-right" size={18} color="white" />
                </>
              )}
            </LinearGradient>
          </Pressable>

          <SignatureUnderline active={signing || signed} />

          <ThemedText variant="bodySmall" color="textTertiary" style={styles.signNote}>
            Un rappel vous sera envoyé chaque soir à 20h si vous n'avez pas scanné.
          </ThemedText>
        </Animated.View>

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  scrollContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
  },

  // ── Hero ───────────────────────────────────────────────────────────────────
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },

  handsIllustration: {
    width: 120,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    position: 'relative',
  },

  handArc: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },

  handCenter: {
    position: 'absolute',
  },

  heroTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 28,
    color: Colors.accent,
    letterSpacing: -0.5,
    textAlign: 'center',
  },

  heroSub: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing.sm,
  },

  // ── Section ────────────────────────────────────────────────────────────────
  section: {
    gap: Spacing.md,
  },

  sectionTitle: {
    marginBottom: Spacing.sm,
  },

  // ── Duration chips ─────────────────────────────────────────────────────────
  durationRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  durationChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 2,
  },

  durationChipSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },

  durationLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: Colors.textPrimary,
  },

  durationSub: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
  },

  // ── Witnesses ──────────────────────────────────────────────────────────────
  witnessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  witnessChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  witnessChipSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight + '44',
  },

  witnessAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  witnessAvatarSelected: {
    backgroundColor: Colors.accent,
  },

  witnessInitial: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: Colors.accentDark ?? '#B8945A',
  },

  witnessName: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: Colors.textPrimary,
    maxWidth: 80,
  },

  linkShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },

  linkShareText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: Colors.accent,
    textDecorationLine: 'underline',
  },

  // ── Rewards preview ────────────────────────────────────────────────────────
  rewardsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },

  rewardPreview: {
    alignItems: 'center',
    gap: 2,
  },

  // ── Sign button ────────────────────────────────────────────────────────────
  signSection: {
    alignItems: 'center',
    gap: Spacing.md,
  },

  signBtn: {
    alignSelf: 'stretch',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.medium,
  },

  signBtnSigned: {},

  signBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: Spacing.md,
  },

  signBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: 'white',
    letterSpacing: 0.2,
  },

  signatureRow: {
    alignItems: 'center',
    height: 24,
  },

  signatureLine: {
    height: 2,
    backgroundColor: Colors.accent,
    borderRadius: 1,
  },

  signatureText: {
    position: 'absolute',
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: Colors.accent,
    letterSpacing: 3,
    top: 4,
  },

  signNote: {
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.xl,
  },

  // ── Active pact views ──────────────────────────────────────────────────────
  flameCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.soft,
  },

  flameGradient: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },

  dayLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 24,
    color: Colors.accent,
    letterSpacing: -0.3,
  },

  streakLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
  },

  progressSection: {
    gap: Spacing.sm,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  progressTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },

  progressFill: {
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },

  // ── Badges ─────────────────────────────────────────────────────────────────
  badgesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  badgeTile: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accentLight,
    gap: 4,
  },

  badgeTileLocked: {
    opacity: 0.45,
    borderColor: Colors.border,
  },

  badgeEmoji: {
    fontSize: 28,
  },

  badgeLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  badgeSub: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: 'center',
  },

  // ── Witnesses (active view) ────────────────────────────────────────────────
  witnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },

  witnessAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  witnessInitialSmall: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: Colors.accentDark ?? '#B8945A',
  },

  witnessStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7CB69F',
    marginLeft: 'auto',
  },

  // ── Stats ──────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.soft,
  },

  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },

  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },

  statNumber: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 28,
    color: Colors.accent,
    letterSpacing: -0.5,
  },

  // ── Scan CTA ───────────────────────────────────────────────────────────────
  scanCTA: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },

  scanCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: 16,
  },

  scanCTAText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: 'white',
  },
});
