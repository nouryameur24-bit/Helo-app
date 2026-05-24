/**
 * GlowScoreTrend — sparkline minimaliste de l'évolution du Glow Score.
 *
 * v4 Lot 11. Affiche une mini-courbe SVG des ~12 derniers scores enregistrés
 * via `lib/glowScoreHistory.ts`. Si moins de 2 points → on n'affiche rien
 * (pas la peine d'occuper l'écran pour 1 point isolé).
 *
 * Design : 80×24 px, accent line en `Colors.accent`, fond transparent.
 * Pas d'interactivité (pas de tooltip) pour rester léger — c'est une
 * indication d'évolution, pas un dashboard analytique.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { getGlowScoreHistory, type GlowScoreEntry } from '@/lib/glowScoreHistory';

interface Props {
  /** Surchargeable pour les tests / preview. Si non fourni, lit AsyncStorage. */
  data?: GlowScoreEntry[];
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 96;
const DEFAULT_HEIGHT = 28;
const PADDING = 2;

export function GlowScoreTrend({ data, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT }: Props) {
  const [history, setHistory] = useState<GlowScoreEntry[]>(data ?? []);

  const reload = useCallback(() => {
    if (data) return; // mode contrôlé
    getGlowScoreHistory().then(setHistory).catch(() => setHistory([]));
  }, [data]);

  useEffect(() => { reload(); }, [reload]);
  useFocusEffect(reload);

  if (history.length < 2) return null;

  // Normalise les scores en coordonnées SVG. Y inversé (0 en haut en SVG).
  const min = Math.min(...history.map((e) => e.score));
  const max = Math.max(...history.map((e) => e.score));
  const range = Math.max(1, max - min); // évite div by 0
  const xStep = (width - PADDING * 2) / (history.length - 1);

  const points = history
    .map((e, i) => {
      const x = PADDING + i * xStep;
      const y = PADDING + (height - PADDING * 2) * (1 - (e.score - min) / range);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Trend direction pour la couleur du dernier point.
  const last = history[history.length - 1]!.score;
  const prev = history[history.length - 2]!.score;
  const isUp = last > prev;
  const dotColor = isUp ? Colors.safe : last < prev ? Colors.caution : Colors.accent;

  // Position du dernier point pour le marker
  const lastX = PADDING + (history.length - 1) * xStep;
  const lastY = PADDING + (height - PADDING * 2) * (1 - (last - min) / range);

  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Svg width={width} height={height}>
        <Polyline
          points={points}
          fill="none"
          stroke={Colors.accent}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={lastX} cy={lastY} r={2.5} fill={dotColor} />
      </Svg>
      <ThemedText variant="labelSmall" color="textTertiary" style={{ fontSize: 10 }}>
        {history.length} dernières mesures
      </ThemedText>
    </View>
  );
}

// Helper exporté pour qu'on puisse styler depuis l'extérieur si besoin
export const GLOW_TREND_DEFAULTS = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };

// Re-export padding alignment marker for callers
export const GLOW_TREND_VERTICAL_PAD = Spacing.sm;
