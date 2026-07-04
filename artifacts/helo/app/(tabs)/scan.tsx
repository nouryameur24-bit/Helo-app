import { styles } from './scanStyles';
import { swallow, swallowAs } from '@/lib/swallow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROUTES } from '@/types/routes';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { IconButton } from '@/components/ui/IconButton';
import { PulsingHelpButton } from '@/components/ui/PulsingHelpButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { useOffline } from '@/hooks/useOffline';
import { useProfile } from '@/hooks/useProfile';
import { usePremium } from '@/hooks/usePremium';
import { analyzeMenu } from '@/lib/restaurant';
import { onProductScanned } from '@/lib/pact';
import { track } from '@/lib/analytics';

import {
  BARCODE_TYPES,
  DEBOUNCE_MS,
  MAX_MENU_PHOTOS,
  SCREEN_W,
  type ScanMode,
  VF_BARCODE_H,
  VF_BARCODE_W,
  VF_BARCODE_Y,
  VF_MENU_H,
  VF_MENU_W,
  VF_MENU_Y,
  VF_OCR_H,
  VF_OCR_W,
  VF_OCR_Y,
  VF_PHOTO_H,
  VF_PHOTO_W,
  VF_PHOTO_Y,
} from '@/components/scan/scanConstants';
import { FlashingViewfinder, ScanOverlay } from '@/components/scan/ScanViewfinder';
import { ModeChip, ShutterButton } from '@/components/scan/ScanControls';
import { MoreScanModesSheet, type ScanModeOption } from '@/components/scan/MoreScanModesSheet';

import { FeatureDiscoverySheet } from '@/components/ui/FeatureDiscoverySheet';
import { useFeatureDiscovery } from '@/hooks/useFeatureDiscovery';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import {
  OfflineBadge,
  PermissionScreen,
  SyncToast,
  WebPlaceholder,
} from '@/components/scan/ScanStatusUI';

const MENU_RESULT_KEY = STORAGE_KEYS.menuResult;

// Route-param signal: when verdict's "Photographier la composition" CTA is
// tapped it navigates to `/(tabs)/scan?ghostMode=1&ghostBarcode=...`. On the
// next focus we consume the param ONCE (via a ref guard) to flip into OCR
// mode. Every other focus (tab switch, back-from-modal, foreground) defaults
// to barcode mode. No module-level mutable state — survives Fast Refresh,
// works across multiple Scan tab instances, and is testable.

export default function ScanScreen() {
  // First-use discovery sheets — barcode auto-shows on mount; the other modes
  // trigger when their chip is tapped for the first time.
  const fdBarcode = useFeatureDiscovery('barcode');
  const fdOcr = useFeatureDiscovery('ocr', { autoShow: false });
  const fdPhoto = useFeatureDiscovery('photo', { autoShow: false });
  const fdRestaurant = useFeatureDiscovery('restaurant', { autoShow: false });
  const fdPrescription = useFeatureDiscovery('prescription', { autoShow: false });

  const { ghostBarcode, ghostMode } = useLocalSearchParams<{
    ghostBarcode?: string;
    ghostMode?: string;
  }>();
  const ghostConsumed = useRef(false);

  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('barcode');
  // Lot 15A3 — Sheet listant les modes secondaires (Ingrédients, Menu,
  // Ordonnance, Photo). Ouvert via le chip "Plus d'options ▼" pour réduire
  // la charge cognitive (avant : 5 chips au même niveau).
  const [moreModesVisible, setMoreModesVisible] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [syncToastVisible, setSyncToastVisible] = useState(false);
  const syncToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastBarcode = useRef<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const flashColor = useSharedValue(0);
  const flashOverlay = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  // Tab bar is rendered with position:"absolute", so screen content extends
  // underneath it. We must offset every bottom-anchored element by the tab
  // bar's intrinsic height (49 on iOS/Android classic, 84 on web).
  const TAB_BAR_H = Platform.OS === 'web' ? 84 : 49;
  const bottomOffset = bottomInset + TAB_BAR_H;

  const { role, linkedFirstName, firstName: scanFirstName } = useProfile();
  const isPartner = role === 'partner';
  const partnerName = linkedFirstName;

  const { isPremium, checkScanLimit, scansRemaining, requirePremium } = usePremium();
  const { isOffline, syncComplete } = useOffline();

  useEffect(() => {
    if (syncComplete) {
      setSyncToastVisible(true);
      if (syncToastTimer.current) clearTimeout(syncToastTimer.current);
      syncToastTimer.current = setTimeout(() => setSyncToastVisible(false), 2500);
    }
  }, [syncComplete]);

  // We deliberately only store the file URI here — not the base64 payload.
  // Base64 strings for camera frames can be 1-5 MB each and crossing the RN
  // bridge / sitting in JS state for several photos at once can OOM on older
  // Android devices. The base64 is read on-demand at analyze time
  // (see analyzeMenu in lib/restaurant.ts).
  const [menuPhotos, setMenuPhotos] = useState<Array<{ uri: string }>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isOCRMode = scanMode === 'ingredients';
  const isMenuMode = scanMode === 'menu';
  const isPhotoMode = scanMode === 'photo';

  const vfW = isOCRMode ? VF_OCR_W : isMenuMode ? VF_MENU_W : isPhotoMode ? VF_PHOTO_W : VF_BARCODE_W;
  const vfH = isOCRMode ? VF_OCR_H : isMenuMode ? VF_MENU_H : isPhotoMode ? VF_PHOTO_H : VF_BARCODE_H;
  const vfY = isOCRMode ? VF_OCR_Y : isMenuMode ? VF_MENU_Y : isPhotoMode ? VF_PHOTO_Y : VF_BARCODE_Y;
  const vfX = (SCREEN_W - vfW) / 2;

  useFocusEffect(
    useCallback(() => {
      setIsActive(true);
      // Consume the Ghost Capture param exactly once per navigation. Every
      // other focus (tab switch, back-from-modal, app foreground) resets to
      // barcode mode.
      if (ghostMode === '1' && !ghostConsumed.current) {
        ghostConsumed.current = true;
        setScanMode('ingredients');
      } else {
        setScanMode('barcode');
      }
      return () => {
        setIsActive(false);
        setTorchOn(false);
        setMenuPhotos([]);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        // CRITICAL : sans ce reset, la ref reste figée sur le dernier code
        // après un blur (navigation vers verdict), et tout re-scan du même
        // produit au retour est rejeté en silence ligne 175.
        lastBarcode.current = null;
        // Reset the one-shot guard so the NEXT Ghost Capture navigation works.
        ghostConsumed.current = false;
      };
    }, [ghostMode]),
  );

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (!data || data === lastBarcode.current || scanMode !== 'barcode') return;
      lastBarcode.current = data;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => { lastBarcode.current = null; }, DEBOUNCE_MS);

      if (!isPremium && !isOffline) {
        // checkScanLimit atomically consumes one slot server-side (with local
        // fallback when offline); no separate incrementScanCount needed.
        const allowed = await checkScanLimit();
        if (!allowed) {
          lastBarcode.current = null;
          return;
        }
      }

      onProductScanned(scanFirstName || '').catch(swallowAs('scan.onProductScanned'));
      track('scan_started', { barcode: data, is_premium: isPremium, is_offline: isOffline }).catch(swallow);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      flashColor.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 300 }),
      );
      setTimeout(() => {
        router.push(`/verdict/${encodeURIComponent(data)}`);
      }, 350);
    },
    [flashColor, scanMode, isPremium, isOffline, checkScanLimit],
  );

  const handleShutter = useCallback(async () => {
    if (takingPhoto || !cameraRef.current) return;
    setTakingPhoto(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    flashOverlay.value = withSequence(
      withTiming(0.5, { duration: 60 }),
      withTiming(0, { duration: 250 }),
    );
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      if (photo?.uri) {
        // Handoff vers ocr-review centralisé (audit module 3 : évite la
        // duplication de la construction d'URL entre le chemin "flou" et le
        // chemin normal ci-dessous).
        const goToOcrReview = () => {
          const ghostParam = ghostBarcode ? `&ghostBarcode=${encodeURIComponent(ghostBarcode)}` : '';
          router.push(`/ocr-review?imageUri=${encodeURIComponent(photo.uri)}&base64=${encodeURIComponent(photo.base64 ?? '')}${ghostParam}`);
        };

        // ── Lot 18-04 : Blur detection heuristique ──────────────────────
        // À qualité 0.8, une photo nette d'une étiquette d'ingrédients
        // produit une base64 de ~150-600 KB. Une photo très floue ou très
        // sombre se compresse beaucoup plus (entropie faible) → base64
        // < 50 KB est un fort indicateur de mauvaise qualité.
        // Heuristique simple mais efficace, no native module required.
        const base64Size = photo.base64?.length ?? 0;
        const BLUR_THRESHOLD_BYTES = 50_000;
        if (base64Size > 0 && base64Size < BLUR_THRESHOLD_BYTES) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(swallow);
          Alert.alert(
            'Photo trop sombre ou floue',
            "Recadre l'étiquette avec plus de lumière et l'appareil bien stable. Tu peux quand même continuer si tu veux.",
            [
              { text: 'Reprendre', style: 'cancel' },
              { text: 'Continuer quand même', style: 'default', onPress: goToOcrReview },
            ],
          );
          return;
        }

        goToOcrReview();
      }
    } catch (err) { swallow(err, 'scan.ocrPhotoCapture'); } finally {
      setTakingPhoto(false);
    }
  }, [takingPhoto, flashOverlay, ghostBarcode]);

  const handleMenuCapture = useCallback(async () => {
    if (takingPhoto || !cameraRef.current || menuPhotos.length >= MAX_MENU_PHOTOS) return;
    setTakingPhoto(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    flashOverlay.value = withSequence(
      withTiming(0.5, { duration: 60 }),
      withTiming(0, { duration: 250 }),
    );
    try {
      // No `base64: true` — we'd otherwise force RN to ship a multi-MB string
      // across the bridge for every shot. URI is enough; we read base64 only
      // at analyze time, one image at a time, then release it.
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.82 });
      if (photo?.uri) {
        setMenuPhotos((prev) => [...prev, { uri: photo.uri }]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) { swallow(err, 'scan.menuPhotoCapture'); } finally {
      setTakingPhoto(false);
    }
  }, [takingPhoto, flashOverlay, menuPhotos.length]);

  const handleMenuAnalyze = useCallback(async () => {
    if (menuPhotos.length === 0 || isAnalyzing) return;
    setIsAnalyzing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uris = menuPhotos.map((p) => p.uri);
      const result = await analyzeMenu(uris);
      await AsyncStorage.setItem(MENU_RESULT_KEY, JSON.stringify(result));
      setMenuPhotos([]);
      router.push('/restaurant-results');
    } catch (err) { swallow(err, 'scan.menuAnalyze'); } finally {
      setIsAnalyzing(false);
    }
  }, [menuPhotos, isAnalyzing]);

  const handlePhotoCapture = useCallback(async () => {
    if (takingPhoto || !cameraRef.current) return;
    if (!isPremium) {
      router.push({ pathname: '/paywall', params: { trigger: 'photo_scan' } });
      return;
    }
    setTakingPhoto(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    flashOverlay.value = withSequence(
      withTiming(0.5, { duration: 60 }),
      withTiming(0, { duration: 250 }),
    );
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      if (photo?.base64) {
        router.push(`/photo-result?base64=${encodeURIComponent(photo.base64)}`);
      }
    } catch (err) { swallow(err, 'scan.photoCapture'); } finally {
      setTakingPhoto(false);
    }
  }, [takingPhoto, flashOverlay, isPremium]);

  const flashOverlayStyle = useAnimatedStyle(() => ({
    opacity: flashOverlay.value,
  }));

  if (Platform.OS === 'web') return <WebPlaceholder />;
  if (!permission) return <View style={[styles.root, { backgroundColor: Colors.background }]} />;
  if (!permission.granted) return (
    <PermissionScreen onRequest={requestPermission} canAskAgain={permission.canAskAgain} />
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {isActive && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torchOn}
          onBarcodeScanned={scanMode === 'barcode' ? handleBarcodeScanned : undefined}
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        />
      )}

      <Animated.View
        style={[StyleSheet.absoluteFill, styles.flashOverlay, flashOverlayStyle]}
        pointerEvents="none"
      />

      <ScanOverlay vfX={vfX} vfY={vfY} vfW={vfW} vfH={vfH} />

      {/* OCR mode guidance label — above the viewfinder, fades in on mode switch.
          Engaging tone to encourage the framing gesture that powers Ghost Capture. */}
      {isOCRMode && (
        <Animated.View
          key="ocr-guidance"
          entering={FadeIn.duration(300)}
          style={[styles.ocrGuidanceWrapper, { top: vfY - 60 }]}
          pointerEvents="none"
        >
          <View style={styles.ocrGuidancePill}>
            <Text style={styles.ocrGuidanceText}>📋 Cadre la liste d'ingrédients</Text>
          </View>
        </Animated.View>
      )}

      <View
        style={[styles.viewfinderContainer, { top: vfY, left: vfX, width: vfW, height: vfH }]}
        pointerEvents="none"
      >
        <FlashingViewfinder flashColor={flashColor} />
      </View>

      <SyncToast visible={syncToastVisible} />

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: topInset + Spacing.sm }]}>
        <View style={styles.topLeft}>
          {isPartner && partnerName ? (
            <View style={styles.partnerBanner}>
              <Feather name="heart" size={14} color={Colors.accent} />
              <Text style={styles.partnerBannerText}>Scanner pour {partnerName}</Text>
            </View>
          ) : (
            <Text style={styles.topTitle}>Scanner</Text>
          )}
          {isOffline && <OfflineBadge />}
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <PulsingHelpButton
            onPress={() => router.push(ROUTES.guide)}
            size={40}
            iconSize={18}
            iconColor="#fff"
            backgroundColor="rgba(255,255,255,0.18)"
            haloColor="#FFFFFF"
          />
          {scanMode === 'barcode' && (
            <IconButton
              onPress={() => router.push(ROUTES.basketScan)}
              backgroundColor="rgba(255,255,255,0.18)"
              size={40}
              accessibilityLabel="Scanner un panier de courses"
            >
              <Feather name="shopping-cart" size={18} color="#fff" />
            </IconButton>
          )}
          <IconButton
            onPress={() => setTorchOn((v) => !v)}
            backgroundColor={torchOn ? Colors.accent : 'rgba(255,255,255,0.18)'}
            size={40}
            accessibilityLabel={torchOn ? 'Éteindre la lampe torche' : 'Allumer la lampe torche'}
          >
            <Feather name={torchOn ? 'zap' : 'zap-off'} size={18} color="#fff" />
          </IconButton>
        </View>
      </View>

      {/* ── Hint pill under viewfinder ── */}
      <View style={[styles.hintWrapper, { top: vfY + vfH + Spacing.xl }]} pointerEvents="none">
        <View style={styles.hintPill}>
          <Text style={styles.hintText}>
            {isOCRMode
              ? "Photographie la liste d'ingrédients"
              : isMenuMode
              ? menuPhotos.length === 0
                ? 'Photographie la première page du menu'
                : `Page ${menuPhotos.length}/${MAX_MENU_PHOTOS} · Ajoute d'autres pages ou analyse`
              : isPhotoMode
              ? 'Photographie la face avant du produit'
              : 'Place le code-barres dans le cadre'}
          </Text>
        </View>
      </View>

      {/* ── OCR shutter ── */}
      {isOCRMode && (
        <View style={[styles.shutterWrapper, { bottom: bottomOffset + 90 }]}>
          <ShutterButton onPress={handleShutter} />
        </View>
      )}

      {/* ── Photo mode shutter ── */}
      {isPhotoMode && (
        <View style={[styles.shutterWrapper, { bottom: bottomOffset + 90 }]}>
          <ShutterButton onPress={handlePhotoCapture} />
        </View>
      )}

      {/* ── Menu mode UI ── */}
      {isMenuMode && (
        <View style={[styles.menuPanel, { bottom: bottomOffset + 78 }]}>
          {menuPhotos.length > 0 && (
            <View style={styles.menuThumbStrip}>
              {menuPhotos.map((photo, i) => (
                <View key={i} style={styles.menuThumb}>
                  <Image source={{ uri: photo.uri }} style={styles.menuThumbImg} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.menuThumbDelete}
                    onPress={() => setMenuPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Retirer la photo ${i + 1}`}
                  >
                    <Feather name="x" size={10} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {menuPhotos.length < MAX_MENU_PHOTOS && (
                <TouchableOpacity
                  style={styles.menuThumbAdd}
                  onPress={handleMenuCapture}
                  disabled={takingPhoto}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Ajouter une page de menu"
                >
                  <Feather name="plus" size={20} color={Colors.accent} />
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={styles.menuButtons}>
            {menuPhotos.length === 0 ? (
              <ShutterButton onPress={handleMenuCapture} />
            ) : (
              <TouchableOpacity
                style={[styles.analyzeBtn, isAnalyzing && { opacity: 0.7 }]}
                onPress={handleMenuAnalyze}
                disabled={isAnalyzing}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={isAnalyzing ? 'Analyse du menu en cours' : 'Analyser le menu'}
              >
                {isAnalyzing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Feather name="search" size={18} color="#fff" />
                )}
                <Text style={styles.analyzeBtnText}>
                  {isAnalyzing ? 'Analyse en cours…' : 'Analyser le menu'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── Free scan counter ── */}
      {!isPremium && (
        <View style={[styles.scanCounterWrap, { bottom: bottomOffset + 132 }]} pointerEvents="none">
          <View
            style={[
              styles.scanCounterPill,
              scansRemaining === 0 && styles.scanCounterPillDanger,
            ]}
          >
            {/* Dot indicators */}
            {scansRemaining > 0 && (
              <View style={styles.scanDots}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.scanDot,
                      i < scansRemaining ? styles.scanDotFilled : styles.scanDotEmpty,
                    ]}
                  />
                ))}
              </View>
            )}
            {scansRemaining === 0 ? (
              <Feather name="lock" size={10} color="rgba(255,120,100,0.9)" />
            ) : (
              <Feather name="zap" size={10} color={Colors.accent} />
            )}
            <ThemedText
              style={[
                styles.scanCounterText,
                scansRemaining === 0 && { color: 'rgba(255,130,110,0.95)' } as TextStyle,
              ]}
            >
              {scansRemaining > 0
                ? `${scansRemaining} scan${scansRemaining > 1 ? 's' : ''} restant${scansRemaining > 1 ? 's' : ''}`
                : 'Limite atteinte · Passer à Premium'}
            </ThemedText>
          </View>
        </View>
      )}

      {/* ── Bottom mode chips (Lot 15A3 — refonte hiérarchique) ──
          Avant : 5 chips au même niveau (Code-barres / Ingrédients / Menu /
          Ordonnance / Photo) → surcharge cognitive pour les newcomers.
          Après : "Code-barres" en primary + "Plus d'options ▼" qui ouvre
          un BottomSheet listant les modes secondaires avec descriptions. */}
      <View style={[styles.bottomBar, { paddingBottom: bottomOffset + Spacing.lg }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <ModeChip
            label="Code-barres"
            active={scanMode === 'barcode'}
            onPress={() => setScanMode('barcode')}
          />
          <ModeChip
            label={
              scanMode === 'ingredients' ? 'Ingrédients ▼' :
              scanMode === 'menu' ? 'Menu ▼' :
              scanMode === 'photo' ? '📷 Photo ▼' :
              'Plus d\'options ▼'
            }
            active={scanMode !== 'barcode'}
            onPress={() => setMoreModesVisible(true)}
          />
        </ScrollView>
        {isMenuMode && menuPhotos.length > 0 && (
          <TouchableOpacity onPress={() => setMenuPhotos([])} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Réinitialiser les photos du menu">
            <Text style={styles.comingSoon}>Réinitialiser les photos</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sheet des modes secondaires — listé avec descriptions claires +
          badge Premium pour le mode photo. */}
      <MoreScanModesSheet
        visible={moreModesVisible}
        onClose={() => setMoreModesVisible(false)}
        currentMode={
          scanMode === 'ingredients' || scanMode === 'menu' || scanMode === 'photo'
            ? (scanMode as ScanModeOption)
            : null
        }
        onSelect={(mode) => {
          if (mode === 'ingredients') {
            setScanMode('ingredients');
            void fdOcr.trigger();
          } else if (mode === 'menu') {
            setScanMode('menu');
            void fdRestaurant.trigger();
          } else if (mode === 'prescription') {
            void fdPrescription.trigger();
            router.push(ROUTES.prescriptionScan);
          } else if (mode === 'photo') {
            if (requirePremium('photo_scan')) return;
            setScanMode('photo');
            void fdPhoto.trigger();
          }
        }}
      />

      {/* Single-sheet arbitration: render only the first visible discovery
          to avoid stacked RN Modals when timers and chip taps overlap. */}
      {(() => {
        const active = [fdBarcode, fdOcr, fdPhoto, fdRestaurant, fdPrescription].find(
          (fd) => fd.visible,
        );
        return active ? <FeatureDiscoverySheet {...active.sheetProps} /> : null;
      })()}
    </View>
  );
}
