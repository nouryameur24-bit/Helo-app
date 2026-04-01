// ─── Le Pacte Hēlo ──────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { useCircle } from '@/hooks/useCircle';
import {
  abandonPact,
  computePactDay,
  createPact,
  loadEarnedBadges,
  loadPact,
  PACT_BADGES,
  schedulePactReminder,
  type PactBadgeId,
  type PactState,
  type PactWitness,
} from '@/lib/pact';
import {
  BadgeTile,
  FlameIcon,
  ProgressBar,
  SignatureUnderline,
  WitnessChip,
} from '@/components/pact/PactComponents';
import styles from '@/components/pact/pactStyles';

const DURATIONS: { days: number; label: string; sub: string }[] = [
  { days: 7, label: '7 jours', sub: 'Débutante' },
  { days: 14, label: '14 jours', sub: 'Motivée' },
  { days: 30, label: '30 jours', sub: 'Engagée' },
];

export default function PactScreen() {
  const insets = useSafeAreaInsets();
  const { userId, firstName } = useProfile();
  const { members: circleMembers } = useCircle(userId, firstName || 'Toi');

  const [pact, setPact] = useState<PactState | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<PactBadgeId[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDuration, setSelectedDuration] = useState(30);
  const [selectedWitnesses, setSelectedWitnesses] = useState<string[]>([]);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, badges] = await Promise.all([loadPact(), loadEarnedBadges()]);
      setPact(p && p.status === 'active' ? p : null);
      setEarnedBadges(badges);
      setLoading(false);
    })();
  }, []);

  const handleEngage = useCallback(async () => {
    if (signing || signed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSigning(true);

    const witnesses: PactWitness[] = selectedWitnesses
      .map((id) => circleMembers.find((m) => m.user_id === id))
      .filter(Boolean)
      .map((m) => ({ id: m!.user_id, name: m!.first_name }));

    await new Promise((r) => setTimeout(r, 950));
    setSigned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newPact = await createPact(selectedDuration, witnesses);
    await schedulePactReminder(newPact);

    await new Promise((r) => setTimeout(r, 600));
    setPact(newPact);
    setSigning(false);
  }, [signing, signed, selectedWitnesses, circleMembers, selectedDuration]);

  const handleShare = useCallback(async () => {
    const msg = `${firstName || 'Je'} vous invite à rejoindre son Pacte Hēlo — 30 jours de scan grossesse ! Téléchargez Hēlo 🤱`;
    try {
      const available = await Sharing.isAvailableAsync();
      if (available) {
        const { Share } = await import('react-native');
        await Share.share({ message: msg });
      }
    } catch {}
  }, [firstName]);

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

  const toggleWitness = useCallback((id: string) => {
    setSelectedWitnesses((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }, []);

  if (loading) {
    return <View style={[styles.root, { backgroundColor: Colors.background }]} />;
  }

  // ── Active pact view ──────────────────────────────────────────────────────
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
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Retour"
            >
              <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
            </Pressable>
            <ThemedText variant="headlineMedium" color="textPrimary">Le Pacte Hēlo</ThemedText>
            <Pressable
              onPress={handleAbandon}
              style={{ padding: 4 }}
              accessibilityRole="button"
              accessibilityLabel="Options du pacte"
            >
              <Feather name="more-horizontal" size={20} color={Colors.textTertiary} />
            </Pressable>
          </View>

          <Animated.View entering={FadeInDown.delay(50).duration(500)} style={styles.flameCard}>
            <LinearGradient colors={['#FFF5E0', '#FFF0CC']} style={styles.flameGradient}>
              <FlameIcon streak={streak} />
              <View style={{ alignItems: 'center', marginTop: Spacing.sm }}>
                <ThemedText style={styles.dayLabel}>Jour {day} / {pact.duration}</ThemedText>
                <ThemedText style={styles.streakLabel}>
                  Série : {streak} jour{streak > 1 ? 's' : ''} consécutif{streak > 1 ? 's' : ''}
                </ThemedText>
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <ThemedText variant="bodySmall" color="textTertiary">Progression</ThemedText>
              <ThemedText variant="bodySmall" color="accent">{Math.round(progress * 100)}%</ThemedText>
            </View>
            <ProgressBar progress={progress} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.section}>
            <ThemedText variant="labelLarge" color="textPrimary" style={styles.sectionTitle}>
              Mes récompenses
            </ThemedText>
            <View style={styles.badgesRow}>
              {PACT_BADGES.map((b) => (
                <BadgeTile key={b.id} id={b.id} earned={earnedBadges.includes(b.id)} />
              ))}
            </View>
          </Animated.View>

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

          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <Pressable
              onPress={() => router.push('/(tabs)/scan')}
              style={({ pressed }) => [
                styles.scanCTA,
                { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Scanner maintenant"
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
  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.sm }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>

        <Animated.View entering={FadeInDown.delay(0).duration(600)} style={styles.heroSection}>
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
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedDuration === d.days }}
                accessibilityLabel={d.label}
              >
                <ThemedText
                  style={selectedDuration === d.days
                    ? [styles.durationLabel, { color: 'white' as const }]
                    : styles.durationLabel}
                >
                  {d.label}
                </ThemedText>
                <ThemedText
                  style={selectedDuration === d.days
                    ? [styles.durationSub, { color: 'rgba(255,255,255,0.8)' as const }]
                    : styles.durationSub}
                >
                  {d.sub}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(130).duration(500)} style={styles.section}>
          <ThemedText variant="labelLarge" color="textPrimary" style={styles.sectionTitle}>
            Invitez vos témoins
            <ThemedText variant="bodySmall" color="textTertiary"> (jusqu'à 3)</ThemedText>
          </ThemedText>
          {circleMembers.length === 0 ? (
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: Spacing.sm }}>
              Votre Cercle est vide — ajoutez des amies pour les inviter comme témoins.
            </ThemedText>
          ) : (
            <View style={styles.witnessGrid}>
              {circleMembers.slice(0, 6).map((m) => (
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
            accessibilityRole="button"
            accessibilityLabel="Partager un lien d'invitation"
          >
            <Feather name="share-2" size={14} color={Colors.accent} />
            <ThemedText style={styles.linkShareText}>Partager un lien d'invitation</ThemedText>
          </Pressable>
        </Animated.View>

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

        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.signSection}>
          <Pressable
            onPress={handleEngage}
            disabled={signing || signed}
            style={({ pressed }) => [
              styles.signBtn,
              signed && styles.signBtnSigned,
              { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={signed ? 'Pacte signé' : "Je m'engage dans le Pacte Hēlo"}
            accessibilityState={{ disabled: signing || signed }}
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
