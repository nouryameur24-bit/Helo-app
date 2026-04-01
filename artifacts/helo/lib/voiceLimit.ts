/**
 * lib/voiceLimit.ts — Daily voice question counter for free users
 *
 * FREE tier : 3 questions vocales / jour (reset à minuit)
 * AsyncStorage key : @helo_voice_limit → { date: 'YYYY-MM-DD', count: number }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LIMIT_KEY = '@helo_voice_limit';
export const FREE_VOICE_LIMIT = 3;

interface VoiceLimitData {
  date: string;
  count: number;
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function readLimit(): Promise<VoiceLimitData> {
  try {
    const raw = await AsyncStorage.getItem(LIMIT_KEY);
    if (!raw) return { date: todayString(), count: 0 };
    const parsed: VoiceLimitData = JSON.parse(raw);
    if (parsed.date !== todayString()) return { date: todayString(), count: 0 };
    return parsed;
  } catch {
    return { date: todayString(), count: 0 };
  }
}

async function writeLimit(data: VoiceLimitData): Promise<void> {
  try {
    await AsyncStorage.setItem(LIMIT_KEY, JSON.stringify(data));
  } catch {
    // Non-blocking — voice counter may not persist across restarts in edge cases
  }
}

export async function getDailyVoiceCount(): Promise<number> {
  const data = await readLimit();
  return data.count;
}

export async function canVoiceFree(): Promise<boolean> {
  const data = await readLimit();
  return data.count < FREE_VOICE_LIMIT;
}

export async function incrementVoiceCount(): Promise<number> {
  const data = await readLimit();
  const updated: VoiceLimitData = { date: todayString(), count: data.count + 1 };
  await writeLimit(updated);
  return updated.count;
}
