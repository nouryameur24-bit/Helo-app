import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ScanDisclaimerBanner } from '@/components/ScanDisclaimerBanner';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { useScan } from '@/hooks/useScan';

export default function VerdictScreen() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const barcode = decodeURIComponent(scanId ?? '');
  const insets = useSafeAreaInsets();
  const { loading, product, verdict, error, scanBarcode } = useScan();

  useEffect(() => {
    if (barcode) scanBarcode(barcode);
  }, [barcode]); // eslint-disable-line react-hooks/exhaustive-deps

  const verdictColor =
    verdict?.verdict === 'danger'
      ? Colors.danger
      : verdict?.verdict === 'caution'
      ? Colors.caution
      : Colors.safe;

  const verdictLabel =
    verdict?.verdict === 'danger'
      ? 'À éviter'
      : verdict?.verdict === 'caution'
      ? 'Précaution'
      : 'Compatible';

  const verdictIcon =
    verdict?.verdict === 'danger'
      ? 'x-circle'
      : verdict?.verdict === 'caution'
      ? 'alert-circle'
      : 'check-circle';

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg },
      ]}
    >
      {/* Back button */}
      <View style={styles.topBar}>
        <Button variant="ghost" onPress={() => router.back()}>
          ← Retour
        </Button>
        <ThemedText variant="bodySmall" color="textTertiary">
          {barcode}
        </ThemedText>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.lg }}>
            Analyse en cours…
          </ThemedText>
        </View>
      )}

      {/* Error */}
      {!loading && error && (
        <View style={styles.centerContent}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.dangerLight }]}>
            <Feather name="search" size={32} color={Colors.danger} />
          </View>
          <ThemedText variant="headlineMedium" style={{ textAlign: 'center', marginTop: Spacing.lg }}>
            Produit introuvable
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.sm }}>
            {error}
          </ThemedText>
          <View style={{ marginTop: Spacing.xl, width: '100%' }}>
            <Button variant="primary" fullWidth onPress={() => router.back()}>
              Scanner un autre produit
            </Button>
          </View>
        </View>
      )}

      {/* Verdict */}
      {!loading && !error && verdict && product && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.centerContent}>
          <View style={[styles.iconCircle, { backgroundColor: `${verdictColor}22` }]}>
            <Feather name={verdictIcon as 'check-circle'} size={48} color={verdictColor} />
          </View>
          <ThemedText
            variant="displayMedium"
            style={{ color: verdictColor, marginTop: Spacing.xl, textAlign: 'center' }}
          >
            {verdictLabel}
          </ThemedText>
          <ThemedText
            variant="headlineMedium"
            style={{ textAlign: 'center', marginTop: Spacing.sm }}
          >
            {product.name}
          </ThemedText>
          {product.brand ? (
            <ThemedText variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center' }}>
              {product.brand}
            </ThemedText>
          ) : null}

          {verdict.flaggedIngredients.length > 0 && (
            <View style={styles.flaggedBox}>
              <ThemedText variant="labelSmall" color="textTertiary">
                INGRÉDIENTS SIGNALÉS
              </ThemedText>
              {verdict.flaggedIngredients.slice(0, 5).map((m) => (
                <ThemedText
                  key={m.ingredientName}
                  variant="bodySmall"
                  style={{
                    color: m.riskLevel === 'danger' ? Colors.danger : Colors.caution,
                    marginTop: 4,
                  }}
                >
                  • {m.ingredientName}
                </ThemedText>
              ))}
              {verdict.flaggedIngredients.length > 5 && (
                <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 4 }}>
                  + {verdict.flaggedIngredients.length - 5} autres
                </ThemedText>
              )}
            </View>
          )}

          <View style={{ marginTop: Spacing.xxl, width: '100%', gap: Spacing.md }}>
            <Button variant="primary" fullWidth onPress={() => router.back()}>
              Scanner un autre produit
            </Button>
          </View>

          <View style={{ width: '100%', marginTop: Spacing.lg }}>
            <ScanDisclaimerBanner />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.huge,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flaggedBox: {
    marginTop: Spacing.xl,
    width: '100%',
    padding: Spacing.lg,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    gap: 2,
  },
});
