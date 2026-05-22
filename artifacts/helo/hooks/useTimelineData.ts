import { swallow } from '@/lib/swallow';
/**
 * useTimelineData — Données de la timeline grossesse semaine par semaine.
 *
 * Agrège pour chaque semaine :
 *  - Le nombre de scans effectués (depuis l'historique local)
 *  - Le Glow Score calculé sur les produits du placard à cette semaine
 *  - Les événements médicaux/développementaux (getEventsForWeek)
 *
 * Utilisé par l'écran timeline pour afficher la progression de la grossesse
 * sous forme de graphique et de jalons. Les données sont recalculées à la demande
 * via `refresh()` sans re-fetch réseau (entièrement local).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { getEventsForWeek, type PregnancyEvent } from '@/constants/pregnancyEvents';
import { useProfile } from '@/hooks/useProfile';
import { STORAGE_KEYS } from '@/lib/storageKeys';

export interface WeekData {
  week: number;
  scanCount: number;
  glowScore: number | null;
  moodEmoji: string | null;
  events: PregnancyEvent[];
  hasJournalEntry: boolean;
  journalNote: string | null;
  journalSymptoms: string[];
}

function computeWeekFromDueDate(dueDate: string | null): number | null {
  if (!dueDate) return null;
  try {
    const due = new Date(dueDate);
    const now = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksRemaining = (due.getTime() - now.getTime()) / msPerWeek;
    const week = Math.round(40 - weeksRemaining);
    if (week < 1) return null;
    return week;
  } catch {
    return null;
  }
}

function computeGlowScore(safe: number, caution: number, danger: number): number {
  const total = safe + caution + danger;
  if (total === 0) return 0;
  let score = (safe * 100 + caution * 40) / total;
  if (danger === 0) score = Math.min(100, score + 5);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function useTimelineData() {
  const { dueDate } = useProfile();
  const currentWeek = computeWeekFromDueDate(dueDate ?? null);

  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const journalRaw = await AsyncStorage.getItem(STORAGE_KEYS.journalEntries);
      const journalEntries: Array<{
        id: string;
        date: string;
        mood: string;
        symptoms: string[];
        note: string;
        weekOfPregnancy: number | null;
      }> = journalRaw ? JSON.parse(journalRaw) : [];

      const shelfRaw = await AsyncStorage.getItem(STORAGE_KEYS.shelf);
      const shelfItems: Array<{
        id: string;
        verdict?: string;
        scannedAt?: string;
        weekOfPregnancy?: number;
      }> = shelfRaw ? JSON.parse(shelfRaw) : [];

      const weekMap: Record<number, {
        safe: number;
        caution: number;
        danger: number;
        moodEmoji: string | null;
        hasJournalEntry: boolean;
        journalNote: string | null;
        journalSymptoms: string[];
      }> = {};

      for (let w = 1; w <= 40; w++) {
        weekMap[w] = {
          safe: 0,
          caution: 0,
          danger: 0,
          moodEmoji: null,
          hasJournalEntry: false,
          journalNote: null,
          journalSymptoms: [],
        };
      }

      for (const item of shelfItems) {
        const w = item.weekOfPregnancy;
        if (w && w >= 1 && w <= 40) {
          const entry = weekMap[w];
          if (item.verdict === 'safe') entry.safe++;
          else if (item.verdict === 'caution') entry.caution++;
          else if (item.verdict === 'danger') entry.danger++;
        }
      }

      for (const entry of journalEntries) {
        const w = entry.weekOfPregnancy;
        if (w && w >= 1 && w <= 40) {
          const slot = weekMap[w];
          slot.hasJournalEntry = true;
          if (!slot.moodEmoji) slot.moodEmoji = entry.mood;
          if (!slot.journalNote && entry.note) slot.journalNote = entry.note;
          if (slot.journalSymptoms.length === 0 && entry.symptoms.length > 0) {
            slot.journalSymptoms = entry.symptoms;
          }
        }
      }

      const result: WeekData[] = [];
      for (let w = 1; w <= 40; w++) {
        const slot = weekMap[w];
        const scanCount = slot.safe + slot.caution + slot.danger;
        const glowScore = scanCount > 0
          ? computeGlowScore(slot.safe, slot.caution, slot.danger)
          : null;

        result.push({
          week: w,
          scanCount,
          glowScore,
          moodEmoji: slot.moodEmoji,
          events: getEventsForWeek(w),
          hasJournalEntry: slot.hasJournalEntry,
          journalNote: slot.journalNote,
          journalSymptoms: slot.journalSymptoms,
        });
      }

      setWeeks(result);
    } catch (err) { swallow(err); } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    weeks,
    isLoading,
    currentWeek,
    reload: load,
  };
}
