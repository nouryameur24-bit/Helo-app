import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { exp } from './scanPartyStyles';
import { VERDICT_CONFIG, THEMES, type PartyResult, type Theme } from './scanPartyTypes';

interface ExportCardProps {
  results: PartyResult[];
  theme: Theme;
}

const MAX_LIST = 15;

function calcScore(results: PartyResult[]) {
  if (!results.length) return { safe: 0, caution: 0, danger: 0, score: 0 };
  const safe = results.filter((r) => r.verdict === 'safe').length;
  const caution = results.filter((r) => r.verdict === 'caution').length;
  const danger = results.filter((r) => r.verdict === 'danger').length;
  const total = results.length;
  const score = Math.round(((safe * 10 + caution * 5) / (total * 10)) * 100);
  return { safe, caution, danger, score };
}

const ExportCard = forwardRef<View, ExportCardProps>(function ExportCard({ results, theme }, ref) {
  const { safe, caution, danger, score } = calcScore(results);
  const total = results.length;
  const themeLabel = THEMES.find((t) => t.id === theme)?.label ?? theme;
  const visibleResults = results.slice(0, MAX_LIST);

  return (
    <View ref={ref} style={exp.captureWrap} collapsable={false}>
      <LinearGradient
        colors={['#1A1A1A', '#2D1F10']}
        style={exp.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={exp.header}>
          <View style={exp.logoBadge}>
            <ThemedText style={exp.logoText}>Hēlo</ThemedText>
          </View>
          <View style={exp.headerRight}>
            <ThemedText style={exp.partLabel}>SCAN PARTY</ThemedText>
            <ThemedText style={exp.themeLabel}>{themeLabel}</ThemedText>
          </View>
        </View>

        <View style={exp.scoreBlock}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <ThemedText style={exp.scoreMain}>{score}</ThemedText>
            <ThemedText style={exp.scoreSlash}>/100</ThemedText>
          </View>
          <ThemedText style={exp.scoreLabel}>Score de sécurité · {total} produit{total > 1 ? 's' : ''}</ThemedText>
        </View>

        <View style={exp.barWrap}>
          <View style={exp.bar}>
            {[safe, caution, danger].map((v, i) => (
              <View
                key={i}
                style={[
                  exp.barSeg,
                  {
                    flex: v || 0,
                    backgroundColor: [Colors.safe, Colors.caution, Colors.danger][i],
                  },
                ]}
              />
            ))}
          </View>
          <View style={exp.barLegend}>
            <ThemedText style={[exp.legendTxt, { color: Colors.safe }]}>{safe} compatibles</ThemedText>
            <ThemedText style={[exp.legendTxt, { color: Colors.caution }]}>{caution} précaution</ThemedText>
            <ThemedText style={[exp.legendTxt, { color: Colors.danger }]}>{danger} à éviter</ThemedText>
          </View>
        </View>

        <View style={exp.list}>
          {visibleResults.map((r) => {
            const cfg = VERDICT_CONFIG[r.verdict];
            return (
              <View key={r.barcode} style={exp.listRow}>
                <ThemedText style={exp.listDot}>
                  {r.verdict === 'safe' ? '✓' : r.verdict === 'danger' ? '✕' : '⚠'}
                </ThemedText>
                <ThemedText style={exp.listName} numberOfLines={1}>{r.name}</ThemedText>
                <ThemedText style={[exp.listVerdict, { color: cfg.color }]}>{cfg.label}</ThemedText>
              </View>
            );
          })}
          {results.length > MAX_LIST && (
            <ThemedText style={exp.listMore}>+{results.length - MAX_LIST} autres produits…</ThemedText>
          )}
        </View>

        <View style={exp.watermark}>
          <ThemedText style={exp.watermarkText}>HĒLO · GROSSESSE SANS SOUCI</ThemedText>
        </View>
      </LinearGradient>
    </View>
  );
});

export default ExportCard;
