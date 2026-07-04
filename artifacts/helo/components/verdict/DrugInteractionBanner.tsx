/**
 * components/verdict/DrugInteractionBanner.tsx — Tier A safety
 *
 * Bannière affichée sur le verdict screen quand le produit scanné interagit
 * avec un médicament que l'user a déclaré prendre (profile.current_medications).
 *
 * Utilise la table `drug_interactions` + RPC `find_drug_interactions` (Lot 19).
 *
 * Sévérité affichée :
 *   - contraindicated : rouge, bloquant
 *   - major : orange foncé
 *   - moderate : ambre
 *   - minor : info (rare affichage)
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Radius, Spacing } from '@/constants/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { swallow } from '@/lib/swallow';

interface DrugInteraction {
  substance_a: string;
  substance_b: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  pregnancy_severity: 'minor' | 'moderate' | 'major' | 'contraindicated' | null;
  advice_fr: string;
  source: string;
}

interface Props {
  /**
   * Substances actives détectées dans le produit scanné. Typiquement extraites
   * depuis matches[] (medication) ou via OCR pour les médicaments.
   */
  productSubstances: string[];
  /**
   * Médicaments en cours déclarés par l'user (profile.current_medications).
   * Si vide, on n'affiche rien.
   */
  userMedications: string[];
}

const SEVERITY_STYLES: Record<DrugInteraction['severity'], { bg: string; fg: string; icon: keyof typeof Feather.glyphMap; label: string }> = {
  contraindicated: { bg: '#FEE2E2', fg: '#991B1B', icon: 'x-octagon', label: 'CONTRE-INDIQUÉ' },
  major:           { bg: '#FED7AA', fg: '#9A3412', icon: 'alert-octagon', label: 'INTERACTION MAJEURE' },
  moderate:        { bg: '#FEF3C7', fg: '#92400E', icon: 'alert-triangle', label: 'INTERACTION MODÉRÉE' },
  minor:           { bg: '#FEF9C3', fg: '#854D0E', icon: 'info', label: 'INTERACTION MINEURE' },
};

export function DrugInteractionBanner({ productSubstances, userMedications }: Props) {
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (productSubstances.length === 0 || userMedications.length === 0) {
      setInteractions([]);
      return;
    }
    // Le RPC accepte un tableau de substances, on combine produit + meds
    const all = [...productSubstances, ...userMedications];
    supabase
      .rpc('find_drug_interactions', { p_substances: all })
      .then(({ data, error }) => {
        if (error) {
          logError('drugInteractionBanner.rpc', new Error(error.message));
          return;
        }
        // Filtre : ne garder QUE les interactions où substance_a et substance_b
        // matchent l'une de chaque côté (productSubstances ↔ userMedications)
        // (pas user_meds entre elles, on couvre ça séparément)
        const filtered = (data ?? []).filter((i: DrugInteraction) => {
          const a = i.substance_a.toLowerCase();
          const b = i.substance_b.toLowerCase();
          const prodLower = productSubstances.map((s) => s.toLowerCase());
          const medLower = userMedications.map((s) => s.toLowerCase());
          return (
            (prodLower.includes(a) && medLower.includes(b)) ||
            (prodLower.includes(b) && medLower.includes(a))
          );
        });
        setInteractions(filtered);
      })
      .then(undefined, swallow);
  }, [productSubstances.join('|'), userMedications.join('|')]);

  if (interactions.length === 0) return null;

  // Affiche la pire d'abord
  return (
    <View style={styles.container}>
      {interactions.map((interaction, idx) => {
        const effectiveSeverity = interaction.pregnancy_severity ?? interaction.severity;
        const style = SEVERITY_STYLES[effectiveSeverity];
        const id = `${interaction.substance_a}-${interaction.substance_b}`;
        const isExpanded = expandedId === id;

        return (
          <TouchableOpacity
            key={id + idx}
            activeOpacity={0.85}
            onPress={() => setExpandedId(isExpanded ? null : id)}
            style={[styles.banner, { backgroundColor: style.bg }]}
            accessibilityRole="alert"
          >
            <View style={styles.bannerHeader}>
              <Feather name={style.icon} size={18} color={style.fg} />
              <ThemedText
                variant="bodyMedium"
                style={[styles.bannerTitle, { color: style.fg }]}
              >
                {style.label}
              </ThemedText>
              <Feather
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={style.fg}
              />
            </View>

            <ThemedText variant="bodySmall" style={{ color: style.fg, marginTop: 4 }}>
              <ThemedText variant="bodySmall" style={{ color: style.fg, fontWeight: '700' }}>
                {interaction.substance_a}
              </ThemedText>
              {' ↔ '}
              <ThemedText variant="bodySmall" style={{ color: style.fg, fontWeight: '700' }}>
                {interaction.substance_b}
              </ThemedText>
            </ThemedText>

            {isExpanded ? (
              <View style={styles.expanded}>
                <ThemedText variant="bodySmall" style={{ color: style.fg, lineHeight: 19 }}>
                  {interaction.advice_fr}
                </ThemedText>
                <ThemedText
                  variant="bodySmall"
                  style={{ color: style.fg, opacity: 0.7, marginTop: Spacing.xs }}
                >
                  Source : {interaction.source}
                </ThemedText>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  banner: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bannerTitle: {
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.5,
    fontSize: 13,
  },
  expanded: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});
