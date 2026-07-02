import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { isFeatureEnabled } from '@/constants/featureFlags';
import { ComingSoonScreen } from '@/components/ComingSoonScreen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { usePremium } from '@/hooks/usePremium';
import {
  addCapsule,
  CapsuleData,
  CapsuleTrimester,
  compileCapsuleData,
  computeOpensAt,
  formatOpensDate,
  generateId,
  isCapsuleOpenable,
  loadCapsules,
  markCapsuleOpened,
  MemoryCapsule,
  OpeningDatePreset,
  scheduleCapsuleNotification,
} from '@/lib/memories';

import { CapsuleCard } from '@/components/memories/CapsuleCard';
import { CapsuleContentView } from '@/components/memories/CapsuleContentView';
import { OpeningOverlay, SealingOverlay } from '@/components/memories/CapsuleOverlays';
import {
  OPENING_PRESETS,
  StepOverview,
  StepPersonal,
  StepSeal,
} from '@/components/memories/MemoryCreationSteps';
import { styles } from '@/components/memories/memoriesStyles';

import { FeatureDiscoverySheet } from '@/components/ui/FeatureDiscoverySheet';
import { useFeatureDiscovery } from "@/hooks/useFeatureDiscovery";
  

type ScreenMode = 'list' | 'create' | 'sealing' | 'opening' | 'viewing';
type CreateStep = 0 | 1 | 2;

export default function MemoriesScreen() {
  if (!isFeatureEnabled('memories')) {
    return (
      <ComingSoonScreen
        title="Mémoires Hēlo"
        subtitle="Disponible en v1.2"
        emoji="📔"
        description="Une capsule temporelle pour ta grossesse. Photos, mots, émotions — à ouvrir dans 18 ans."
      />
    );
  }
  const __discovery_memories = useFeatureDiscovery('memories');
  const insets = useSafeAreaInsets();
  const { firstName, dueDate, trimester } = useProfile();
  const { isPremium } = usePremium();

  const [mode, setMode] = useState<ScreenMode>('list');
  const [createStep, setCreateStep] = useState<CreateStep>(0);
  const [capsules, setCapsules] = useState<MemoryCapsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [compiledData, setCompiledData] = useState<CapsuleData | null>(null);
  const [compiling, setCompiling] = useState(false);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<OpeningDatePreset>('birth');
  const [customDate] = useState<Date | null>(null);
  const [pendingCapsule, setPendingCapsule] = useState<MemoryCapsule | null>(null);
  const [viewingCapsule, setViewingCapsule] = useState<MemoryCapsule | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await loadCapsules();
    setCapsules(data.sort((a, b) => new Date(b.sealedAt).getTime() - new Date(a.sealedAt).getTime()));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCreate = useCallback(async () => {
    setMode('create');
    setCreateStep(0);
    setPhotoUri(null);
    setMessage('');
    setSelectedPreset('birth');
    setCompiling(true);
    const data = await compileCapsuleData();
    setCompiledData(data);
    setCompiling(false);
  }, []);

  const handlePickPhoto = useCallback(async () => {
    if (!isPremium) { router.push('/paywall'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }, [isPremium]);

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

  const onSealingDone = useCallback(async () => {
    if (!pendingCapsule) return;
    await addCapsule(pendingCapsule);
    await scheduleCapsuleNotification(pendingCapsule);
    await load();
    setPendingCapsule(null);
    setMode('list');
  }, [pendingCapsule, load]);

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
    setViewingCapsule(capsule);
    setMode('opening');
  }, []);

  const onOpeningDone = useCallback(async () => {
    if (!viewingCapsule) return;
    await markCapsuleOpened(viewingCapsule.id);
    await load();
    setViewingCapsule({ ...viewingCapsule, opened: true });
    setMode('viewing');
  }, [viewingCapsule, load]);

  // ── Viewing ─────────────────────────────────────────────────────────────────
  if (mode === 'viewing' && viewingCapsule) {
    return (
      <CapsuleContentView
        capsule={viewingCapsule}
        onBack={() => { setViewingCapsule(null); setMode('list'); }}
      />
    );
  }

  // ── Opening animation ───────────────────────────────────────────────────────
  if (mode === 'opening') {
    return (
      <View style={[styles.root, { backgroundColor: Colors.background }]}>
        <StatusBar style="light" />
        <OpeningOverlay onDone={onOpeningDone} />
      </View>
    );
  }

  // ── Sealing animation ───────────────────────────────────────────────────────
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

  // ── Creation wizard ─────────────────────────────────────────────────────────
  if (mode === 'create') {
    return (
      <View style={[styles.root, { backgroundColor: Colors.background }]}>
        <StatusBar style="dark" />
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={() => {
              if (createStep === 0) setMode('list');
              else setCreateStep((createStep - 1) as CreateStep);
            }}
            style={styles.backBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
          </Pressable>
          <ThemedText variant="headlineMedium" color="textPrimary">Nouvelle capsule</ThemedText>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.stepIndicator}>
          {([0, 1, 2] as const).map((s) => (
            <View key={s} style={[styles.stepDot, createStep >= s && styles.stepDotActive]} />
          ))}
        </View>

        {createStep === 0 && (
          <StepOverview compiling={compiling} data={compiledData} onNext={() => setCreateStep(1)} />
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

  // ── List ────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText variant="headlineMedium" color="textPrimary">Hēlo Memories</ThemedText>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={['#FFF9F0', '#FFFAF5']} style={styles.introCard}>
          <ThemedText style={styles.introEmoji}>📦</ThemedText>
          <ThemedText variant="headlineLarge" color="textPrimary" style={styles.introTitle}>
            Capsules temporelles
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.introSub}>
            À chaque trimestre, Hēlo compile tes moments forts dans une capsule scellée. Elle s'ouvrira le jour que tu choisis.
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
              Crée ta première capsule souvenir pour capturer cette période unique.
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

      <Animated.View entering={FadeIn.delay(300)} style={[styles.fab, { bottom: insets.bottom + Spacing.lg }]}>
        <Pressable
          style={({ pressed }) => [styles.fabInner, { opacity: pressed ? 0.88 : 1 }]}
          onPress={startCreate}
          accessibilityRole="button"
          accessibilityLabel="Créer une nouvelle capsule souvenir"
        >
          <Feather name="plus" size={20} color="#FFF" />
          <ThemedText style={styles.fabLabel}>Créer une capsule</ThemedText>
        </Pressable>
      </Animated.View>
    <FeatureDiscoverySheet {...__discovery_memories.sheetProps} />
    </View>
  );
}
