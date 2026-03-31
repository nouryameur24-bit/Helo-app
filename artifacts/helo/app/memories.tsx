import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import {
  addCapsule,
  CapsuleData,
  CapsuleTrimester,
  compileCapsuleData,
  computeOpensAt,
  formatOpensDate,
  formatSealedDate,
  generateId,
  isCapsuleOpenable,
  loadCapsules,
  markCapsuleOpened,
  MemoryCapsule,
  OpeningDatePreset,
  scheduleCapsuleNotification,
} from '@/lib/memories';
import { usePremium } from '@/hooks/usePremium';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// ── Types ─────────────────────────────────────────────────────────────────────

type ScreenMode = 'list' | 'create' | 'sealing' | 'opening' | 'viewing';
type CreateStep = 0 | 1 | 2;

const OPENING_PRESETS: Array<{
  id: OpeningDatePreset;
  emoji: string;
  label: string;
  sub: string;
}> = [
  { id: 'birth', emoji: '🤱', label: 'À la naissance', sub: 'Votre date prévue d\'accouchement' },
  { id: '1year', emoji: '🎂', label: '1er anniversaire', sub: 'Un an après la naissance' },
  { id: '5years', emoji: '🌟', label: '5 ans', sub: 'Pour son entrée en maternelle' },
  { id: '18years', emoji: '🎓', label: '18 ans', sub: 'À sa majorité' },
];

// ── Sparkle particle ─────────────────────────────────────────────────────────

function Sparkle({ delay, angle }: { delay: number; angle: number }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    const distance = 60 + Math.random() * 40;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;

    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(300, withTiming(0, { duration: 300 })),
    ));
    scale.value = withDelay(delay, withSequence(
      withSpring(1.2),
      withDelay(400, withTiming(0, { duration: 200 })),
    ));
    x.value = withDelay(delay, withTiming(dx, { duration: 600, easing: Easing.out(Easing.quad) }));
    y.value = withDelay(delay, withTiming(dy, { duration: 600, easing: Easing.out(Easing.quad) }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.sparkle,
        style,
        { backgroundColor: Math.random() > 0.5 ? Colors.accent : Colors.accentLight },
      ]}
    />
  );
}

// ── Capsule card ──────────────────────────────────────────────────────────────

function CapsuleCard({
  capsule,
  onPress,
}: {
  capsule: MemoryCapsule;
  onPress: () => void;
}) {
  const openable = isCapsuleOpenable(capsule);
  const opened = capsule.opened;

  return (
    <Pressable
      style={({ pressed }) => [styles.capsuleCard, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <LinearGradient
        colors={
          opened
            ? ['#FFF9F0', '#FFFAF5']
            : openable
              ? ['#FFF5E0', '#FFFAF5']
              : ['#FFFAF5', '#FFFAF5']
        }
        style={styles.capsuleGradient}
      >
        {/* Left — icon */}
        <View style={[styles.capsuleLockWrap, openable && styles.capsuleLockWrapOpenable]}>
          <ThemedText style={styles.capsuleLockEmoji}>
            {opened ? '📖' : openable ? '🔓' : '🔒'}
          </ThemedText>
        </View>

        {/* Center — info */}
        <View style={styles.capsuleInfo}>
          <ThemedText variant="labelLarge" color="textPrimary">
            {capsule.trimesterLabel}
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary">
            Scellée le {formatSealedDate(capsule.sealedAt)}
          </ThemedText>
          {opened ? (
            <ThemedText variant="bodySmall" color="safe" style={{ marginTop: 2 }}>
              Ouverte ✓
            </ThemedText>
          ) : openable ? (
            <ThemedText variant="bodySmall" style={[styles.capsuleOpenCta]}>
              Ouvrir votre capsule ✨
            </ThemedText>
          ) : (
            <ThemedText variant="bodySmall" color="textTertiary">
              S'ouvre le {formatOpensDate(capsule.opensAt)}
            </ThemedText>
          )}
        </View>

        {/* Right — stats pill */}
        <View style={styles.capsuleStats}>
          <ThemedText variant="labelSmall" color="accentDark">
            {capsule.data.scanCount} scans
          </ThemedText>
          <View style={styles.capsuleGlowBadge}>
            <ThemedText style={styles.capsuleGlowText}>
              {capsule.data.avgGlowScore > 0 ? capsule.data.avgGlowScore : '—'}
            </ThemedText>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ── Sealing animation overlay ─────────────────────────────────────────────────

function SealingOverlay({ onDone, capsuleLabel }: { onDone: () => void; capsuleLabel: string }) {
  const circleScale = useSharedValue(1);
  const circleRotate = useSharedValue(0);
  const lockScale = useSharedValue(0);
  const lockOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const bgOpacity = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    bgOpacity.value = withTiming(1, { duration: 400 });

    circleScale.value = withSequence(
      withTiming(1.15, { duration: 300, easing: Easing.out(Easing.quad) }),
      withDelay(200, withTiming(0.6, { duration: 600, easing: Easing.inOut(Easing.quad) })),
    );
    circleRotate.value = withDelay(200, withTiming(360, { duration: 700, easing: Easing.inOut(Easing.cubic) }));

    lockScale.value = withDelay(600, withSpring(1, { damping: 14, stiffness: 180 }));
    lockOpacity.value = withDelay(600, withTiming(1, { duration: 300 }));
    textOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }));

    const timer = setTimeout(() => {
      runOnJS(onDone)();
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: circleScale.value },
      { rotate: `${circleRotate.value}deg` },
    ],
  }));
  const lockStyle = useAnimatedStyle(() => ({
    opacity: lockOpacity.value,
    transform: [{ scale: lockScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));

  const SPARKLE_ANGLES = Array.from({ length: 12 }, (_, i) => (i * Math.PI * 2) / 12);

  return (
    <Animated.View style={[styles.sealingOverlay, bgStyle]}>
      {/* Sparkles */}
      <View style={styles.sparkleContainer}>
        {SPARKLE_ANGLES.map((angle, i) => (
          <Sparkle key={i} delay={500 + i * 30} angle={angle} />
        ))}
      </View>

      {/* Golden circle */}
      <Animated.View style={[styles.sealingCircle, circleStyle]} />

      {/* Lock */}
      <Animated.View style={[styles.sealingLock, lockStyle]}>
        <ThemedText style={styles.sealingLockEmoji}>🔒</ThemedText>
      </Animated.View>

      {/* Text */}
      <Animated.View style={[styles.sealingTextWrap, textStyle]}>
        <ThemedText variant="headlineMedium" style={styles.sealingTitle}>
          Capsule scellée
        </ThemedText>
        <ThemedText variant="bodyMedium" style={styles.sealingSub}>
          {capsuleLabel}
        </ThemedText>
        <ThemedText variant="bodySmall" style={styles.sealingHint}>
          Votre capsule vous attend dans le profil 💛
        </ThemedText>
      </Animated.View>
    </Animated.View>
  );
}

// ── Opening animation overlay ─────────────────────────────────────────────────

function OpeningOverlay({ onDone }: { onDone: () => void }) {
  const lockRotate = useSharedValue(0);
  const lightScale = useSharedValue(0);
  const lightOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const bgOpacity = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    bgOpacity.value = withTiming(1, { duration: 300 });

    lockRotate.value = withSequence(
      withTiming(-20, { duration: 200 }),
      withTiming(20, { duration: 200 }),
      withTiming(-15, { duration: 150 }),
      withTiming(0, { duration: 150 }),
      withDelay(100, withTiming(-45, { duration: 400, easing: Easing.out(Easing.back(2)) })),
    );

    lightScale.value = withDelay(600, withSpring(6, { damping: 20, stiffness: 80 }));
    lightOpacity.value = withDelay(600, withSequence(
      withTiming(0.7, { duration: 400 }),
      withDelay(300, withTiming(0, { duration: 400 })),
    ));

    textOpacity.value = withDelay(900, withTiming(1, { duration: 600 }));

    const timer = setTimeout(() => runOnJS(onDone)(), 2200);
    return () => clearTimeout(timer);
  }, []);

  const lockStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${lockRotate.value}deg` }],
  }));
  const lightStyle = useAnimatedStyle(() => ({
    opacity: lightOpacity.value,
    transform: [{ scale: lightScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));

  const SPARKLE_ANGLES = Array.from({ length: 10 }, (_, i) => (i * Math.PI * 2) / 10);

  return (
    <Animated.View style={[styles.sealingOverlay, bgStyle]}>
      <Animated.View style={[styles.openingLight, lightStyle]} />

      <View style={styles.sparkleContainer}>
        {SPARKLE_ANGLES.map((angle, i) => (
          <Sparkle key={i} delay={600 + i * 50} angle={angle} />
        ))}
      </View>

      <Animated.View style={lockStyle}>
        <ThemedText style={styles.openingLockEmoji}>🔓</ThemedText>
      </Animated.View>

      <Animated.View style={[styles.sealingTextWrap, textStyle]}>
        <ThemedText variant="headlineMedium" style={styles.sealingTitle}>
          Capsule ouverte ✨
        </ThemedText>
        <ThemedText variant="bodyMedium" style={styles.sealingSub}>
          Vos souvenirs vous attendent…
        </ThemedText>
      </Animated.View>
    </Animated.View>
  );
}

// ── Capsule content view ──────────────────────────────────────────────────────

function CapsuleContentView({
  capsule,
  onBack,
}: {
  capsule: MemoryCapsule;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();

  const verdictColor = (v: string): string => {
    if (v === 'safe') return Colors.safe;
    if (v === 'danger') return Colors.danger;
    return Colors.caution;
  };

  const verdictLabel = (v: string): string => {
    if (v === 'safe') return '✅';
    if (v === 'danger') return '⚠️';
    return '🟡';
  };

  const handleShare = useCallback(async () => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Partage', 'Le partage n\'est pas disponible sur cet appareil.');
        return;
      }
      await Sharing.shareAsync(capsule.photoUri ?? '', {
        dialogTitle: 'Partager ma capsule Hēlo',
      });
    } catch {
      Alert.alert('Partage', 'Impossible de partager cette capsule pour le moment.');
    }
  }, [capsule]);

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.contentHeader, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <ThemedText variant="headlineMedium" color="textPrimary">
          {capsule.trimesterLabel}
        </ThemedText>
        <Pressable onPress={handleShare} style={styles.shareBtn} hitSlop={12}>
          <Feather name="share" size={20} color={Colors.accentDark} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contentScroll, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Belly photo */}
        {capsule.photoUri ? (
          <View style={styles.contentPhotoWrap}>
            <Image source={{ uri: capsule.photoUri }} style={styles.contentPhoto} contentFit="cover" />
            <LinearGradient
              colors={['transparent', Colors.background]}
              style={styles.contentPhotoGradient}
            />
          </View>
        ) : (
          <LinearGradient
            colors={['#FFF5E0', Colors.background]}
            style={styles.contentHeroBanner}
          >
            <ThemedText style={styles.contentHeroEmoji}>🌿</ThemedText>
            <ThemedText variant="displayMedium" style={styles.contentHeroTitle}>
              {capsule.trimesterLabel}
            </ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary">
              Scellée le {formatSealedDate(capsule.sealedAt)}
            </ThemedText>
          </LinearGradient>
        )}

        {/* Stats section */}
        <View style={styles.contentSection}>
          <ThemedText variant="labelSmall" color="accentDark" style={styles.contentSectionLabel}>
            Votre grossesse en chiffres
          </ThemedText>
          <View style={styles.contentStatsGrid}>
            <StatTile value={String(capsule.data.scanCount)} label="produits scannés" emoji="🔍" />
            <StatTile
              value={capsule.data.avgGlowScore > 0 ? String(capsule.data.avgGlowScore) : '—'}
              label="Glow Score moyen"
              emoji="✨"
            />
            <StatTile value={String(capsule.data.journalCount)} label="entrées journal" emoji="📓" />
            <StatTile value={String(capsule.data.circleMessages)} label="messages cercle" emoji="💬" />
          </View>
        </View>

        {/* Top scans */}
        {capsule.data.topScans.length > 0 && (
          <View style={styles.contentSection}>
            <ThemedText variant="labelSmall" color="accentDark" style={styles.contentSectionLabel}>
              Vos scans marquants
            </ThemedText>
            <View style={styles.contentCard}>
              {capsule.data.topScans.map((scan, idx) => (
                <View key={idx} style={styles.scanRow}>
                  <ThemedText style={styles.scanEmoji}>{verdictLabel(scan.verdict)}</ThemedText>
                  <ThemedText
                    variant="bodyMedium"
                    style={{ flex: 1, color: verdictColor(scan.verdict) }}
                    numberOfLines={1}
                  >
                    {scan.name}
                  </ThemedText>
                </View>
              ))}
              {capsule.data.firstDangerProduct && (
                <View style={styles.firstDangerRow}>
                  <Feather name="alert-triangle" size={14} color={Colors.caution} />
                  <ThemedText variant="bodySmall" color="textSecondary" style={{ flex: 1 }}>
                    Premier produit surprenant :{' '}
                    <ThemedText variant="bodySmall" style={{ color: Colors.caution }}>
                      {capsule.data.firstDangerProduct}
                    </ThemedText>
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Journal entries */}
        {capsule.data.journalEntries.length > 0 && (
          <View style={styles.contentSection}>
            <ThemedText variant="labelSmall" color="accentDark" style={styles.contentSectionLabel}>
              Votre journal
            </ThemedText>
            {capsule.data.journalEntries.map((entry, idx) => (
              <View key={idx} style={styles.journalEntryCard}>
                <View style={styles.journalEntryHeader}>
                  <ThemedText style={styles.journalMood}>{entry.mood}</ThemedText>
                  <ThemedText variant="bodySmall" color="textTertiary">
                    {new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                  </ThemedText>
                </View>
                {entry.note ? (
                  <ThemedText variant="bodyMedium" color="textSecondary" numberOfLines={3}>
                    {entry.note}
                  </ThemedText>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Message for baby */}
        {capsule.message ? (
          <View style={styles.contentSection}>
            <ThemedText variant="labelSmall" color="accentDark" style={styles.contentSectionLabel}>
              Votre message
            </ThemedText>
            <LinearGradient
              colors={['#FFF9F0', '#FFFAF5']}
              style={styles.messageCard}
            >
              <ThemedText style={styles.messageQuote}>"</ThemedText>
              <ThemedText variant="bodyLarge" color="textPrimary" style={styles.messageText}>
                {capsule.message}
              </ThemedText>
            </LinearGradient>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.contentFooter}>
          <ThemedText style={styles.footerLogo}>Hēlo</ThemedText>
          <ThemedText variant="bodySmall" color="textTertiary" style={{ textAlign: 'center' }}>
            Avec amour 💛
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

function StatTile({ value, label, emoji }: { value: string; label: string; emoji: string }) {
  return (
    <View style={styles.statTile}>
      <ThemedText style={styles.statEmoji}>{emoji}</ThemedText>
      <ThemedText variant="headlineLarge" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText variant="bodySmall" color="textSecondary" style={styles.statLabel}>
        {label}
      </ThemedText>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  const { firstName, dueDate, trimester } = useProfile();
  const { isPremium } = usePremium();

  const [mode, setMode] = useState<ScreenMode>('list');
  const [createStep, setCreateStep] = useState<CreateStep>(0);

  const [capsules, setCapsules] = useState<MemoryCapsule[]>([]);
  const [loading, setLoading] = useState(true);

  const [compiledData, setCompiledData] = useState<CapsuleData | null>(null);
  const [compiling, setCompiling] = useState(false);

  // Create state
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<OpeningDatePreset>('birth');
  const [customDate, setCustomDate] = useState<Date | null>(null);

  // Sealing / opening
  const [pendingCapsule, setPendingCapsule] = useState<MemoryCapsule | null>(null);
  const [viewingCapsule, setViewingCapsule] = useState<MemoryCapsule | null>(null);

  // Load capsules
  const load = useCallback(async () => {
    setLoading(true);
    const data = await loadCapsules();
    setCapsules(data.sort((a, b) => new Date(b.sealedAt).getTime() - new Date(a.sealedAt).getTime()));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Start creation flow
  const startCreate = useCallback(async () => {
    setMode('create');
    setCreateStep(0);
    setPhotoUri(null);
    setMessage('');
    setSelectedPreset('birth');
    setCustomDate(null);

    setCompiling(true);
    const data = await compileCapsuleData();
    setCompiledData(data);
    setCompiling(false);
  }, []);

  // Photo picker
  const handlePickPhoto = useCallback(async () => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, [isPremium]);

  // Seal capsule
  const handleSeal = useCallback(async () => {
    if (!compiledData) return;

    const opensAt = computeOpensAt(selectedPreset, dueDate, customDate ?? undefined);
    const trimesterLabel =
      trimester === 1 ? 'Trimestre 1'
        : trimester === 2 ? 'Trimestre 2'
          : trimester === 3 ? 'Trimestre 3'
            : 'Capsule souvenir';

    const capsule: MemoryCapsule = {
      id: generateId(),
      trimester: (trimester ?? 1) as CapsuleTrimester,
      trimesterLabel,
      data: compiledData,
      sealedAt: new Date().toISOString(),
      opensAt: opensAt.toISOString(),
      opened: false,
      message: message.trim() || undefined,
      photoUri: photoUri || undefined,
    };

    setPendingCapsule(capsule);
    setMode('sealing');
  }, [compiledData, selectedPreset, dueDate, customDate, trimester, message, photoUri]);

  // After sealing animation ends
  const onSealingDone = useCallback(async () => {
    if (!pendingCapsule) return;
    await addCapsule(pendingCapsule);
    await scheduleCapsuleNotification(pendingCapsule);
    await load();
    setPendingCapsule(null);
    setMode('list');
  }, [pendingCapsule, load]);

  // Tap on capsule
  const handleCapsuleTap = useCallback(async (capsule: MemoryCapsule) => {
    if (capsule.opened) {
      setViewingCapsule(capsule);
      setMode('viewing');
      return;
    }
    const openable = isCapsuleOpenable(capsule);
    if (!openable) {
      Alert.alert(
        '🔒 Capsule scellée',
        `Cette capsule s'ouvrira le ${formatOpensDate(capsule.opensAt)}. Patience 💛`,
        [{ text: 'OK' }],
      );
      return;
    }

    // Openable: show opening animation
    setViewingCapsule(capsule);
    setMode('opening');
  }, []);

  // After opening animation
  const onOpeningDone = useCallback(async () => {
    if (!viewingCapsule) return;
    await markCapsuleOpened(viewingCapsule.id);
    await load();
    const updated = { ...viewingCapsule, opened: true };
    setViewingCapsule(updated);
    setMode('viewing');
  }, [viewingCapsule, load]);

  // ── Render viewing ─────────────────────────────────────────────────────────

  if (mode === 'viewing' && viewingCapsule) {
    return (
      <CapsuleContentView
        capsule={viewingCapsule}
        onBack={() => { setViewingCapsule(null); setMode('list'); }}
      />
    );
  }

  // ── Render opening animation ───────────────────────────────────────────────

  if (mode === 'opening') {
    return (
      <View style={[styles.root, { backgroundColor: Colors.background }]}>
        <StatusBar style="light" />
        <OpeningOverlay onDone={onOpeningDone} />
      </View>
    );
  }

  // ── Render sealing animation ───────────────────────────────────────────────

  if (mode === 'sealing' && pendingCapsule) {
    return (
      <View style={[styles.root, { backgroundColor: Colors.background }]}>
        <StatusBar style="light" />
        <SealingOverlay
          onDone={onSealingDone}
          capsuleLabel={`Rendez-vous le ${formatOpensDate(pendingCapsule.opensAt)} 💛`}
        />
      </View>
    );
  }

  // ── Render creation wizard ─────────────────────────────────────────────────

  if (mode === 'create') {
    return (
      <View style={[styles.root, { backgroundColor: Colors.background }]}>
        <StatusBar style="dark" />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={() => {
              if (createStep === 0) setMode('list');
              else setCreateStep((createStep - 1) as CreateStep);
            }}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
          </Pressable>
          <ThemedText variant="headlineMedium" color="textPrimary">
            Nouvelle capsule
          </ThemedText>
          <View style={{ width: 38 }} />
        </View>

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          {[0, 1, 2].map((s) => (
            <View
              key={s}
              style={[styles.stepDot, createStep >= s && styles.stepDotActive]}
            />
          ))}
        </View>

        {createStep === 0 && (
          <StepOverview
            compiling={compiling}
            data={compiledData}
            onNext={() => setCreateStep(1)}
          />
        )}
        {createStep === 1 && (
          <StepPersonal
            photoUri={photoUri}
            message={message}
            isPremium={isPremium}
            firstName={firstName}
            onPickPhoto={handlePickPhoto}
            onMessageChange={setMessage}
            onNext={() => setCreateStep(2)}
          />
        )}
        {createStep === 2 && (
          <StepSeal
            selectedPreset={selectedPreset}
            onSelectPreset={setSelectedPreset}
            dueDate={dueDate}
            onSeal={handleSeal}
          />
        )}
      </View>
    );
  }

  // ── Render list ────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText variant="headlineMedium" color="textPrimary">
            Hēlo Memories
          </ThemedText>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro card */}
        <LinearGradient colors={['#FFF9F0', '#FFFAF5']} style={styles.introCard}>
          <ThemedText style={styles.introEmoji}>📦</ThemedText>
          <ThemedText variant="headlineLarge" color="textPrimary" style={styles.introTitle}>
            Capsules temporelles
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.introSub}>
            À chaque trimestre, Hēlo compile vos moments forts dans une capsule scellée. Elle s'ouvrira le jour que vous choisissez.
          </ThemedText>
        </LinearGradient>

        {loading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xxl }} />
        ) : capsules.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyEmoji}>🌱</ThemedText>
            <ThemedText variant="headlineMedium" color="textPrimary" style={{ textAlign: 'center' }}>
              Aucune capsule encore
            </ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary" style={[styles.emptySub]}>
              Créez votre première capsule souvenir pour capturer cette période unique.
            </ThemedText>
          </View>
        ) : (
          <>
            <ThemedText variant="labelSmall" color="accentDark" style={styles.listSectionLabel}>
              Mes capsules
            </ThemedText>
            {capsules.map((c) => (
              <CapsuleCard key={c.id} capsule={c} onPress={() => handleCapsuleTap(c)} />
            ))}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <Animated.View
        entering={FadeIn.delay(300)}
        style={[styles.fab, { bottom: insets.bottom + Spacing.lg }]}
      >
        <Pressable
          style={({ pressed }) => [styles.fabInner, { opacity: pressed ? 0.88 : 1 }]}
          onPress={startCreate}
        >
          <Feather name="plus" size={20} color="#FFF" />
          <ThemedText style={styles.fabLabel}>Créer une capsule</ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ── Step 0 — Overview ─────────────────────────────────────────────────────────

function StepOverview({
  compiling,
  data,
  onNext,
}: {
  compiling: boolean;
  data: CapsuleData | null;
  onNext: () => void;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.stepContent}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText variant="headlineLarge" color="textPrimary" style={styles.stepTitle}>
        Votre trimestre en résumé
      </ThemedText>
      <ThemedText variant="bodyMedium" color="textSecondary" style={styles.stepSub}>
        Hēlo a compilé vos données. Voici ce qui sera scellé dans votre capsule.
      </ThemedText>

      {compiling || !data ? (
        <View style={styles.compilingWrap}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.md }}>
            Compilation en cours…
          </ThemedText>
        </View>
      ) : (
        <View style={styles.overviewGrid}>
          <OverviewTile emoji="🔍" value={data.scanCount} label="produits scannés" />
          <OverviewTile emoji="✨" value={data.avgGlowScore || '—'} label="Glow Score moyen" />
          <OverviewTile emoji="📓" value={data.journalCount} label="entrées journal" />
          <OverviewTile emoji="💬" value={data.circleMessages} label="messages cercle" />
          {data.topProduct && (
            <View style={styles.overviewHighlight}>
              <ThemedText variant="labelSmall" color="accentDark">
                Produit le plus scanné
              </ThemedText>
              <ThemedText variant="bodyLarge" color="textPrimary" numberOfLines={1}>
                {data.topProduct}
              </ThemedText>
            </View>
          )}
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.nextBtn, { opacity: pressed ? 0.85 : 1 }]}
        onPress={onNext}
        disabled={compiling}
      >
        <ThemedText style={styles.nextBtnLabel}>Personnaliser ma capsule →</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

function OverviewTile({ emoji, value, label }: { emoji: string; value: number | string; label: string }) {
  return (
    <View style={styles.overviewTile}>
      <ThemedText style={styles.overviewEmoji}>{emoji}</ThemedText>
      <ThemedText variant="headlineLarge" style={styles.overviewValue}>
        {String(value)}
      </ThemedText>
      <ThemedText variant="bodySmall" color="textSecondary" style={styles.overviewLabel}>
        {label}
      </ThemedText>
    </View>
  );
}

// ── Step 1 — Personal touch ───────────────────────────────────────────────────

function StepPersonal({
  photoUri,
  message,
  isPremium,
  firstName,
  onPickPhoto,
  onMessageChange,
  onNext,
}: {
  photoUri: string | null;
  message: string;
  isPremium: boolean;
  firstName: string | null;
  onPickPhoto: () => void;
  onMessageChange: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.stepContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedText variant="headlineLarge" color="textPrimary" style={styles.stepTitle}>
        Votre touche personnelle
      </ThemedText>
      <ThemedText variant="bodyMedium" color="textSecondary" style={styles.stepSub}>
        Ajoutez ce qui vous tient à cœur. Ces contenus sont réservés aux membres premium.
      </ThemedText>

      {/* Photo */}
      <Pressable
        style={({ pressed }) => [styles.photoPickerBtn, { opacity: pressed ? 0.85 : 1 }]}
        onPress={onPickPhoto}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
        ) : (
          <>
            <View style={styles.photoIcon}>
              <Feather name="camera" size={24} color={Colors.accentDark} />
              {!isPremium && (
                <View style={styles.premiumBadgePill}>
                  <ThemedText style={styles.premiumBadgeText}>Premium</ThemedText>
                </View>
              )}
            </View>
            <ThemedText variant="bodyMedium" color="accentDark" style={{ marginTop: Spacing.sm }}>
              Ajouter une photo de votre ventre
            </ThemedText>
            <ThemedText variant="bodySmall" color="textTertiary">
              Portrait, 3:4 recommandé
            </ThemedText>
          </>
        )}
      </Pressable>

      {/* Message for baby */}
      <View style={styles.messageSection}>
        <View style={styles.messageLabelRow}>
          <ThemedText variant="labelSmall" color="accentDark">
            Un message pour votre bébé
          </ThemedText>
          {!isPremium && (
            <View style={styles.premiumBadgePill}>
              <ThemedText style={styles.premiumBadgeText}>Premium</ThemedText>
            </View>
          )}
        </View>
        <TextInput
          style={styles.messageInput}
          placeholder={`Cher(e) ${firstName || 'bébé'}…`}
          placeholderTextColor={Colors.textTertiary}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={message}
          onChangeText={isPremium ? onMessageChange : () => router.push('/paywall')}
          editable={isPremium}
        />
      </View>

      {/* Audio — coming soon */}
      <View style={styles.audioComingSoon}>
        <Feather name="mic" size={20} color={Colors.textTertiary} />
        <ThemedText variant="bodySmall" color="textTertiary" style={{ flex: 1 }}>
          Message vocal — prochainement 🎙
        </ThemedText>
      </View>

      <Pressable
        style={({ pressed }) => [styles.nextBtn, { opacity: pressed ? 0.85 : 1 }]}
        onPress={onNext}
      >
        <ThemedText style={styles.nextBtnLabel}>Choisir la date d'ouverture →</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

// ── Step 2 — Seal ─────────────────────────────────────────────────────────────

function StepSeal({
  selectedPreset,
  onSelectPreset,
  dueDate,
  onSeal,
}: {
  selectedPreset: OpeningDatePreset;
  onSelectPreset: (p: OpeningDatePreset) => void;
  dueDate: string | null;
  onSeal: () => void;
}) {
  const computedDate = computeOpensAt(selectedPreset, dueDate);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.stepContent}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText variant="headlineLarge" color="textPrimary" style={styles.stepTitle}>
        Quand s'ouvrira-t-elle ?
      </ThemedText>
      <ThemedText variant="bodyMedium" color="textSecondary" style={styles.stepSub}>
        Choisissez le moment magique où votre capsule sera déscellée.
      </ThemedText>

      <View style={styles.presetList}>
        {OPENING_PRESETS.map((preset) => {
          const active = selectedPreset === preset.id;
          return (
            <Pressable
              key={preset.id}
              style={({ pressed }) => [
                styles.presetCard,
                active && styles.presetCardActive,
                { opacity: pressed ? 0.88 : 1 },
              ]}
              onPress={() => onSelectPreset(preset.id)}
            >
              <ThemedText style={styles.presetEmoji}>{preset.emoji}</ThemedText>
              <View style={{ flex: 1 }}>
                <ThemedText
                  variant="bodyLarge"
                  style={active ? { color: Colors.accentDark, fontFamily: 'PlusJakartaSans_600SemiBold' } : undefined}
                  color={active ? undefined : 'textPrimary'}
                >
                  {preset.label}
                </ThemedText>
                <ThemedText variant="bodySmall" color="textSecondary">
                  {preset.sub}
                </ThemedText>
              </View>
              {active && <Feather name="check-circle" size={20} color={Colors.accent} />}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.dateSummary}>
        <ThemedText variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center' }}>
          Ouverture prévue le
        </ThemedText>
        <ThemedText variant="headlineMedium" style={styles.dateSummaryDate}>
          {formatOpensDate(computedDate.toISOString())}
        </ThemedText>
      </View>

      <Pressable
        style={({ pressed }) => [styles.sealBtn, { opacity: pressed ? 0.88 : 1 }]}
        onPress={onSeal}
      >
        <LinearGradient
          colors={[Colors.accent, Colors.accentDark]}
          style={styles.sealBtnGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <ThemedText style={styles.sealBtnLabel}>🔒 Sceller ma capsule</ThemedText>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
  },
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
  },
  stepDotActive: {
    backgroundColor: Colors.accent,
    width: 20,
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  introCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  introEmoji: {
    fontSize: 48,
  },
  introTitle: {
    textAlign: 'center',
  },
  introSub: {
    textAlign: 'center',
  },
  listSectionLabel: {
    paddingHorizontal: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptySub: {
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },

  // Capsule card
  capsuleCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.soft,
  },
  capsuleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  capsuleLockWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleLockWrapOpenable: {
    backgroundColor: '#FFF5E0',
  },
  capsuleLockEmoji: {
    fontSize: 24,
  },
  capsuleInfo: {
    flex: 1,
    gap: 2,
  },
  capsuleOpenCta: {
    color: Colors.accentDark,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginTop: 2,
  },
  capsuleStats: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  capsuleGlowBadge: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  capsuleGlowText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: Colors.accentDark,
  },

  // FAB
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    ...Shadows.elevated,
  },
  fabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentDark,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.full,
  },
  fabLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },

  // Sealing overlay
  sealingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 41, 38, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  sealingCircle: {
    width: 140,
    height: 140,
    borderRadius: Radius.full,
    borderWidth: 4,
    borderColor: Colors.accent,
    backgroundColor: 'transparent',
    position: 'absolute',
  },
  sealingLock: {
    position: 'absolute',
  },
  sealingLockEmoji: {
    fontSize: 52,
  },
  openingLockEmoji: {
    fontSize: 52,
  },
  openingLight: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
  },
  sealingTextWrap: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.xxl,
    right: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sealingTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  sealingSub: {
    color: Colors.accentLight,
    textAlign: 'center',
  },
  sealingHint: {
    color: Colors.textTertiary,
    textAlign: 'center',
  },

  // Sparkles
  sparkleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },

  // Step content
  stepContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.huge,
    gap: Spacing.lg,
  },
  stepTitle: {
    marginTop: Spacing.sm,
  },
  stepSub: {
    marginBottom: Spacing.sm,
  },

  // Overview step
  compilingWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  overviewGrid: {
    gap: Spacing.md,
  },
  overviewTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  overviewEmoji: {
    fontSize: 28,
  },
  overviewValue: {
    color: Colors.accent,
    minWidth: 40,
  },
  overviewLabel: {
    flex: 1,
  },
  overviewHighlight: {
    backgroundColor: '#FFF9F0',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accentLight,
    gap: 4,
  },

  // Personal step
  photoPickerBtn: {
    borderWidth: 2,
    borderColor: Colors.accentLight,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    gap: Spacing.sm,
    backgroundColor: '#FFF9F0',
    minHeight: 160,
    overflow: 'hidden',
  },
  photoIcon: {
    position: 'relative',
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: Radius.md,
  },
  premiumBadgePill: {
    backgroundColor: Colors.accentDark,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginLeft: Spacing.sm,
  },
  premiumBadgeText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  messageSection: {
    gap: Spacing.sm,
  },
  messageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    minHeight: 120,
  },
  audioComingSoon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.lg,
  },

  // Preset (seal step)
  presetList: {
    gap: Spacing.sm,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  presetCardActive: {
    borderColor: Colors.accent,
    backgroundColor: '#FFF9F0',
  },
  presetEmoji: {
    fontSize: 28,
  },
  dateSummary: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.xs,
  },
  dateSummaryDate: {
    color: Colors.accentDark,
  },

  // Buttons
  nextBtn: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  nextBtnLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  sealBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  sealBtnGradient: {
    paddingVertical: Spacing.md + 4,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
  },
  sealBtnLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: '#FFFFFF',
  },

  // Content view
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  contentScroll: {
    gap: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  contentPhotoWrap: {
    height: 280,
    marginHorizontal: -Spacing.lg,
    position: 'relative',
  },
  contentPhoto: {
    width: '100%',
    height: '100%',
  },
  contentPhotoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  contentHeroBanner: {
    alignItems: 'center',
    padding: Spacing.xxl,
    borderRadius: Radius.xl,
    gap: Spacing.sm,
    marginHorizontal: -Spacing.xs,
  },
  contentHeroEmoji: {
    fontSize: 48,
  },
  contentHeroTitle: {
    color: Colors.accentDark,
    textAlign: 'center',
  },
  contentSection: {
    gap: Spacing.md,
  },
  contentSectionLabel: {
    paddingHorizontal: Spacing.xs,
  },
  contentStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  contentCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadows.soft,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  scanEmoji: {
    fontSize: 16,
  },
  firstDangerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  journalEntryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadows.soft,
  },
  journalEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  journalMood: {
    fontSize: 24,
  },
  messageCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.accentLight,
    gap: Spacing.sm,
  },
  messageQuote: {
    fontSize: 48,
    color: Colors.accentLight,
    fontFamily: 'PlusJakartaSans_700Bold',
    lineHeight: 48,
    marginBottom: -Spacing.md,
  },
  messageText: {
    fontStyle: 'italic',
    lineHeight: 28,
  },
  contentFooter: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    gap: Spacing.xs,
  },
  footerLogo: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: Colors.accent,
  },

  // Stat tile (content view)
  statTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  statEmoji: {
    fontSize: 24,
  },
  statValue: {
    color: Colors.accent,
  },
  statLabel: {
    textAlign: 'center',
  },
});
