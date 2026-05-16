import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

/**
 * VellumTexture — Moment 1 (v1.1 brief, déc. 2025)
 *
 * Grain très subtil (~5% d'opacité) qui rappelle un papier vélin.
 * Posé en absolute fill derrière le contenu du hero du verdict,
 * il ajoute du « luxe » sans coût visuel ni couleur supplémentaire.
 *
 * Implémenté avec un Pattern SVG de petits points pseudo-aléatoires
 * (positions figées via useMemo pour rester stable entre les renders).
 */
interface VellumTextureProps {
  opacity?: number;
  tileSize?: number;
  dotsPerTile?: number;
}

export function VellumTexture({
  opacity = 0.05,
  tileSize = 60,
  dotsPerTile = 22,
}: VellumTextureProps) {
  const dots = useMemo(() => {
    // Distribution pseudo-aléatoire stable (seed déterministe : index)
    const out: { cx: number; cy: number; r: number }[] = [];
    let seed = 1;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < dotsPerTile; i++) {
      out.push({
        cx: rand() * tileSize,
        cy: rand() * tileSize,
        r: 0.35 + rand() * 0.55,
      });
    }
    return out;
  }, [tileSize, dotsPerTile]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="vellum-grain"
            x="0"
            y="0"
            width={tileSize}
            height={tileSize}
            patternUnits="userSpaceOnUse"
          >
            {dots.map((d, i) => (
              <Circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="#3A2F26" />
            ))}
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#vellum-grain)" />
      </Svg>
    </View>
  );
}
