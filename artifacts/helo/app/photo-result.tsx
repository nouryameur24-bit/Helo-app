/**
 * app/photo-result.tsx — Photo scan identification intermediate screen
 *
 * Receives a base64 image, calls Claude Vision to identify the product,
 * runs ingredient matching, stores result in AsyncStorage, then navigates
 * to the verdict screen. Shows a loader during identification and an error
 * screen on failure.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { identifyProduct } from '@/lib/visionScan';
import { matchIngredients, getVerdict } from '@/lib/productLookup';
import { STORAGE_KEYS } from '@/lib/storageKeys';

const PHOTO_SCAN_KEY = STORAGE_KEYS.photoScanResult;

function PulsingLoader() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 900 }),
        withTiming(1, { duration: 900 }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(0.6, { duration: 900 }),
      ),
      -1,
      false,
    );
  }, [scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.loaderRoot}>
      <Animated.View style={[styles.loaderCircle, style]} />
      <ThemedText variant="headlineMedium" style={styles.loaderTitle}>
        Identification en cours…
      </ThemedText>
      <ThemedText variant="bodyMedium" color="textSecondary" style={styles.loaderSubtitle}>
        Claude analyse votre photo pour identifier le produit
      </ThemedText>
    </View>
  );
}

export default function PhotoResultScreen() {
  const { base64 } = useLocalSearchParams<{ base64: string }>();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!base64 || hasRun.current) return;
    hasRun.current = true;

    async function identify() {
      try {
        const imageBase64 = decodeURIComponent(base64 as string);
        const product = await identifyProduct(imageBase64);

        const matches = await matchIngredients(product.ingredientsList, 2);
        const verdict = getVerdict(matches);

        const result = { product, matches, verdict };
        await AsyncStorage.setItem(PHOTO_SCAN_KEY, JSON.stringify(result));

        router.replace('/verdict/photo-scan');
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Une erreur est survenue lors de l'identification. Réessayez.";
        setError(message);
      }
    }

    identify();
  }, [base64]);

  const handleRetry = () => {
    router.back();
  };

  if (error) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }]}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          <ThemedText variant="bodyMedium" style={{ marginLeft: 8 }}>Retour</ThemedText>
        </TouchableOpacity>

        <View style={styles.errorCenter}>
          <View style={styles.errorIcon}>
            <Feather name="camera-off" size={36} color={Colors.danger} />
          </View>

          <ThemedText variant="headlineMedium" style={styles.errorTitle}>
            Identification échouée
          </ThemedText>

          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.errorBody}>
            {error}
          </ThemedText>

          <View style={styles.errorActions}>
            <Button variant="primary" fullWidth onPress={handleRetry}>
              Réessayer
            </Button>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <PulsingLoader />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loaderRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
  },
  loaderCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentLight,
  },
  loaderTitle: {
    textAlign: 'center',
  },
  loaderSubtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xl,
  },
  errorCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  errorBody: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  errorActions: {
    width: '100%',
    gap: Spacing.md,
  },
});
