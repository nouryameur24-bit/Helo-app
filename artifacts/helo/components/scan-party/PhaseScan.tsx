import React, { useCallback, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { fetchProductByBarcode, getVerdict, matchIngredients } from '@/lib/productLookup';
import { scan, CORNER_STYLES } from './scanPartyStyles';
import { VERDICT_CONFIG, DEBOUNCE_MS, type Theme, type VerdictType, type PartyResult } from './scanPartyTypes';
import { THEMES } from './scanPartyTypes';

interface PhaseScanProps {
  theme: Theme;
  results: PartyResult[];
  onScanResult: (r: PartyResult) => void;
  onFinish: () => void;
  trimester: number;
}

function PhaseScan({ theme, results, onScanResult, onFinish, trimester }: PhaseScanProps) {
  const insets = useSafeAreaInsets();
  const lastBarcode = useRef<string>('');
  const lastScanTime = useRef<number>(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

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
    if (barcode === lastBarcode.current && now - lastScanTime.current < DEBOUNCE_MS) return;
    if (scanning) return;
    lastBarcode.current = barcode;
    lastScanTime.current = now;
    setScanning(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const product = await fetchProductByBarcode(barcode);
      if (!product) { setScanning(false); return; }
      const matches = await matchIngredients(product.ingredientsList, trimester as 1 | 2 | 3);
      const { verdict } = getVerdict(matches);
      const result: PartyResult = { barcode, name: product.name, brand: product.brand ?? '', verdict };
      onScanResult(result);
      showVerdictFlash(verdict, product.name);
      Haptics.notificationAsync(
        verdict === 'safe' ? Haptics.NotificationFeedbackType.Success :
        verdict === 'danger' ? Haptics.NotificationFeedbackType.Error :
        Haptics.NotificationFeedbackType.Warning,
      );
    } catch {}
    finally { setTimeout(() => setScanning(false), DEBOUNCE_MS); }
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
      <View style={[scan.topOverlay, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={scan.topBar}>
          <Pressable onPress={() => router.back()} style={scan.closeBtn} accessibilityRole="button" accessibilityLabel="Fermer">
            <Feather name="x" size={20} color="#fff" />
          </Pressable>
          <View style={scan.partBadge}>
            <Feather name="zap" size={12} color={Colors.accent} />
            <ThemedText variant="labelSmall" style={{ color: Colors.accent, marginLeft: 4 }}>
              SCAN PARTY · {themeLabel.toUpperCase()}
            </ThemedText>
          </View>
          <View style={scan.counterBubble}>
            <ThemedText variant="headlineMedium" style={{ color: '#fff' }}>{results.length}</ThemedText>
          </View>
        </View>
      </View>
      <View style={scan.vf}>
        {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
          <View key={pos} style={[scan.corner, CORNER_STYLES[pos]]} />
        ))}
      </View>
      {config && (
        <Animated.View style={[scan.verdictFlash, { backgroundColor: config.bg }, verdictStyle]} pointerEvents="none">
          <ThemedText variant="displayLarge" style={[scan.verdictLabel, { color: config.color }]}>{config.label}</ThemedText>
          <ThemedText variant="bodySmall" style={{ color: config.color, marginTop: 4, textAlign: 'center' }} numberOfLines={2}>
            {flashName}
          </ThemedText>
        </Animated.View>
      )}
      <View style={[scan.bottomBar, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <ThemedText variant="bodySmall" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: Spacing.md }}>
          Pointez la caméra sur un code-barres
        </ThemedText>
        <Pressable
          onPress={onFinish}
          style={({ pressed }) => [scan.finishBtn, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={`Terminer le scan, ${results.length} produit scanné`}
        >
          <ThemedText variant="labelLarge" style={{ color: Colors.accentDark }}>
            Terminer ({results.length} produit{results.length > 1 ? 's' : ''})
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

export default React.memo(PhaseScan);
