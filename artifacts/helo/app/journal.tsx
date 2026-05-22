import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROUTES } from '@/types/routes';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Card } from '@/components/ui/Card';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { STORAGE_KEYS } from '@/lib/storageKeys';

import { FeatureDiscoverySheet } from '@/components/ui/FeatureDiscoverySheet';
import { useFeatureDiscovery } from "@/hooks/useFeatureDiscovery";
  

export interface JournalEntry {
  id: string;
  date: string;
  mood: string;
  symptoms: string[];
  note: string;
  weekOfPregnancy: number | null;
}

const MOOD_EMOJI: Record<string, string> = {
  '😍': 'Amoureuse',
  '😊': 'Heureuse',
  '😐': 'Neutre',
  '😔': 'Fatiguée',
  '😰': 'Anxieuse',
};

function computeWeekFromDueDate(dueDate: string | null): number | null {
  if (!dueDate) return null;
  try {
    const due = new Date(dueDate);
    const now = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksRemaining = (due.getTime() - now.getTime()) / msPerWeek;
    const week = Math.round(40 - weeksRemaining);
    if (week < 1 || week > 40) return null;
    return week;
  } catch {
    return null;
  }
}

const EntryCard = React.memo(function EntryCard({ entry }: { entry: JournalEntry }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(entry.date);
  const dateLabel = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <Card style={styles.entryCard} padding={Spacing.lg}>
        <View style={styles.entryHeader}>
          <View style={styles.entryMeta}>
            <ThemedText variant="headlineMedium">{entry.mood}</ThemedText>
            <View style={styles.entryMetaText}>
              <ThemedText variant="labelLarge" color="textPrimary">
                {dateLabel}
              </ThemedText>
              {entry.weekOfPregnancy ? (
                <ThemedText variant="bodySmall" color="textTertiary">
                  Semaine {entry.weekOfPregnancy}
                </ThemedText>
              ) : null}
            </View>
          </View>
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textTertiary}
          />
        </View>

        {entry.symptoms.length > 0 && (
          <View style={styles.symptomRow}>
            {entry.symptoms.map((s) => (
              <View key={s} style={styles.symptomBadge}>
                <ThemedText variant="bodySmall" color="accentDark">
                  {s}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {entry.note ? (
          <ThemedText
            variant="bodyMedium"
            color="textSecondary"
            numberOfLines={expanded ? undefined : 2}
            style={styles.noteText}
          >
            {entry.note}
          </ThemedText>
        ) : null}
      </Card>
    </Pressable>
  );
});

export default function JournalScreen() {
  const __discovery_journal = useFeatureDiscovery('journal');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const { dueDate } = useProfile();
  const currentWeek = computeWeekFromDueDate(dueDate ?? null);

  const [entries, setEntries] = useState<JournalEntry[]>([]);

  const loadEntries = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.journalEntries);
      const parsed: JournalEntry[] = raw ? JSON.parse(raw) : [];
      parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEntries(parsed);
    } catch {
      // AsyncStorage parse failure — journal shows empty state gracefully
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        maxToRenderPerBatch={10}
        initialNumToRender={6}
        removeClippedSubviews
        contentContainerStyle={{
          paddingTop: topPadding + Spacing.lg,
          paddingBottom: bottomPadding + 120,
          paddingHorizontal: Spacing.xl,
          gap: Spacing.md,
        }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.listHeader}>
            <View style={styles.headerRow}>
              <View>
                <ThemedText variant="headlineLarge" color="textPrimary">
                  Mon Journal
                </ThemedText>
                {currentWeek ? (
                  <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: 4 }}>
                    Semaine {currentWeek} de grossesse
                  </ThemedText>
                ) : null}
              </View>
              <Pressable
                onPress={() => router.push(ROUTES.journalEntry)}
                style={({ pressed }) => [styles.newEntryBtn, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Feather name="plus" size={16} color="#fff" />
                <ThemedText variant="labelLarge" style={styles.newEntryBtnText}>
                  Nouvelle entrée
                </ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        }
        ListEmptyComponent={
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.emptyState}>
            <ThemedText variant="headlineMedium" style={styles.emptyEmoji}>📖</ThemedText>
            <ThemedText variant="bodyLarge" color="textSecondary" style={styles.emptyText}>
              Votre journal est vide. Commencez à écrire votre première entrée !
            </ThemedText>
          </Animated.View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).duration(400)}>
            <EntryCard entry={item} />
          </Animated.View>
        )}
      />
    <FeatureDiscoverySheet {...__discovery_journal.sheetProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  listHeader: {
    marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  newEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  newEntryBtnText: {
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 24,
  },
  entryCard: {
    gap: Spacing.md,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  entryMetaText: {
    flex: 1,
    gap: 2,
  },
  symptomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  symptomBadge: {
    backgroundColor: Colors.accentLight,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  noteText: {
    lineHeight: 22,
  },
});
