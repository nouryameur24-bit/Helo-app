/**
 * lib/chatLimit.ts — Daily chat question counter for free users
 *
 * FREE tier: 5 questions / day (reset at midnight local time)
 * AsyncStorage schema:
 *   @helo_chat_limit → JSON { date: 'YYYY-MM-DD', count: number }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LIMIT_KEY = '@helo_chat_limit';
export const FREE_CHAT_LIMIT = 5;

interface ChatLimitData {
  date: string;
  count: number;
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function readLimit(): Promise<ChatLimitData> {
  try {
    const raw = await AsyncStorage.getItem(LIMIT_KEY);
    if (!raw) return { date: todayString(), count: 0 };
    const parsed: ChatLimitData = JSON.parse(raw);
    if (parsed.date !== todayString()) return { date: todayString(), count: 0 };
    return parsed;
  } catch {
    return { date: todayString(), count: 0 };
  }
}

async function writeLimit(data: ChatLimitData): Promise<void> {
  try {
    await AsyncStorage.setItem(LIMIT_KEY, JSON.stringify(data));
  } catch {}
}

export async function getDailyChatCount(): Promise<number> {
  const data = await readLimit();
  return data.count;
}

export async function canChatFree(): Promise<boolean> {
  const data = await readLimit();
  return data.count < FREE_CHAT_LIMIT;
}

export async function incrementChatCount(): Promise<number> {
  const data = await readLimit();
  const updated: ChatLimitData = { date: todayString(), count: data.count + 1 };
  await writeLimit(updated);
  return updated.count;
}
