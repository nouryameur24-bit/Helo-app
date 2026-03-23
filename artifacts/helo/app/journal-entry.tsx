import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Card } from '@/components/ui/Card';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';

import type { JournalEntry } from './(tabs)/journal';

const MOODS = ['😍', '😊', '😐', '😔', '😰'];
const MOOD_LABELS: Record<string, string> = {
  '😍': 'Amoureuse',
  '😊': 'Heureuse',
  '😐': 'Neutre',
  '😔': 'Fatiguée',
  '😰': 'Anxieuse',
};

const SYMPTOMS = [
  'Nausées',
  'Fatigue',
  'Maux de dos',
  'Insomnies',
  'Crampes',
  'Reflux',
  'Gonflement',
];

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

export default function JournalEntryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { dueDate } = useProfile();
  const currentWeek = computeWeekFromDueDate(dueDate ?? null);

  const today = new Date();
  const dateLabel = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const [selectedMood, setSelectedMood] = useState<string>('😊');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const raw = await AsyncStorage.getItem('journal_entries');
      const existing: JournalEntry[] = raw ? JSON.parse(raw) : [];

      const entry: JournalEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        date: today.toISOString(),
        mood: selectedMood,
        symptoms: selectedSymptoms,
        note: note.trim(),
        weekOfPregnancy: currentWeek,
      };

      existing.push(entry);
      await AsyncStorage.setItem('journal_entries', JSON.stringify(existing));
      router.back();
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'entrée. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: Colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        style={[
          styles.navBar,
          { paddingTop: insets.top + Spacing.md },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="x" size={22} color={Colors.textPrimary} />
        </Pressable>
        <ThemedText variant="headlineMedium" color="textPrimary">
          Nouvelle entrée
        </ThemedText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Date display */}
        <View style={styles.dateSection}>
          <Feather name="calendar" size={16} color={Colors.textTertiary} />
          <ThemedText variant="bodyMedium" color="textSecondary">
            {dateLabel}
            {currentWeek ? ` · Semaine ${currentWeek}` : ''}
          </ThemedText>
        </View>

        {/* Mood selector */}
        <Card padding={Spacing.lg} style={styles.section}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
            HUMEUR DU JOUR
          </ThemedText>
          <View style={styles.moodRow}>
            {MOODS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => setSelectedMood(emoji)}
                style={({ pressed }) => [
                  styles.moodBtn,
                  selectedMood === emoji && styles.moodBtnActive,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <ThemedText style={styles.moodEmoji}>{emoji}</ThemedText>
                {selectedMood === emoji && (
                  <ThemedText variant="bodySmall" color="accentDark" style={styles.moodLabel}>
                    {MOOD_LABELS[emoji]}
                  </ThemedText>
                )}
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Symptoms */}
        <Card padding={Spacing.lg} style={styles.section}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
            SYMPTÔMES
          </ThemedText>
          <View style={styles.symptomsGrid}>
            {SYMPTOMS.map((symptom) => {
              const active = selectedSymptoms.includes(symptom);
              return (
                <Pressable
                  key={symptom}
                  onPress={() => toggleSymptom(symptom)}
                  style={({ pressed }) => [
                    styles.symptomChip,
                    active && styles.symptomChipActive,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <ThemedText
                    variant="bodySmall"
                    color={active ? 'accentDark' : 'textSecondary'}
                  >
                    {symptom}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Notes */}
        <Card padding={Spacing.lg} style={styles.section}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
            NOTES PERSONNELLES
          </ThemedText>
          <TextInput
            style={styles.textInput}
            placeholder="Comment vous sentez-vous aujourd'hui ?"
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={6}
            value={note}
            onChangeText={setNote}
            textAlignVertical="top"
          />
        </Card>
      </ScrollView>

      {/* Save button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            { opacity: pressed || saving ? 0.7 : 1 },
          ]}
        >
          <ThemedText variant="labelLarge" style={styles.saveBtnText}>
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </ThemedText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  section: {
    gap: Spacing.md,
  },
  sectionLabel: {
    marginBottom: Spacing.xs,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  moodBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 52,
  },
  moodBtnActive: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  moodEmoji: {
    fontSize: 30,
  },
  moodLabel: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 10,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  symptomChip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  symptomChipActive: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  textInput: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 22,
    minHeight: 120,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  saveBtnText: {
    color: '#fff',
  },
});
