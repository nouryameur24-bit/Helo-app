// ─── Pact — Engagement social quotidien ─────────────────────────────────────
//
// Gère l'état du Pacte Hēlo en local (AsyncStorage) + best-effort Supabase.
// Appelé par : app/pact.tsx, app/(tabs)/scan.tsx, app/(tabs)/index.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { scheduleNotification } from '@/lib/notifications';
import { STORAGE_KEYS } from '@/lib/storageKeys';

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const PACT_KEY = STORAGE_KEYS.pact;
export const LAST_SCAN_DATE_KEY = STORAGE_KEYS.lastScanDate;
export const PACT_BADGES_KEY = STORAGE_KEYS.pactBadges;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PactWitness {
  id: string;
  name: string;
}

export interface PactState {
  id: string;
  duration: number;
  startDate: string;
  currentStreak: number;
  longestStreak: number;
  status: 'active' | 'completed' | 'abandoned';
  witnesses: PactWitness[];
  lastScanDate: string | null;
}

export type PactBadgeId = 'semaine_1' | 'deux_semaines' | 'maman_engagee';

export interface PactBadge {
  id: PactBadgeId;
  emoji: string;
  label: string;
  description: string;
  requiredDays: number;
}

export const PACT_BADGES: PactBadge[] = [
  {
    id: 'semaine_1',
    emoji: '🌱',
    label: 'Première semaine',
    description: '7 jours de scan consécutifs',
    requiredDays: 7,
  },
  {
    id: 'deux_semaines',
    emoji: '🌿',
    label: 'Deux semaines',
    description: '14 jours de scan consécutifs',
    requiredDays: 14,
  },
  {
    id: 'maman_engagee',
    emoji: '🏆',
    label: 'Maman Engagée',
    description: '30 jours de scan consécutifs',
    requiredDays: 30,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Load / Save ──────────────────────────────────────────────────────────────

export async function loadPact(): Promise<PactState | null> {
  try {
    const raw = await AsyncStorage.getItem(PACT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PactState;
  } catch {
    return null;
  }
}

async function savePact(pact: PactState): Promise<void> {
  await AsyncStorage.setItem(PACT_KEY, JSON.stringify(pact));

  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('pacts').upsert({
      id: pact.id,
      start_date: pact.startDate,
      duration_days: pact.duration,
      current_streak: pact.currentStreak,
      longest_streak: pact.longestStreak,
      status: pact.status,
    }, { onConflict: 'id' });
  } catch {
    // Supabase sync failure — pact stored locally, synced on next successful connection
  }
}

export async function loadEarnedBadges(): Promise<PactBadgeId[]> {
  try {
    const raw = await AsyncStorage.getItem(PACT_BADGES_KEY);
    return raw ? (JSON.parse(raw) as PactBadgeId[]) : [];
  } catch {
    return [];
  }
}

async function saveEarnedBadges(badges: PactBadgeId[]): Promise<void> {
  await AsyncStorage.setItem(PACT_BADGES_KEY, JSON.stringify(badges));
}

// ─── Create Pact ──────────────────────────────────────────────────────────────

export async function createPact(
  duration: number,
  witnesses: PactWitness[],
): Promise<PactState> {
  const id = generateId();
  const pact: PactState = {
    id,
    duration,
    startDate: todayStr(),
    currentStreak: 0,
    longestStreak: 0,
    status: 'active',
    witnesses,
    lastScanDate: null,
  };

  await savePact(pact);

  if (isSupabaseConfigured && witnesses.length > 0) {
    try {
      const witnessRows = witnesses.map((w) => ({
        pact_id: id,
        witness_user_id: w.id,
        invited_via: 'circle' as const,
      }));
      await supabase.from('pact_witnesses').insert(witnessRows);
    } catch {
      // Witness invite insert failure — pact created without witnesses, user can re-invite later
    }
  }

  return pact;
}

// ─── Daily scan tracking ──────────────────────────────────────────────────────

/**
 * Called after every successful product scan.
 * Returns the list of newly earned badge IDs.
 */
export async function onProductScanned(firstName: string): Promise<PactBadgeId[]> {
  const pact = await loadPact();
  if (!pact || pact.status !== 'active') return [];

  const today = todayStr();
  if (pact.lastScanDate === today) return [];

  // Update streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const newStreak =
    pact.lastScanDate === yesterdayStr ? pact.currentStreak + 1 : 1;

  const dayOfPact = Math.floor(
    (new Date(today).getTime() - new Date(pact.startDate).getTime()) /
      86_400_000,
  ) + 1;

  const isCompleted = dayOfPact >= pact.duration;

  const updatedPact: PactState = {
    ...pact,
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, pact.longestStreak),
    lastScanDate: today,
    status: isCompleted ? 'completed' : 'active',
  };

  await savePact(updatedPact);
  await AsyncStorage.setItem(LAST_SCAN_DATE_KEY, today);

  // Check for new badges
  const earned = await loadEarnedBadges();
  const newBadges: PactBadgeId[] = [];
  for (const badge of PACT_BADGES) {
    if (!earned.includes(badge.id) && newStreak >= badge.requiredDays) {
      newBadges.push(badge.id);
    }
  }
  if (newBadges.length > 0) {
    await saveEarnedBadges([...earned, ...newBadges]);
  }

  // Notify witnesses (best-effort — local notification as proxy when no push)
  if (pact.witnesses.length > 0) {
    const dayLabel = `jour ${dayOfPact}/${pact.duration}`;
    await scheduleNotification({
      type: 'pact_reminder',
      title: `${firstName} a tenu son pacte — ${dayLabel} ✓ 🔥`,
      body: `Envoyez-lui un encouragement !`,
    });
  }

  return newBadges;
}

// ─── Schedule daily reminder at 20:00 ─────────────────────────────────────────

export async function schedulePactReminder(_pact: PactState): Promise<void> {
  const fireAt = new Date();
  fireAt.setHours(20, 0, 0, 0);
  if (fireAt.getTime() <= Date.now()) {
    fireAt.setDate(fireAt.getDate() + 1);
  }

  await scheduleNotification({
    type: 'pact_reminder',
    title: 'Votre pacte vous attend 💛',
    body: "Vous n'avez pas encore scanné aujourd'hui — restez dans la série !",
    scheduledAt: fireAt,
  });
}

// ─── Abandon pact ─────────────────────────────────────────────────────────────

export async function abandonPact(): Promise<void> {
  const pact = await loadPact();
  if (!pact) return;
  await savePact({ ...pact, status: 'abandoned' });
}

// ─── Compute current day of pact ──────────────────────────────────────────────

export function computePactDay(pact: PactState): number {
  const today = new Date();
  const start = new Date(pact.startDate);
  const diff = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  return Math.min(diff + 1, pact.duration);
}

// ─── Flame size based on streak ───────────────────────────────────────────────

export function flameSize(streak: number): number {
  if (streak >= 25) return 48;
  if (streak >= 15) return 36;
  if (streak >= 7) return 28;
  return 22;
}
