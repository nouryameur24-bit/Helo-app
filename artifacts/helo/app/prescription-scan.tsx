// ─── Scanner d'ordonnance — Hēlo ─────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { processOCRImage } from '@/lib/ocr';
import { extractMedications, checkMedications } from '@/lib/prescription';
import { PREMIUM_KEY } from '@/lib/purchases';
import { useTrimester } from '@/hooks/useTrimester';
import { getBreastfeedingMode } from '@/hooks/useBreastfeeding';
import type { Phase } from '@/types';

const { width: W, height: H } = Dimensions.get('window');

const VF_W = W - 40;
const VF_H = Math.min(Math.round(VF_W * 1.41), H * 0.52); // A4 ratio ~1.41
const VF_Y = H * 0.16;

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = '#C9A96E';

function CornerMarks({ w, h }: { w: number; h: number }) {
  const c = { position: 'absolute' as const, width: CORNER_SIZE, height: CORNER_SIZE };
  const border = { borderColor: CORNER_COLOR, borderWidth: CORNER_THICKNESS };
  return (
    <>
      <View style={[c, { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR }]} />
      <View style={[c, { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR }]} />
      <View style={[c, { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR }]} />
      <View style={[c, { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR }]} />
    </>
  );
}

function ShutterButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.shutter, disabled && { opacity: 0.4 }]}
    >
      <View style={styles.shutterInner} />
    </TouchableOpacity>
  );
}

export default function PrescriptionScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { trimester } = useTrimester();

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isProcessing) return;
    setError(null);
    setIsProcessing(true);

    try {
      const premiumRaw = await AsyncStorage.getItem(PREMIUM_KEY);
      const isPremium = premiumRaw === 'true';
      if (!isPremium) {
        router.replace('/paywall' as never);
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.85 });
      if (!photo?.base64) throw new Error('NO_PHOTO');

      const ocrText = await processOCRImage(photo.base64);
      const medications = extractMedications(ocrText);

      const isBF = await getBreastfeedingMode();
      const phase: Phase = isBF ? 'breastfeeding' : trimester;

      const results = await checkMedications(medications, phase);

      const encoded = encodeURIComponent(JSON.stringify(results));
      router.push(`/prescription-results?results=${encoded}` as never);
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg === 'NO_TEXT_DETECTED') {
        setError("Aucun texte détecté. Assurez-vous que l'ordonnance est bien éclairée et lisible.");
      } else if (msg.startsWith('NO_API_KEY')) {
        setError('Clé Google Vision manquante.');
      } else if (msg === 'NO_PHOTO') {
        setError("Impossible de prendre la photo. Réessayez.");
      } else {
        setError("Une erreur est survenue lors de l'analyse. Réessayez.");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, trimester]);

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.permissionRoot, { paddingTop: insets.top + Spacing.xl }]}>
        <Feather name="camera-off" size={48} color={Colors.textTertiary} />
        <ThemedText variant="headlineMedium" color="textPrimary" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
          Accès à la caméra requis
        </ThemedText>
        <ThemedText variant="bodyMedium" color="textTertiary" style={{ marginTop: Spacing.md, textAlign: 'center', paddingHorizontal: Spacing.xl }}>
          Hēlo a besoin de votre caméra pour photographier votre ordonnance.
        </ThemedText>
        <View style={{ marginTop: Spacing.xl }}>
          <Button onPress={() => { requestPermission(); }}>Autoriser la caméra</Button>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.lg }}>
          <ThemedText variant="bodyMedium" color="textTertiary">Retour</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      {/* Dim overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* top strip */}
        <View style={[styles.dimStrip, { height: VF_Y }]} />
        {/* middle row */}
        <View style={{ flexDirection: 'row', height: VF_H }}>
          <View style={[styles.dimStrip, { width: (W - VF_W) / 2, height: VF_H }]} />
          <View style={{ width: VF_W, height: VF_H }}>
            <CornerMarks w={VF_W} h={VF_H} />
          </View>
          <View style={[styles.dimStrip, { width: (W - VF_W) / 2, height: VF_H }]} />
        </View>
        {/* bottom strip */}
        <View style={[styles.dimStrip, { flex: 1 }]} />
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Ordonnance</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Hint text */}
      <View style={[styles.hintWrapper, { top: VF_Y + VF_H + Spacing.xl }]} pointerEvents="none">
        <View style={styles.hintPill}>
          <Text style={styles.hintText}>Photographiez votre ordonnance complète</Text>
        </View>
      </View>

      {/* Error toast */}
      {error && (
        <View style={[styles.errorToast, { top: VF_Y + VF_H + 56 }]}>
          <Feather name="alert-circle" size={14} color="#fff" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Shutter zone */}
      <View style={[styles.shutterZone, { bottom: insets.bottom + Spacing.xl }]}>
        {isProcessing ? (
          <View style={styles.processingPill}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.processingText}>Analyse en cours…</Text>
          </View>
        ) : (
          <ShutterButton onPress={handleCapture} disabled={isProcessing} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  permissionRoot: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  dimStrip: { backgroundColor: 'rgba(0,0,0,0.55)' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    zIndex: 10,
  },
  topTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: Typography.labelLarge.fontSize,
    letterSpacing: 0.3,
    color: '#fff',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  hintPill: {
    backgroundColor: 'rgba(45,41,38,0.72)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  hintText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.2,
  },
  errorToast: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    backgroundColor: Colors.danger,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    zIndex: 20,
  },
  errorText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: '#fff',
    flex: 1,
  },
  shutterZone: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  processingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(45,41,38,0.85)',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.full,
  },
  processingText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: '#fff',
  },
});
