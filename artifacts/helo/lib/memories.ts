import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import type { JournalEntry } from '@/app/journal';
import type { Trimester } from '@/types';

export const CAPSULES_KEY = 'memory_capsules';

export type CapsuleTrimester = Trimester | 'manual';

export type OpeningDatePreset = 'birth' | '1year' | '5years' | '18years' | 'custom';

export interface CapsuleData {
  avgGlowScore: number;
  scanCount: number;
  topProduct: string | null;
  firstDangerProduct: string | null;
  journalCount: number;
  circleMessages: number;
  journalEntries: JournalEntry[];
  topScans: Array<{ name: string; verdict: string }>;
}

export interface MemoryCapsule {
  id: string;
  trimester: CapsuleTrimester;
  trimesterLabel: string;
  data: CapsuleData;
  sealedAt: string;
  opensAt: string;
  opened: boolean;
  message?: string;
  photoUri?: string;
}

// ── Storage ───────────────────────────────────────────────────────────────────

export async function loadCapsules(): Promise<MemoryCapsule[]> {
  try {
    const raw = await AsyncStorage.getItem(CAPSULES_KEY);
    return raw ? (JSON.parse(raw) as MemoryCapsule[]) : [];
  } catch {
    return [];
  }
}

export async function saveCapsules(capsules: MemoryCapsule[]): Promise<void> {
  await AsyncStorage.setItem(CAPSULES_KEY, JSON.stringify(capsules));
}

export async function addCapsule(capsule: MemoryCapsule): Promise<void> {
  const existing = await loadCapsules();
  await saveCapsules([...existing, capsule]);
}

export async function markCapsuleOpened(capsuleId: string): Promise<void> {
  const capsules = await loadCapsules();
  const updated = capsules.map((c) =>
    c.id === capsuleId ? { ...c, opened: true } : c,
  );
  await saveCapsules(updated);
}

// ── Data compilation ──────────────────────────────────────────────────────────

interface LRUCacheEntry {
  barcode: string;
  product: { name: string };
  verdict: { verdict: string };
  cachedAt: number;
}

interface LRUCache {
  order: string[];
  entries: Record<string, LRUCacheEntry>;
}

export async function compileCapsuleData(): Promise<CapsuleData> {
  // Offline scan cache
  let scans: LRUCacheEntry[] = [];
  try {
    const raw = await AsyncStorage.getItem('@helo_offline_cache');
    if (raw) {
      const cache: LRUCache = JSON.parse(raw);
      scans = Object.values(cache.entries ?? {});
    }
  } catch {
    /* ignore */
  }

  // Glow score history
  let avgGlowScore = 0;
  try {
    const raw = await AsyncStorage.getItem('@helo_glow');
    if (raw) {
      const glowData: { history?: Array<{ score: number }> } = JSON.parse(raw);
      const history = glowData.history ?? [];
      if (history.length > 0) {
        avgGlowScore = Math.round(
          history.reduce((s, h) => s + (h.score ?? 0), 0) / history.length,
        );
      }
    }
  } catch {
    /* ignore */
  }

  // Top product & first danger
  const productCounts: Record<string, { name: string; count: number; verdict: string }> = {};
  let firstDangerProduct: string | null = null;

  for (const scan of scans) {
    const name = scan.product?.name ?? 'Produit inconnu';
    const verdict = scan.verdict?.verdict ?? 'safe';
    if (!productCounts[name]) {
      productCounts[name] = { name, count: 0, verdict };
    }
    productCounts[name].count++;
    if (!firstDangerProduct && (verdict === 'danger' || verdict === 'caution')) {
      firstDangerProduct = name;
    }
  }

  const sortedProducts = Object.values(productCounts).sort(
    (a, b) => b.count - a.count,
  );
  const topProduct = sortedProducts[0]?.name ?? null;

  const topScans = sortedProducts
    .slice(0, 5)
    .map((p) => ({ name: p.name, verdict: p.verdict }));

  // Journal entries
  let journalEntries: JournalEntry[] = [];
  try {
    const raw = await AsyncStorage.getItem('journal_entries');
    if (raw) journalEntries = JSON.parse(raw) as JournalEntry[];
  } catch {
    /* ignore */
  }

  // Circle messages
  let circleMessages = 0;
  try {
    const raw = await AsyncStorage.getItem('@helo_circle_feed');
    if (raw) {
      const feed = JSON.parse(raw);
      circleMessages = Array.isArray(feed) ? feed.length : 0;
    }
  } catch {
    /* ignore */
  }

  return {
    avgGlowScore,
    scanCount: scans.length,
    topProduct,
    firstDangerProduct,
    journalCount: journalEntries.length,
    circleMessages,
    journalEntries: journalEntries.slice(0, 3),
    topScans,
  };
}

// ── Opening date helpers ──────────────────────────────────────────────────────

export function computeOpensAt(
  preset: OpeningDatePreset,
  dueDate: string | null,
  customDate?: Date,
): Date {
  const base = dueDate ? new Date(dueDate) : new Date();

  switch (preset) {
    case 'birth':
      return base;
    case '1year': {
      const d = new Date(base);
      d.setFullYear(d.getFullYear() + 1);
      return d;
    }
    case '5years': {
      const d = new Date(base);
      d.setFullYear(d.getFullYear() + 5);
      return d;
    }
    case '18years': {
      const d = new Date(base);
      d.setFullYear(d.getFullYear() + 18);
      return d;
    }
    case 'custom':
      return customDate ?? base;
  }
}

export function formatOpensDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function formatSealedDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function isCapsuleOpenable(capsule: MemoryCapsule): boolean {
  return !capsule.opened && new Date() >= new Date(capsule.opensAt);
}

// ── Notification ──────────────────────────────────────────────────────────────

export async function scheduleCapsuleNotification(capsule: MemoryCapsule): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const triggerDate = new Date(capsule.opensAt);
    // Only schedule if in the future
    if (triggerDate <= new Date()) return;

    await Notifications.scheduleNotificationAsync({
      identifier: `capsule_ready_${capsule.id}`,
      content: {
        title: 'Une capsule Hēlo vous attend ! 💛',
        body: `Ouvrez-la pour revivre votre ${capsule.trimesterLabel}.`,
        data: { type: 'capsule_ready', capsuleId: capsule.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  } catch {
    /* ignore */
  }
}

// ── UUID helper ───────────────────────────────────────────────────────────────

export function generateId(): string {
  return `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
