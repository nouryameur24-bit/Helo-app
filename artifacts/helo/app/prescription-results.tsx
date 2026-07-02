// ─── Résultats ordonnance — Hēlo ─────────────────────────────────────────────
import { router, useLocalSearchParams } from 'expo-router';
import { ROUTES } from '@/types/routes';
import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import type { MedicationResult, MedicationRisk } from '@/lib/prescription';
import { prescriptionVerdict } from '@/lib/prescription';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function riskLabel(r: MedicationRisk): string {
  switch (r) {
    case 'safe':    return 'Compatible';
    case 'caution': return 'Vigilance';
    case 'danger':  return 'À éviter';
    default:        return 'Non évalué';
  }
}

function riskVariant(r: MedicationRisk): 'safe' | 'caution' | 'danger' | 'accent' {
  switch (r) {
    case 'safe':    return 'safe';
    case 'caution': return 'caution';
    case 'danger':  return 'danger';
    default:        return 'accent';
  }
}

function verdictBg(r: MedicationRisk): string {
  switch (r) {
    case 'safe':    return '#E8F5E9';
    case 'caution': return '#FFF8E1';
    case 'danger':  return '#FFEBEE';
    default:        return Colors.surface;
  }
}

function verdictIcon(r: MedicationRisk): React.ComponentProps<typeof Feather>['name'] {
  switch (r) {
    case 'safe':    return 'check-circle';
    case 'caution': return 'alert-triangle';
    case 'danger':  return 'alert-octagon';
    default:        return 'help-circle';
  }
}

function verdictIconColor(r: MedicationRisk): string {
  switch (r) {
    case 'safe':    return Colors.safe;
    case 'caution': return Colors.caution;
    case 'danger':  return Colors.danger;
    default:        return Colors.textTertiary;
  }
}

function verdictTitle(r: MedicationRisk): string {
  switch (r) {
    case 'safe':    return 'Ordonnance sans alerte';
    case 'caution': return 'Points de vigilance';
    case 'danger':  return 'Médicaments à risque détectés';
    default:        return 'Résultats incomplets';
  }
}

function verdictSubtitle(r: MedicationRisk): string {
  switch (r) {
    case 'safe':    return 'Aucun médicament risqué identifié dans notre base.';
    case 'caution': return 'Certains médicaments nécessitent une attention particulière.';
    case 'danger':  return 'Consulte immédiatement ton médecin ou pharmacien.';
    default:        return 'Nous n\'avons pas trouvé ces médicaments dans notre base.';
  }
}

// ─── Medication card ──────────────────────────────────────────────────────────
function MedicationCard({ result, index }: { result: MedicationResult; index: number }) {
  const isUnknown = !result.found;
  const hasWarning = result.riskLevel === 'caution' || result.riskLevel === 'danger';

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <Card style={styles.medCard} padding={Spacing.lg}>
        <View style={styles.medHeader}>
          <View style={{ flex: 1, gap: 4 }}>
            <ThemedText variant="bodyLarge" color="textPrimary">
              {result.name}
            </ThemedText>
            {result.dosage && (
              <ThemedText variant="bodySmall" color="textTertiary">
                {result.dosage}
              </ThemedText>
            )}
          </View>
          <Badge variant={riskVariant(result.riskLevel)}>{riskLabel(result.riskLevel)}</Badge>
        </View>

        {isUnknown && (
          <View style={styles.unknownRow}>
            <Feather name="info" size={13} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary" style={{ flex: 1 }}>
              Non trouvé dans notre base — consulte ton pharmacien.
            </ThemedText>
          </View>
        )}

        {!isUnknown && hasWarning && result.description && (
          <View style={[styles.descRow, { backgroundColor: result.riskLevel === 'danger' ? '#FFEBEE' : '#FFF8E1' }]}>
            <Feather name={result.riskLevel === 'danger' ? 'alert-octagon' : 'alert-triangle'} size={13} color={result.riskLevel === 'danger' ? Colors.danger : Colors.caution} />
            <ThemedText variant="bodySmall" style={{ flex: 1, color: result.riskLevel === 'danger' ? Colors.danger : '#B7791F' }}>
              {result.description}
            </ThemedText>
          </View>
        )}

        {!isUnknown && result.contraindication && (
          <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 6 }}>
            {result.contraindication}
          </ThemedText>
        )}
      </Card>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function PrescriptionResultsScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const { results: resultsParam } = useLocalSearchParams<{ results: string }>();

  const results = useMemo<MedicationResult[]>(() => {
    try {
      return resultsParam ? JSON.parse(decodeURIComponent(resultsParam)) : [];
    } catch {
      return [];
    }
  }, [resultsParam]);

  const overall = prescriptionVerdict(results);

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + Spacing.lg, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          </Pressable>
          <ThemedText variant="headlineLarge" color="textPrimary">
            Analyse de ton ordonnance
          </ThemedText>
        </Animated.View>

        {/* Verdict hero */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
          <View style={[styles.verdictCard, { backgroundColor: verdictBg(overall) }]}>
            <Feather name={verdictIcon(overall)} size={32} color={verdictIconColor(overall)} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="headlineMedium" style={{ color: verdictIconColor(overall) }}>
                {verdictTitle(overall)}
              </ThemedText>
              <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 4 }}>
                {verdictSubtitle(overall)}
              </ThemedText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: Spacing.sm, paddingHorizontal: Spacing.lg }}>
            <Feather name="info" size={11} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary" style={{ fontStyle: 'italic', fontSize: 11, textAlign: 'center' }}>
              Analyse basée sur les données CRAT (Centre de Référence sur les Agents Tératogènes)
            </ThemedText>
          </View>
        </Animated.View>

        {/* No medications found */}
        {results.length === 0 && (
          <Animated.View entering={FadeInDown.delay(160).duration(400)}>
            <Card style={styles.emptyCard} padding={Spacing.xl}>
              <Feather name="file-text" size={36} color={Colors.textTertiary} />
              <ThemedText variant="bodyLarge" color="textTertiary" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
                Aucun médicament détecté
              </ThemedText>
              <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
                L'OCR n'a pas reconnu de noms de médicaments. Assure-toi que l'ordonnance est bien visible et réessaie.
              </ThemedText>
            </Card>
          </Animated.View>
        )}

        {/* Medication list */}
        {results.length > 0 && (
          <View style={styles.medList}>
            <ThemedText variant="labelLarge" color="textSecondary" style={{ marginBottom: Spacing.sm }}>
              {results.length} médicament{results.length > 1 ? 's' : ''} détecté{results.length > 1 ? 's' : ''}
            </ThemedText>
            {results.map((r, i) => (
              <MedicationCard key={`${r.name}-${i}`} result={r} index={i} />
            ))}
          </View>
        )}

        {/* Conseil */}
        <Animated.View entering={FadeInDown.delay(results.length * 80 + 200).duration(400)}>
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Feather name="user" size={16} color={Colors.accent} />
            </View>
            <ThemedText variant="bodySmall" color="textSecondary" style={{ flex: 1, lineHeight: 20 }}>
              Montre toujours ton ordonnance à ton pharmacien en précisant que tu es enceinte.
            </ThemedText>
          </View>
        </Animated.View>

        {/* Disclaimer */}
        <Animated.View entering={FadeInDown.delay(results.length * 80 + 280).duration(400)}>
          <View style={styles.disclaimer}>
            <Feather name="shield" size={14} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary" style={{ flex: 1, lineHeight: 18 }}>
              Cette analyse ne se substitue en aucun cas à l'avis de ton médecin prescripteur ni de ton pharmacien. Ne modifie jamais un traitement sans avis médical.
            </ThemedText>
          </View>
        </Animated.View>

        {/* Scan another */}
        <Animated.View entering={FadeInDown.delay(results.length * 80 + 360).duration(400)} style={{ marginTop: Spacing.lg }}>
          <Pressable
            onPress={() => router.replace(ROUTES.prescriptionScan)}
            style={({ pressed }) => [styles.rescanBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="camera" size={16} color={Colors.accent} />
            <ThemedText variant="labelSmall" color="accent">
              Scanner une autre ordonnance
            </ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  verdictCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.lg,
  },
  medList: {
    gap: Spacing.sm,
  },
  medCard: {
    gap: Spacing.sm,
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  unknownRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: 4,
  },
  descRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: 4,
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
});
