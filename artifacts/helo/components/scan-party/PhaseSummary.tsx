import React from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { sum } from './scanPartyStyles';
import { VERDICT_CONFIG, THEMES, type PartyResult, type Theme } from './scanPartyTypes';

interface PhaseSummaryProps {
  results: PartyResult[];
  theme: Theme;
  onShare: () => void;
  onRestart: () => void;
}

function calcScore(results: PartyResult[]) {
  if (!results.length) return { safe: 0, caution: 0, danger: 0, score: 0 };
  const safe = results.filter((r) => r.verdict === 'safe').length;
  const caution = results.filter((r) => r.verdict === 'caution').length;
  const danger = results.filter((r) => r.verdict === 'danger').length;
  const total = results.length;
  const score = Math.round(((safe * 10 + caution * 5) / (total * 10)) * 100);
  return { safe, caution, danger, score };
}

function PhaseSummary({ results, theme, onShare, onRestart }: PhaseSummaryProps) {
  const insets = useSafeAreaInsets();
  const { safe, caution, danger, score } = calcScore(results);
  const total = results.length;
  const themeLabel = THEMES.find((t) => t.id === theme)?.label ?? theme;
  const themeEmoji = THEMES.find((t) => t.id === theme)?.emoji ?? '✨';

  const barColors: [string, string, string] = [Colors.safe, Colors.caution, Colors.danger];

  return (
    <View style={[sum.root, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }]}>
      <View style={sum.header}>
        <Pressable onPress={onRestart} style={sum.backBtn} accessibilityRole="button" accessibilityLabel="Recommencer">
          <Feather name="refresh-ccw" size={20} color={Colors.textSecondary} />
        </Pressable>
        <ThemedText variant="headlineMedium" color="textPrimary">Résultats</ThemedText>
        <Pressable onPress={onShare} style={sum.backBtn} accessibilityRole="button" accessibilityLabel="Partager">
          <Feather name="share-2" size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <FlatList
        data={results}
        keyExtractor={(r) => r.barcode}
        maxToRenderPerBatch={10}
        initialNumToRender={8}
        removeClippedSubviews
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={[Colors.accentLight, Colors.accent]}
              style={sum.scoreHero}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
            >
              <ThemedText style={{ fontSize: 16, marginBottom: 4, color: 'rgba(255,255,255,0.8)' }}>
                {themeEmoji} {themeLabel} · {total} produit{total > 1 ? 's' : ''}
              </ThemedText>
              <ThemedText variant="displayLarge" style={{ color: '#fff', fontSize: 64, lineHeight: 72 }}>
                {score}
              </ThemedText>
              <ThemedText variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                /100 — Score de sécurité
              </ThemedText>
            </LinearGradient>

            <Card padding={Spacing.lg} style={sum.card}>
              <ThemedText variant="labelLarge" color="textPrimary" style={{ marginBottom: Spacing.md }}>
                Répartition
              </ThemedText>
              <View style={sum.bigBar}>
                {[safe, caution, danger].map((v, i) => (
                  <View
                    key={i}
                    style={[sum.barSeg, { flex: v || 0, backgroundColor: barColors[i] }]}
                  />
                ))}
              </View>
              <View style={sum.legend}>
                {[
                  { label: `${safe} OK`, color: Colors.safe },
                  { label: `${caution} Attention`, color: Colors.caution },
                  { label: `${danger} Éviter`, color: Colors.danger },
                ].map((d) => (
                  <View key={d.label} style={sum.legendItem}>
                    <View style={[sum.legendDot, { backgroundColor: d.color }]} />
                    <ThemedText variant="bodySmall" style={{ color: d.color }}>{d.label}</ThemedText>
                  </View>
                ))}
              </View>
            </Card>

            <ThemedText variant="labelLarge" color="textPrimary" style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm }}>
              Liste complète
            </ThemedText>
          </>
        }
        renderItem={({ item }) => {
          const cfg = VERDICT_CONFIG[item.verdict];
          return (
            <View style={sum.productRow}>
              <View style={[sum.productDot, { backgroundColor: cfg.bg }]}>
                <ThemedText style={{ fontSize: 16, color: cfg.color }}>
                  {item.verdict === 'safe' ? '✓' : item.verdict === 'danger' ? '✕' : '⚠'}
                </ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="bodyMedium" color="textPrimary" numberOfLines={1}>{item.name}</ThemedText>
                {item.brand ? (
                  <ThemedText variant="bodySmall" color="textTertiary">{item.brand}</ThemedText>
                ) : null}
              </View>
              <View style={[sum.verdictChip, { backgroundColor: cfg.bg }]}>
                <ThemedText variant="labelSmall" style={{ color: cfg.color, fontSize: 10 }}>{cfg.label}</ThemedText>
              </View>
            </View>
          );
        }}
        contentContainerStyle={[sum.scroll, { paddingTop: Spacing.lg }]}
        ListFooterComponent={
          <View style={sum.actions}>
            <Pressable
              onPress={onShare}
              style={({ pressed }) => ({
                backgroundColor: Colors.accent,
                borderRadius: Radius.lg,
                padding: Spacing.lg,
                alignItems: 'center' as const,
                opacity: pressed ? 0.85 : 1,
                flexDirection: 'row' as const,
                justifyContent: 'center' as const,
                gap: Spacing.sm,
              })}
              accessibilityRole="button"
              accessibilityLabel="Partager les résultats"
            >
              <Feather name="share-2" size={18} color="#fff" />
              <ThemedText variant="labelLarge" style={{ color: '#fff' }}>Partager les résultats</ThemedText>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

export default React.memo(PhaseSummary);
