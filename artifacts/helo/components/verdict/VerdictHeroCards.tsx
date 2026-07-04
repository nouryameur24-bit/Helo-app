/**
 * VerdictHeroCards — blocs du hero de l'écran verdict extraits en composants
 * mémoïsés (push S+ découpe). Avant, ces 3 blocs étaient des IIFE inline dans
 * `app/verdict/[scanId].tsx` (l'écran le plus vu, 1114 L) qui recréaient leurs
 * objets `palette`/`quote` à CHAQUE render. Extraits ici → parent plus lisible
 * + `React.memo` (ne re-render que si les props changent).
 *
 * Comportement identique à l'inline d'origine (aucune régression visuelle).
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getContextualQuote } from '@/lib/contextualQuotes';
import type { Phase } from '@/types';

// ─── 1. Carte "Provenance de l'analyse" ─────────────────────────────────────
// Palette dédiée (hors thème, usage local) — contraste WCAG AA sur fond clair,
// cohésion nude/cream/gold. IA = lavande, déterministe = sauge médicale.
const AI_PALETTE = { bg: '#F4F0FB', border: '#D4C7EC', accent: '#6B5B9C', emoji: '✨', label: 'Analysé par Hēlo IA' };
const DET_PALETTE = { bg: '#EEF7F0', border: '#BFD9C8', accent: '#4F8068', emoji: '🛡️', label: 'Vérifié via nos sources médicales' };

export const AnalysisSourceCard = React.memo(function AnalysisSourceCard({
  explanation,
  isAi,
}: {
  explanation: string;
  isAi: boolean;
}) {
  const palette = isAi ? AI_PALETTE : DET_PALETTE;
  return (
    <View style={[cardStyles.wrap, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={cardStyles.header}>
        <ThemedText style={{ fontSize: 14 }}>{palette.emoji}</ThemedText>
        <ThemedText variant="labelSmall" style={[cardStyles.headerLabel, { color: palette.accent }]}>
          {palette.label}
        </ThemedText>
      </View>
      <ThemedText variant="bodyMedium" style={cardStyles.explanation}>
        {explanation}
      </ThemedText>
    </View>
  );
});

// ─── 2. Citation contextuelle (source médicale) ─────────────────────────────
export const ContextualQuoteRow = React.memo(function ContextualQuoteRow({
  phase,
  verdict,
  sourceAttribution,
}: {
  phase: Phase;
  verdict: 'safe' | 'caution' | 'danger';
  sourceAttribution: string;
}) {
  const quote = getContextualQuote(phase, verdict);
  return (
    <>
      <View style={quoteStyles.quoteWrap}>
        <ThemedText variant="bodyMedium" color="textSecondary" style={quoteStyles.quoteText}>
          « {quote.text} »
        </ThemedText>
        <ThemedText variant="labelSmall" color="textTertiary" style={quoteStyles.quoteSource}>
          — Selon le {quote.source}
        </ThemedText>
      </View>
      <View style={quoteStyles.attribRow}>
        <Feather name="info" size={11} color={Colors.textTertiary} />
        <ThemedText variant="bodySmall" color="textTertiary" style={quoteStyles.attribText}>
          {sourceAttribution}
        </ThemedText>
      </View>
    </>
  );
});

// ─── 3. Badge "X mamans ont contribué" (Lot 18-06) ──────────────────────────
export const CommunityContributionBadge = React.memo(function CommunityContributionBadge({
  count,
}: {
  count: number;
}) {
  return (
    <View style={communityStyles.wrap}>
      <View style={communityStyles.iconWrap}>
        <ThemedText style={{ fontSize: 14 }}>💛</ThemedText>
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText variant="labelLarge" color="textPrimary">
          {count === 1 ? '1 maman a contribué' : `${count} mamans ont contribué`}
        </ThemedText>
        <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
          Verdict construit grâce à la communauté Hēlo
          {count >= 5 ? ' · validé' : ' · en cours de validation'}
        </ThemedText>
      </View>
    </View>
  );
});

const cardStyles = StyleSheet.create({
  wrap: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  headerLabel: { letterSpacing: 0.4, fontSize: 12, fontWeight: '700' },
  explanation: { lineHeight: 22, textAlign: 'left', color: Colors.textPrimary },
});

const quoteStyles = StyleSheet.create({
  quoteWrap: { marginTop: Spacing.md, paddingHorizontal: Spacing.lg },
  quoteText: { textAlign: 'center', fontStyle: 'italic', lineHeight: 20 },
  quoteSource: { textAlign: 'center', marginTop: 4, letterSpacing: 0.5 },
  attribRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: Spacing.sm, paddingHorizontal: Spacing.lg },
  attribText: { fontStyle: 'italic', textAlign: 'center', fontSize: 11 },
});

const communityStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.accentLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '33',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
