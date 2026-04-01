import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import {
  fetchProductByBarcode,
  getVerdict,
  matchIngredients,
} from '@/lib/productLookup';
import { useProfile } from '@/hooks/useProfile';

const { width: W, height: H } = Dimensions.get('window');
const PARTY_USED_KEY = '@helo_scan_party_used';
const DEBOUNCE_MS = 3000;

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'config' | 'scan' | 'summary' | 'export';
type Theme = 'salle-de-bain' | 'frigo' | 'maquillage' | 'libre';
type VerdictType = 'safe' | 'caution' | 'danger';

interface PartyResult {
  barcode: string;
  name: string;
  brand: string;
  verdict: VerdictType;
}

const THEMES: { id: Theme; label: string; emoji: string }[] = [
  { id: 'salle-de-bain', label: 'Salle de bain', emoji: '🛁' },
  { id: 'frigo', label: 'Frigo', emoji: '🧊' },
  { id: 'maquillage', label: 'Maquillage', emoji: '💄' },
  { id: 'libre', label: 'Libre', emoji: '✨' },
];

const VERDICT_CONFIG: Record<VerdictType, { label: string; color: string; bg: string }> = {
  safe: { label: 'COMPATIBLE', color: Colors.safe, bg: Colors.safeBg },
  caution: { label: 'PRÉCAUTION', color: Colors.caution, bg: Colors.cautionBg },
  danger: { label: 'À ÉVITER', color: Colors.danger, bg: Colors.dangerBg },
};

// ─── Phase 1 — Configuration ──────────────────────────────────────────────────

function PhaseConfig({
  onStart,
  selectedTheme,
  onSelectTheme,
}: {
  onStart: () => void;
  selectedTheme: Theme;
  onSelectTheme: (t: Theme) => void;
}) {
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={[cfg.root, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }]}>
      {/* Header */}
      <View style={cfg.header}>
        <Pressable onPress={() => router.back()} style={cfg.backBtn}>
          <Feather name="x" size={22} color={Colors.textSecondary} />
        </Pressable>
        <View style={cfg.badge}>
          <ThemedText variant="labelSmall" style={{ color: Colors.surface }}>SCAN PARTY</ThemedText>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={cfg.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={cfg.heroWrap}>
          <LinearGradient
            colors={[Colors.accentLight, Colors.accent]}
            style={cfg.heroGradient}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          >
            <ThemedText style={cfg.heroEmoji}>🎉</ThemedText>
            <ThemedText variant="displayMedium" style={{ color: '#fff', textAlign: 'center' }}>
              Scan Party
            </ThemedText>
            <ThemedText variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 4 }}>
              Scannez tous vos produits d'un coup
            </ThemedText>
          </LinearGradient>
        </View>

        {/* Counter */}
        <Card padding={Spacing.xl} style={cfg.counterCard}>
          <ThemedText variant="displayLarge" color="accent" style={{ textAlign: 'center' }}>0</ThemedText>
          <ThemedText variant="bodySmall" color="textTertiary" style={{ textAlign: 'center', marginTop: 2 }}>
            produits scannés
          </ThemedText>
        </Card>

        {/* Theme picker */}
        <View style={cfg.section}>
          <ThemedText variant="labelLarge" color="textPrimary" style={cfg.sectionTitle}>Choisissez un thème</ThemedText>
          <View style={cfg.themeGrid}>
            {THEMES.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => onSelectTheme(t.id)}
                style={[
                  cfg.themeCard,
                  selectedTheme === t.id && cfg.themeCardActive,
                ]}
              >
                <ThemedText style={cfg.themeEmoji}>{t.emoji}</ThemedText>
                <ThemedText
                  variant="bodySmall"
                  style={{
                    color: selectedTheme === t.id ? Colors.accentDark : Colors.textSecondary,
                    textAlign: 'center',
                    marginTop: 4,
                  }}
                >
                  {t.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Start button */}
        <Animated.View style={[pulseStyle, cfg.startWrap]}>
          <Pressable
            onPress={onStart}
            style={({ pressed }) => [cfg.startBtn, { opacity: pressed ? 0.9 : 1 }]}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.accentDark]}
              style={cfg.startBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="zap" size={22} color="#fff" />
              <ThemedText style={cfg.startBtnLabel}>Commencer</ThemedText>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Phase 2 — Scan ───────────────────────────────────────────────────────────

function PhaseScan({
  theme,
  results,
  onScanResult,
  onFinish,
  trimester,
}: {
  theme: Theme;
  results: PartyResult[];
  onScanResult: (r: PartyResult) => void;
  onFinish: () => void;
  trimester: number;
}) {
  const insets = useSafeAreaInsets();
  const lastBarcode = useRef<string>('');
  const lastScanTime = useRef<number>(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  // Verdict overlay animation
  const verdictScale = useSharedValue(0);
  const verdictOpacity = useSharedValue(0);
  const [flashVerdict, setFlashVerdict] = useState<VerdictType | null>(null);
  const [flashName, setFlashName] = useState('');

  const verdictStyle = useAnimatedStyle(() => ({
    transform: [{ scale: verdictScale.value }],
    opacity: verdictOpacity.value,
  }));

  const showVerdictFlash = useCallback((v: VerdictType, name: string) => {
    setFlashVerdict(v);
    setFlashName(name);
    verdictScale.value = 0;
    verdictOpacity.value = 0;
    verdictScale.value = withSequence(
      withTiming(1.15, { duration: 220, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 120 }),
      withDelay(1400, withTiming(0, { duration: 350 })),
    );
    verdictOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(1500, withTiming(0, { duration: 350 })),
    );
  }, []);

  const handleBarcode = useCallback(async ({ data: barcode }: { data: string }) => {
    const now = Date.now();
    if (
      barcode === lastBarcode.current &&
      now - lastScanTime.current < DEBOUNCE_MS
    ) return;
    if (scanning) return;

    lastBarcode.current = barcode;
    lastScanTime.current = now;
    setScanning(true);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const product = await fetchProductByBarcode(barcode);
      if (!product) {
        setScanning(false);
        return;
      }
      const matches = await matchIngredients(product.ingredientsList, trimester as 1 | 2 | 3);
      const { verdict } = getVerdict(matches);
      const result: PartyResult = {
        barcode,
        name: product.name,
        brand: product.brand ?? '',
        verdict,
      };
      onScanResult(result);
      showVerdictFlash(verdict, product.name);
      Haptics.notificationAsync(
        verdict === 'safe'
          ? Haptics.NotificationFeedbackType.Success
          : verdict === 'danger'
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Warning,
      );
    } catch {
      // Ignore errors silently in party mode
    } finally {
      setTimeout(() => setScanning(false), DEBOUNCE_MS);
    }
  }, [scanning, trimester, onScanResult, showVerdictFlash]);

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  if (!permission.granted) {
    return (
      <View style={scan.permRoot}>
        <Feather name="camera" size={48} color={Colors.accent} />
        <ThemedText variant="headlineMedium" color="textPrimary" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
          Accès caméra requis
        </ThemedText>
        <View style={{ marginTop: Spacing.xl, width: '80%' }}>
          <Button variant="primary" fullWidth onPress={requestPermission}>Autoriser</Button>
        </View>
      </View>
    );
  }

  const themeLabel = THEMES.find((t) => t.id === theme)?.label ?? theme;
  const config = flashVerdict ? VERDICT_CONFIG[flashVerdict] : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={scanning ? undefined : handleBarcode}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
      />

      {/* Top overlay */}
      <View style={[scan.topOverlay, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={scan.topBar}>
          <Pressable onPress={() => router.back()} style={scan.closeBtn}>
            <Feather name="x" size={20} color="#fff" />
          </Pressable>
          <View style={scan.partBadge}>
            <Feather name="zap" size={12} color={Colors.accent} />
            <ThemedText variant="labelSmall" style={{ color: Colors.accent, marginLeft: 4 }}>
              SCAN PARTY · {themeLabel.toUpperCase()}
            </ThemedText>
          </View>
          <View style={scan.counterBubble}>
            <ThemedText variant="headlineMedium" style={{ color: '#fff' }}>
              {results.length}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Viewfinder */}
      <View style={scan.vf}>
        {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
          <View key={pos} style={[scan.corner, CORNER_STYLES[pos]]} />
        ))}
      </View>

      {/* Verdict flash */}
      {config && (
        <Animated.View
          style={[scan.verdictFlash, { backgroundColor: config.bg }, verdictStyle]}
          pointerEvents="none"
        >
          <ThemedText
            variant="displayLarge"
            style={[scan.verdictLabel, { color: config.color }]}
          >
            {config.label}
          </ThemedText>
          <ThemedText
            variant="bodySmall"
            style={{ color: config.color, marginTop: 4, textAlign: 'center' }}
            numberOfLines={2}
          >
            {flashName}
          </ThemedText>
        </Animated.View>
      )}

      {/* Bottom bar */}
      <View style={[scan.bottomBar, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <ThemedText variant="bodySmall" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: Spacing.md }}>
          Pointez la caméra sur un code-barres
        </ThemedText>
        <Pressable
          onPress={onFinish}
          style={({ pressed }) => [scan.finishBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <ThemedText variant="labelLarge" style={{ color: Colors.accentDark }}>
            Terminer ({results.length} produit{results.length > 1 ? 's' : ''})
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Phase 3 — Résumé ────────────────────────────────────────────────────────

function PhaseSummary({
  results,
  theme,
  onShare,
  onRestart,
}: {
  results: PartyResult[];
  theme: Theme;
  onShare: () => void;
  onRestart: () => void;
}) {
  const insets = useSafeAreaInsets();
  const total = results.length;
  const safe = results.filter((r) => r.verdict === 'safe').length;
  const caution = results.filter((r) => r.verdict === 'caution').length;
  const danger = results.filter((r) => r.verdict === 'danger').length;
  const themeLabel = THEMES.find((t) => t.id === theme)?.label ?? theme;

  const pct = (n: number) => (total > 0 ? n / total : 0);

  return (
    <View style={[sum.root, { backgroundColor: Colors.background }]}>
      <View style={[sum.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Pressable onPress={() => router.back()} style={sum.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.textSecondary} />
        </Pressable>
        <ThemedText variant="labelLarge" color="textPrimary">Résultats · {themeLabel}</ThemedText>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[sum.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Score hero */}
        <LinearGradient
          colors={[Colors.accentLight, Colors.accent]}
          style={sum.scoreHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ThemedText variant="displayLarge" style={{ color: '#fff', textAlign: 'center' }}>
            {safe}/{total}
          </ThemedText>
          <ThemedText variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 4 }}>
            produits compatibles
          </ThemedText>
        </LinearGradient>

        {/* Visual bar */}
        <Card padding={Spacing.xl} style={sum.card}>
          <ThemedText variant="labelLarge" color="textPrimary" style={{ marginBottom: Spacing.lg }}>
            Composition du scan
          </ThemedText>
          <View style={sum.bigBar}>
            {safe > 0 && (
              <View style={[sum.barSeg, { flex: safe, backgroundColor: Colors.safe }]} />
            )}
            {caution > 0 && (
              <View style={[sum.barSeg, { flex: caution, backgroundColor: Colors.caution }]} />
            )}
            {danger > 0 && (
              <View style={[sum.barSeg, { flex: danger, backgroundColor: Colors.danger }]} />
            )}
          </View>
          <View style={sum.legend}>
            <View style={sum.legendItem}>
              <View style={[sum.legendDot, { backgroundColor: Colors.safe }]} />
              <ThemedText variant="bodySmall" color="textSecondary">{safe} sûrs</ThemedText>
            </View>
            <View style={sum.legendItem}>
              <View style={[sum.legendDot, { backgroundColor: Colors.caution }]} />
              <ThemedText variant="bodySmall" color="textSecondary">{caution} vigilance</ThemedText>
            </View>
            <View style={sum.legendItem}>
              <View style={[sum.legendDot, { backgroundColor: Colors.danger }]} />
              <ThemedText variant="bodySmall" color="textSecondary">{danger} à éviter</ThemedText>
            </View>
          </View>
        </Card>

        {/* Product list */}
        <Card padding={Spacing.xl} style={sum.card}>
          <ThemedText variant="labelLarge" color="textPrimary" style={{ marginBottom: Spacing.md }}>
            Tous les produits
          </ThemedText>
          <View style={{ gap: Spacing.sm }}>
            {results.map((r, i) => {
              const conf = VERDICT_CONFIG[r.verdict];
              return (
                <View key={`${r.barcode}-${i}`} style={sum.productRow}>
                  <View style={[sum.productDot, { backgroundColor: conf.bg }]}>
                    <Feather
                      name={r.verdict === 'safe' ? 'check' : r.verdict === 'danger' ? 'x' : 'alert-circle'}
                      size={14}
                      color={conf.color}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="labelLarge" color="textPrimary" numberOfLines={1}>{r.name}</ThemedText>
                    <ThemedText variant="bodySmall" color="textTertiary">{r.brand}</ThemedText>
                  </View>
                  <View style={[sum.verdictChip, { backgroundColor: conf.bg }]}>
                    <ThemedText variant="labelSmall" style={{ color: conf.color }}>{conf.label}</ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Actions */}
        <View style={sum.actions}>
          <View>
            <Button variant="primary" fullWidth onPress={onShare}>
              Partager les résultats
            </Button>
          </View>
          <View style={{ marginTop: Spacing.md }}>
            <Button variant="ghost" fullWidth onPress={onRestart}>
              Nouveau scan party
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Export card (captured by ViewShot) ──────────────────────────────────────

function ExportCard({
  results,
  theme,
}: {
  results: PartyResult[];
  theme: Theme;
}) {
  const total = results.length;
  const safe = results.filter((r) => r.verdict === 'safe').length;
  const caution = results.filter((r) => r.verdict === 'caution').length;
  const danger = results.filter((r) => r.verdict === 'danger').length;
  const themeLabel = THEMES.find((t) => t.id === theme)?.label ?? theme;

  return (
    <LinearGradient
      colors={['#2D2926', '#1a1714', '#2D2926']}
      style={exp.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <View style={exp.header}>
        <View style={exp.logoBadge}>
          <ThemedText style={exp.logoText}>Hēlo</ThemedText>
        </View>
        <View style={exp.headerRight}>
          <ThemedText style={exp.partLabel}>SCAN PARTY</ThemedText>
          <ThemedText style={exp.themeLabel}>{themeLabel}</ThemedText>
        </View>
      </View>

      {/* Score */}
      <View style={exp.scoreBlock}>
        <ThemedText style={exp.scoreMain}>{safe}<ThemedText style={exp.scoreSlash}>/{total}</ThemedText></ThemedText>
        <ThemedText style={exp.scoreLabel}>produits compatibles</ThemedText>
      </View>

      {/* Bar */}
      <View style={exp.barWrap}>
        <View style={exp.bar}>
          {safe > 0 && <View style={[exp.barSeg, { flex: safe, backgroundColor: Colors.safe }]} />}
          {caution > 0 && <View style={[exp.barSeg, { flex: caution, backgroundColor: Colors.caution }]} />}
          {danger > 0 && <View style={[exp.barSeg, { flex: danger, backgroundColor: Colors.danger }]} />}
        </View>
        <View style={exp.barLegend}>
          <ThemedText style={exp.legendTxt}>{safe} ✓ sûrs</ThemedText>
          <ThemedText style={[exp.legendTxt, { color: Colors.caution }]}>{caution} ⚠ vigilance</ThemedText>
          <ThemedText style={[exp.legendTxt, { color: Colors.danger }]}>{danger} ✗ à éviter</ThemedText>
        </View>
      </View>

      {/* Product list (max 8) */}
      <View style={exp.list}>
        {results.slice(0, 8).map((r, i) => {
          const conf = VERDICT_CONFIG[r.verdict];
          return (
            <View key={`exp-${i}`} style={exp.listRow}>
              <ThemedText style={[exp.listDot, { color: conf.color }]}>
                {r.verdict === 'safe' ? '✓' : r.verdict === 'danger' ? '✗' : '⚠'}
              </ThemedText>
              <ThemedText style={exp.listName} numberOfLines={1}>{r.name}</ThemedText>
              <ThemedText style={[exp.listVerdict, { color: conf.color }]}>{conf.label}</ThemedText>
            </View>
          );
        })}
        {results.length > 8 && (
          <ThemedText style={exp.listMore}>+ {results.length - 8} autres produits</ThemedText>
        )}
      </View>

      {/* Watermark */}
      <View style={exp.watermark}>
        <ThemedText style={exp.watermarkText}>Analysé avec Hēlo · L'app grossesse</ThemedText>
      </View>
    </LinearGradient>
  );
}

// ─── Paywall Modal ────────────────────────────────────────────────────────────

function PaywallModal({ onClose, onUnlock }: { onClose: () => void; onUnlock: () => void }) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={pay.overlay}>
        <View style={pay.sheet}>
          <View style={pay.handle} />
          <ThemedText style={pay.emoji}>👑</ThemedText>
          <ThemedText variant="headlineLarge" color="textPrimary" style={pay.title}>
            Scan Party Premium
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={pay.body}>
            Vous avez utilisé votre session gratuite. Débloquez Scan Party en illimité avec Hēlo Premium.
          </ThemedText>
          <View style={pay.features}>
            {[
              'Sessions Scan Party illimitées',
              'Export image haute résolution',
              'Historique des parties',
              'Accès prioritaire aux nouvelles fonctions',
            ].map((f) => (
              <View key={f} style={pay.featureRow}>
                <Feather name="check-circle" size={16} color={Colors.safe} />
                <ThemedText variant="bodyMedium" color="textPrimary" style={{ marginLeft: Spacing.sm }}>
                  {f}
                </ThemedText>
              </View>
            ))}
          </View>
          <View style={{ marginTop: Spacing.xxl }}>
            <Button variant="primary" fullWidth onPress={onUnlock}>
              Essayer Premium — 4,99 €/mois
            </Button>
          </View>
          <View style={{ marginTop: Spacing.md }}>
            <Button variant="ghost" fullWidth onPress={onClose}>
              Pas maintenant
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ScanPartyScreen() {
  const { trimester } = useProfile();
  const [phase, setPhase] = useState<Phase>('config');
  const [selectedTheme, setSelectedTheme] = useState<Theme>('libre');
  const [results, setResults] = useState<PartyResult[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  const handleStart = useCallback(async () => {
    const used = await AsyncStorage.getItem(PARTY_USED_KEY);
    if (used === 'true') {
      setShowPaywall(true);
      return;
    }
    setResults([]);
    setPhase('scan');
  }, []);

  const handleScanResult = useCallback((r: PartyResult) => {
    setResults((prev) => {
      // Avoid duplicate barcodes
      if (prev.some((p) => p.barcode === r.barcode)) return prev;
      return [...prev, r];
    });
  }, []);

  const handleFinish = useCallback(async () => {
    await AsyncStorage.setItem(PARTY_USED_KEY, 'true');
    setPhase('summary');
  }, []);

  const handleShare = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Export', 'Le partage d\'image n\'est pas disponible sur web.');
      return;
    }
    try {
      setPhase('export');
      // Wait a tick so the export view renders
      await new Promise((r) => setTimeout(r, 200));
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error('Capture failed');
      setPhase('summary');
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Partager mon Scan Party' });
      } else {
        Alert.alert('Partage non disponible', 'Votre appareil ne supporte pas le partage d\'images.');
      }
    } catch (e) {
      setPhase('summary');
      Alert.alert('Erreur', 'Impossible de générer l\'image. Réessayez.');
    }
  }, []);

  const handleRestart = useCallback(async () => {
    const used = await AsyncStorage.getItem(PARTY_USED_KEY);
    if (used === 'true') {
      setShowPaywall(true);
      return;
    }
    setResults([]);
    setPhase('config');
  }, []);

  const handleUnlockPremium = useCallback(() => {
    // Payment flow is handled by the Paywall screen via RevenueCat (purchases.ts)
    Alert.alert('Premium', 'La fonctionnalité de paiement sera disponible prochainement.');
    setShowPaywall(false);
  }, []);

  return (
    <>
      {phase === 'config' && (
        <PhaseConfig
          onStart={handleStart}
          selectedTheme={selectedTheme}
          onSelectTheme={setSelectedTheme}
        />
      )}

      {phase === 'scan' && (
        <PhaseScan
          theme={selectedTheme}
          results={results}
          onScanResult={handleScanResult}
          onFinish={handleFinish}
          trimester={trimester ?? 2}
        />
      )}

      {(phase === 'summary' || phase === 'export') && (
        <PhaseSummary
          results={results}
          theme={selectedTheme}
          onShare={handleShare}
          onRestart={handleRestart}
        />
      )}

      {/* Hidden export view captured by ViewShot */}
      {phase === 'export' && (
        <View style={exp.captureWrap} pointerEvents="none">
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1, width: 1080, height: 1920 }}
          >
            <ExportCard results={results} theme={selectedTheme} />
          </ViewShot>
        </View>
      )}

      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          onUnlock={handleUnlockPremium}
        />
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cfg = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    backgroundColor: Colors.accent, borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs,
  },
  scrollContent: { paddingHorizontal: Spacing.xl, gap: Spacing.xxl, paddingBottom: 40 },
  heroWrap: { borderRadius: Radius.xl, overflow: 'hidden', ...Shadows.medium },
  heroGradient: { padding: Spacing.xxl, alignItems: 'center', borderRadius: Radius.xl },
  heroEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  counterCard: { alignItems: 'center' },
  section: {},
  sectionTitle: { marginBottom: Spacing.md },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  themeCard: {
    flex: 1, minWidth: '44%', alignItems: 'center',
    padding: Spacing.lg, borderRadius: Radius.lg,
    backgroundColor: Colors.surface, borderWidth: 1.5,
    borderColor: Colors.borderLight, ...Shadows.soft,
  },
  themeCardActive: {
    borderColor: Colors.accent, backgroundColor: Colors.accentLight,
  },
  themeEmoji: { fontSize: 28 },
  startWrap: { alignItems: 'center' },
  startBtn: { borderRadius: Radius.full, overflow: 'hidden', ...Shadows.elevated },
  startBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 18, paddingHorizontal: 48,
    borderRadius: Radius.full,
  },
  startBtnLabel: { ...Typography.labelLarge, color: '#fff', fontSize: 18 },
});

const scan = StyleSheet.create({
  permRoot: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.xxl,
  },
  topOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.lg,
  },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: Spacing.sm,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  partBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderWidth: 1, borderColor: Colors.accent,
  },
  counterBubble: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  vf: {
    position: 'absolute',
    top: H * 0.28,
    left: (W - 260) / 2,
    width: 260,
    height: 260,
  },
  corner: {
    position: 'absolute', width: 22, height: 22,
    borderColor: Colors.accent,
  },
  corner_tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  corner_tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  corner_bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  corner_br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
  verdictFlash: {
    position: 'absolute',
    top: '30%', left: Spacing.xxl, right: Spacing.xxl,
    borderRadius: Radius.xl, padding: Spacing.xxl,
    alignItems: 'center', ...Shadows.elevated,
  },
  verdictLabel: { textAlign: 'center', letterSpacing: 1 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  finishBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: Radius.full,
  },
});

// ─── Typed corner position map (avoids `as any` for dynamic key access) ───────
type CornerPos = 'tl' | 'tr' | 'bl' | 'br';
const CORNER_STYLES: Record<CornerPos, object> = {
  tl: scan.corner_tl,
  tr: scan.corner_tr,
  bl: scan.corner_bl,
  br: scan.corner_br,
};

const sum = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, gap: Spacing.xl },
  scoreHero: {
    borderRadius: Radius.xl, padding: Spacing.xxxl,
    alignItems: 'center', ...Shadows.medium,
  },
  card: { ...Shadows.soft },
  bigBar: {
    flexDirection: 'row', height: 14, borderRadius: Radius.full,
    overflow: 'hidden', backgroundColor: Colors.borderLight,
  },
  barSeg: { height: 14 },
  legend: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  productRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  productDot: {
    width: 30, height: 30, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  verdictChip: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  actions: { marginTop: Spacing.sm },
});

const exp = StyleSheet.create({
  captureWrap: {
    position: 'absolute', top: 0, left: -9999,
    width: 1080 / 2, opacity: 0,
  },
  card: {
    width: 1080 / 2, minHeight: 1920 / 2,
    padding: 40, justifyContent: 'flex-start',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 40,
  },
  logoBadge: {
    backgroundColor: Colors.accent, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  logoText: { ...Typography.labelLarge, color: '#fff', fontSize: 18 },
  headerRight: { alignItems: 'flex-end' },
  partLabel: { ...Typography.labelSmall, color: Colors.accent, letterSpacing: 2 },
  themeLabel: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  scoreBlock: { alignItems: 'center', marginVertical: 32 },
  scoreMain: { fontSize: 72, fontWeight: '700', color: '#fff', fontFamily: 'PlusJakartaSans_700Bold' },
  scoreSlash: { fontSize: 48, color: 'rgba(255,255,255,0.5)' },
  scoreLabel: { ...Typography.bodyMedium, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  barWrap: { marginBottom: 32 },
  bar: {
    flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 12,
  },
  barSeg: { height: 10 },
  barLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendTxt: { ...Typography.bodySmall, color: Colors.safe },
  list: { gap: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listDot: { fontSize: 16, width: 20 },
  listName: {
    flex: 1, ...Typography.bodySmall, color: 'rgba(255,255,255,0.85)',
  },
  listVerdict: { ...Typography.labelSmall, fontSize: 9 },
  listMore: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  watermark: { marginTop: 'auto', paddingTop: 32, alignItems: 'center' },
  watermarkText: { ...Typography.labelSmall, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 },
});

const pay = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl, padding: Spacing.xxl, paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: Spacing.xl,
  },
  emoji: { fontSize: 40, textAlign: 'center', marginBottom: Spacing.lg },
  title: { textAlign: 'center', marginBottom: Spacing.md },
  body: { textAlign: 'center', marginBottom: Spacing.xl },
  features: { gap: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
});
