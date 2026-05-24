/**
 * RichChatContent — Affiche un message de chat avec citations cliquables.
 *
 * v4 Lot 12. Détecte les sources médicales mentionnées (CRAT, ANSM, EFSA,
 * ANSES, OMS, HAS) dans la réponse Claude et les wrappe dans des Text
 * cliquables qui ouvrent l'URL officielle dans le navigateur natif.
 *
 * Intégration dans `app/(tabs)/chat.tsx` → remplacer :
 *
 *   ```tsx
 *   <ThemedText style={styles.bubbleText}>
 *     {message.content}
 *   </ThemedText>
 *   ```
 *
 * par :
 *
 *   ```tsx
 *   <RichChatContent
 *     content={message.content}
 *     baseStyle={styles.bubbleText}
 *   />
 *   ```
 *
 * Pour les messages user (rôle 'user'), pas de citation à parser →
 * fallback automatique au rendu simple.
 */
import React from 'react';
import { Linking, Text, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';

// ─── Mapping sources → URL officielle ──────────────────────────────────────

const SOURCE_URLS: Record<string, string> = {
  CRAT: 'https://www.lecrat.fr',
  ANSM: 'https://ansm.sante.fr',
  EFSA: 'https://www.efsa.europa.eu',
  ANSES: 'https://www.anses.fr',
  OMS: 'https://www.who.int/fr',
  WHO: 'https://www.who.int',
  HAS: 'https://www.has-sante.fr',
  INPES: 'https://www.santepubliquefrance.fr',
  EMA: 'https://www.ema.europa.eu',
};

const SOURCE_REGEX = new RegExp(
  `\\b(${Object.keys(SOURCE_URLS).join('|')})\\b`,
  'g',
);

// ─── Segmentation ──────────────────────────────────────────────────────────

interface Segment {
  text: string;
  source?: string; // si défini → cliquable
}

/**
 * Découpe le texte en segments (text + sources cliquables).
 * Exemple :
 *   "Selon le CRAT, l'aspartame est..." →
 *   [{ text: "Selon le " }, { text: "CRAT", source: "CRAT" },
 *    { text: ", l'aspartame est..." }]
 */
export function parseRichChatContent(content: string): Segment[] {
  if (!content) return [];
  const segments: Segment[] = [];
  let lastIndex = 0;
  // Reset le regex stateful avant chaque parse
  SOURCE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SOURCE_REGEX.exec(content)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (start > lastIndex) {
      segments.push({ text: content.slice(lastIndex, start) });
    }
    segments.push({ text: match[0], source: match[0] });
    lastIndex = end;
  }
  if (lastIndex < content.length) {
    segments.push({ text: content.slice(lastIndex) });
  }
  return segments;
}

// ─── Component ─────────────────────────────────────────────────────────────

interface Props {
  content: string;
  /** Style du texte de base (couleurs, font, line-height…). Sera mergé avec
   *  le style underline + accent color sur les segments cliquables. */
  baseStyle?: StyleProp<TextStyle>;
}

export function RichChatContent({ content, baseStyle }: Props) {
  const segments = parseRichChatContent(content);
  if (segments.length === 0) {
    return <ThemedText style={baseStyle}>{content}</ThemedText>;
  }

  return (
    <ThemedText style={baseStyle}>
      {segments.map((seg, i) => {
        if (!seg.source) {
          // Un Text natif inline RN pour rester dans la même bulle (pas de
          // wrapping ThemedText qui re-applique des margins inline).
          return <Text key={i}>{seg.text}</Text>;
        }
        const url = SOURCE_URLS[seg.source];
        return (
          <Text
            key={i}
            style={{ color: Colors.accent, textDecorationLine: 'underline' }}
            onPress={() => {
              if (url) {
                Linking.openURL(url).catch(() => undefined);
              }
            }}
            accessibilityRole="link"
            accessibilityLabel={`Source officielle ${seg.source}`}
          >
            {seg.text}
          </Text>
        );
      })}
    </ThemedText>
  );
}
