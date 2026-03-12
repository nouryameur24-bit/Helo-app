import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { SCAN_DISCLAIMER } from '@/constants/disclaimers';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useScan } from '@/hooks/useScan';
import type { MatchResult, RiskLevel } from '@/types';

// ── Quick test barcodes ─────────────────────────────────────────────────────
const QUICK_TESTS = [
  { label: 'Nutella 400g', barcode: '3017620425400' },
  { label: 'Nivea Crème', barcode: '4005808222919' },
  { label: 'Coca-Cola 1.5L', barcode: '5449000000996' },
  { label: 'Jambon Fleury', barcode: '3297341600009' },
];

function riskLabel(level: RiskLevel): string {
  switch (level) {
    case 'danger':    return 'À éviter';
    case 'caution':   return 'Précaution';
    case 'safe':      return 'Compatible';
    case 'no_signal': return 'Aucun signal';
  }
}

function IngredientRow({ match }: { match: MatchResult }) {
  const nameColor =
    match.riskLevel === 'danger'  ? Colors.danger  :
    match.riskLevel === 'caution' ? Colors.caution :
    match.riskLevel === 'safe'    ? Colors.safe    :
    Colors.textSecondary;

  return (
    <View style={styles.ingredientRow}>
      <ThemedText variant="bodySmall" style={{ color: nameColor, flex: 1 }}>
        {match.ingredientName}
      </ThemedText>
      {(match.riskLevel === 'danger' || match.riskLevel === 'caution' || match.riskLevel === 'safe') && (
        <Badge variant={match.riskLevel}>
          {riskLabel(match.riskLevel)}
        </Badge>
      )}
    </View>
  );
}

export default function TestScanScreen() {
  const [input, setInput] = useState('');
  const { loading, product, matches, verdict, error, fromCache, scanBarcode, clearResult } =
    useScan();

  const handleScan = async () => {
    const barcode = input.trim();
    if (!barcode) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearResult();
    await scanBarcode(barcode);
  };

  const handleQuick = async (barcode: string) => {
    setInput(barcode);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearResult();
    await scanBarcode(barcode);
  };

  const verdictColor =
    verdict?.verdict === 'danger'  ? Colors.danger  :
    verdict?.verdict === 'caution' ? Colors.caution :
    Colors.safe;

  const flagged = matches.filter(
    (m) => m.riskLevel === 'danger' || m.riskLevel === 'caution',
  );
  const others = matches.filter(
    (m) => m.riskLevel !== 'danger' && m.riskLevel !== 'caution',
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText variant="headlineLarge">Test Scanner</ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary">
            Testez le moteur d'analyse Open Food Facts
          </ThemedText>
        </View>

        {/* Input */}
        <Card>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.inputLabel}>
            CODE-BARRES
          </ThemedText>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ex: 3017620425400"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              returnKeyType="search"
              onSubmitEditing={handleScan}
            />
            <TouchableOpacity
              style={[styles.scanBtn, (!input.trim() || loading) && styles.scanBtnDisabled]}
              onPress={handleScan}
              disabled={!input.trim() || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText variant="labelLarge" style={{ color: '#fff' }}>
                  Analyser
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </Card>

        {/* Quick test chips */}
        <View style={styles.quickRow}>
          {QUICK_TESTS.map((t) => (
            <TouchableOpacity
              key={t.barcode}
              style={styles.quickChip}
              onPress={() => handleQuick(t.barcode)}
              activeOpacity={0.7}
            >
              <ThemedText variant="bodySmall" style={{ color: Colors.accentDark }}>
                {t.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Error state */}
        {!!error && (
          <Card style={styles.errorCard}>
            <ThemedText variant="bodyMedium" style={{ color: Colors.danger }}>
              {error}
            </ThemedText>
          </Card>
        )}

        {/* Results */}
        {product && verdict && (
          <>
            {/* Verdict card */}
            <Card style={StyleSheet.flatten([styles.verdictCard, { borderColor: verdictColor }])}>
              <View style={styles.verdictHeader}>
                <View style={{ flex: 1, gap: 4 }}>
                  <ThemedText variant="headlineMedium">{product.name}</ThemedText>
                  {!!product.brand && (
                    <ThemedText variant="bodyMedium" color="textSecondary">
                      {product.brand}
                    </ThemedText>
                  )}
                </View>
                <Badge
                  variant={
                    verdict.verdict === 'safe'    ? 'safe'   :
                    verdict.verdict === 'caution' ? 'caution' :
                    'danger'
                  }
                >
                  {verdict.verdict === 'safe'
                    ? '✓ Compatible'
                    : verdict.verdict === 'caution'
                    ? '⚠ Précaution'
                    : '✕ À éviter'}
                </Badge>
              </View>

              {fromCache && (
                <ThemedText variant="bodySmall" color="textTertiary" style={{ fontStyle: 'italic' }}>
                  Résultat depuis le cache
                </ThemedText>
              )}

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <ThemedText variant="headlineLarge" style={{ color: Colors.danger }}>
                    {verdict.flaggedIngredients.filter((m) => m.riskLevel === 'danger').length}
                  </ThemedText>
                  <ThemedText variant="bodySmall" color="textSecondary">À éviter</ThemedText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <ThemedText variant="headlineLarge" style={{ color: Colors.caution }}>
                    {verdict.flaggedIngredients.filter((m) => m.riskLevel === 'caution').length}
                  </ThemedText>
                  <ThemedText variant="bodySmall" color="textSecondary">Précaution</ThemedText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <ThemedText variant="headlineLarge" style={{ color: Colors.textTertiary }}>
                    {verdict.noSignalCount}
                  </ThemedText>
                  <ThemedText variant="bodySmall" color="textSecondary">Sans signal</ThemedText>
                </View>
              </View>
            </Card>

            {/* Flagged ingredients */}
            {flagged.length > 0 && (
              <Card>
                <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
                  INGRÉDIENTS SIGNALÉS
                </ThemedText>
                {flagged.map((m) => (
                  <React.Fragment key={m.ingredientName}>
                    <IngredientRow match={m} />
                    {m.ingredient?.description_fr && (
                      <ThemedText
                        variant="bodySmall"
                        color="textSecondary"
                        style={styles.ingredientDesc}
                      >
                        {m.ingredient.description_fr}
                      </ThemedText>
                    )}
                  </React.Fragment>
                ))}
              </Card>
            )}

            {/* All other ingredients */}
            {others.length > 0 && (
              <Card>
                <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
                  TOUS LES INGRÉDIENTS ({matches.length})
                </ThemedText>
                {others.map((m) => (
                  <IngredientRow key={m.ingredientName} match={m} />
                ))}
              </Card>
            )}

            {/* Disclaimer */}
            <ThemedText
              variant="bodySmall"
              color="textTertiary"
              style={styles.disclaimer}
            >
              {SCAN_DISCLAIMER}
            </ThemedText>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: { flex: 1 },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.massive,
    gap: Spacing.lg,
  },
  header: {
    paddingTop: Spacing.xxxl,
    gap: Spacing.xs,
  },
  inputLabel: {
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.bodyMedium.fontSize,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  scanBtn: {
    height: 48,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.soft,
  },
  scanBtnDisabled: {
    opacity: 0.5,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errorCard: {
    backgroundColor: Colors.dangerLight,
  },
  verdictCard: {
    borderWidth: 2,
    gap: Spacing.lg,
  },
  verdictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  ingredientDesc: {
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  disclaimer: {
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.lg,
  },
});
