import React from 'react';
import { Pressable, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { getMemberColor, getRelativeTime, type CircleFeedEntry } from '@/lib/circleUtils';
import styles from './circleStyles';

const REACTIONS = ['😱', '🤣', '👍', '❤️'] as const;

function getVerdictLabel(verdict?: string): string {
  if (verdict === 'danger') return 'À éviter';
  if (verdict === 'caution') return 'Précaution';
  if (verdict === 'safe') return 'Compatible';
  return '';
}

function getVerdictColor(verdict?: string): string {
  if (verdict === 'danger') return Colors.danger;
  if (verdict === 'caution') return Colors.caution;
  if (verdict === 'safe') return Colors.safe;
  return Colors.textTertiary;
}

interface CircleFeedCardProps {
  entry: CircleFeedEntry;
  userId: string;
  onReact: (id: string, emoji: string) => void;
}

function CircleFeedCard({ entry, userId, onReact }: CircleFeedCardProps) {
  const myReaction = entry.user_reactions?.[userId];
  const verdictColor = getVerdictColor(entry.verdict);
  const verdictLabel = getVerdictLabel(entry.verdict);
  const color = getMemberColor(entry.user_id);
  const initial = (entry.first_name || '?').charAt(0).toUpperCase();

  return (
    <Card style={styles.feedCard} padding={Spacing.lg}>
      <View style={styles.feedHeader}>
        <View style={[styles.feedAvatar, { backgroundColor: color }]}>
          <ThemedText style={styles.feedAvatarInitial}>{initial}</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          {entry.type === 'scan' ? (
            <>
              <ThemedText variant="bodyMedium" color="textPrimary">
                <ThemedText variant="labelLarge" color="textPrimary">{entry.first_name}</ThemedText>
                {' a scanné '}
                <ThemedText variant="labelLarge" color="textPrimary">{entry.product_name ?? 'un produit'}</ThemedText>
              </ThemedText>
              {entry.verdict && (
                <View style={[styles.verdictBadge, { backgroundColor: verdictColor + '20' }]}>
                  <ThemedText style={[styles.verdictBadgeText, { color: verdictColor }]}>
                    {verdictLabel}
                  </ThemedText>
                </View>
              )}
            </>
          ) : (
            <ThemedText variant="bodyMedium" color="textPrimary">
              <ThemedText variant="labelLarge" color="textPrimary">{entry.first_name}</ThemedText>
              {entry.message_text ? ` : ${entry.message_text}` : ''}
            </ThemedText>
          )}
          <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
            {getRelativeTime(entry.created_at)}
          </ThemedText>
        </View>
      </View>

      <View style={styles.reactionsRow}>
        {REACTIONS.map((emoji) => {
          const count = entry.reactions?.[emoji] ?? 0;
          const isActive = myReaction === emoji;
          return (
            <Pressable
              key={emoji}
              onPress={() => onReact(entry.id, emoji)}
              style={({ pressed }) => [
                styles.reactionBtn,
                isActive && styles.reactionBtnActive,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Réagir avec ${emoji}`}
            >
              <ThemedText style={styles.reactionEmoji}>{emoji}</ThemedText>
              {count > 0 && (
                <ThemedText style={[styles.reactionCount, isActive ? { color: Colors.accent } : undefined]}>
                  {count}
                </ThemedText>
              )}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

export function EmptyFeed() {
  return (
    <View style={styles.emptyFeed}>
      <ThemedText style={{ fontSize: 36 }}>💬</ThemedText>
      <ThemedText variant="headlineMedium" color="textPrimary" style={{ textAlign: 'center', marginTop: Spacing.md }}>
        Le fil est vide
      </ThemedText>
      <ThemedText variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.sm }}>
        Partage un scan depuis la page verdict ou envoyez un message pour démarrer !
      </ThemedText>
    </View>
  );
}

export default React.memo(CircleFeedCard);
