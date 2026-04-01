import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthedClient, isSupabaseConfigured } from '@/lib/supabase';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_CIRCLE_MEMBERS = 8;
const WEEKLY_CHALLENGE_GOAL = 5;

export interface Circle {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  first_name: string;
  joined_at: string;
}

export interface CircleFeedEntry {
  id: string;
  circle_id: string;
  user_id: string;
  first_name: string;
  type: 'scan' | 'message' | 'reaction';
  product_name?: string;
  verdict?: 'safe' | 'caution' | 'danger';
  message_text?: string;
  reactions: Record<string, number>;
  user_reactions: Record<string, string>;
  created_at: string;
}

export interface CircleData {
  circle: Circle;
  members: CircleMember[];
}

export interface WeeklyChallenge {
  label: string;
  goal: number;
  progress: Record<string, number>;
  weekLabel: string;
}

function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

async function checkIsPremium(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem('@helo_is_premium');
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function createCircle(userId: string, firstName: string): Promise<Circle> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase non configuré');
  }

  const isPremium = await checkIsPremium();
  if (!isPremium) {
    throw new Error('PREMIUM_REQUIRED');
  }

  const existing = await getCircle(userId);
  if (existing) {
    throw new Error('Vous avez déjà un cercle.');
  }

  const db = getAuthedClient(userId);

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const invite_code = generateInviteCode();

    const { data: circleData, error: circleError } = await db
      .from('circles')
      .insert({ invite_code, owner_id: userId, name: 'Mon Cercle' })
      .select()
      .single();

    if (circleError) {
      if (circleError.message.includes('unique') || circleError.message.includes('duplicate')) {
        lastError = new Error(circleError.message);
        continue;
      }
      throw new Error(circleError.message);
    }

    const { error: memberError } = await db.from('circle_members').insert({
      circle_id: circleData.id,
      user_id: userId,
      first_name: firstName,
    });

    if (memberError) throw new Error(memberError.message);

    return circleData as Circle;
  }

  throw lastError ?? new Error('Impossible de créer le cercle.');
}

export async function joinCircle(userId: string, firstName: string, code: string): Promise<Circle> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase non configuré');
  }

  const db = getAuthedClient(userId);

  // Enforce single-circle-per-user constraint
  const { data: existingMembership } = await db
    .from('circle_members')
    .select('circle_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingMembership) {
    throw new Error("Vous êtes déjà membre d'un cercle. Quittez-le avant d'en rejoindre un autre.");
  }

  // Use the SECURITY DEFINER RPC so invite code lookup + member count works before membership
  const { data: circleRows, error: findError } = await db.rpc('find_circle_by_invite_code', {
    p_invite_code: code.trim().toUpperCase(),
  });

  const circleRow = circleRows && circleRows.length > 0 ? circleRows[0] : null;

  if (findError || !circleRow) {
    throw new Error('Code invalide. Vérifiez le code et réessayez.');
  }

  if ((circleRow.member_count ?? 0) >= MAX_CIRCLE_MEMBERS) {
    throw new Error('Ce cercle est complet (8 membres maximum).');
  }

  const { error: joinError } = await db.from('circle_members').insert({
    circle_id: circleRow.id,
    user_id: userId,
    first_name: firstName,
  });

  if (joinError) {
    if (joinError.message.includes('unique') || joinError.message.includes('duplicate')) {
      const { id, name, invite_code, owner_id, created_at } = circleRow;
      return { id, name, invite_code, owner_id, created_at } as Circle;
    }
    if (joinError.message.includes('full') || joinError.message.includes('8 member')) {
      throw new Error('Ce cercle est complet (8 membres maximum).');
    }
    throw new Error(joinError.message);
  }

  const { id, name, invite_code, owner_id, created_at } = circleRow;
  return { id, name, invite_code, owner_id, created_at } as Circle;
}

export async function getCircle(userId: string): Promise<CircleData | null> {
  if (!isSupabaseConfigured) return null;

  const db = getAuthedClient(userId);

  const { data: memberRow } = await db
    .from('circle_members')
    .select('circle_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!memberRow?.circle_id) return null;

  const { data: circle, error: circleError } = await db
    .from('circles')
    .select('*')
    .eq('id', memberRow.circle_id)
    .maybeSingle();

  if (circleError || !circle) return null;

  const { data: members } = await db
    .from('circle_members')
    .select('*')
    .eq('circle_id', circle.id)
    .order('joined_at', { ascending: true });

  return {
    circle: circle as Circle,
    members: (members ?? []) as CircleMember[],
  };
}

export async function leaveCircle(userId: string, circleId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const db = getAuthedClient(userId);

  const { data: circle } = await db
    .from('circles')
    .select('owner_id')
    .eq('id', circleId)
    .maybeSingle();

  if (circle?.owner_id === userId) {
    await db.from('circles').delete().eq('id', circleId);
  } else {
    await db
      .from('circle_members')
      .delete()
      .eq('circle_id', circleId)
      .eq('user_id', userId);
  }
}

export async function postMessage(
  circleId: string,
  userId: string,
  firstName: string,
  text: string,
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const db = getAuthedClient(userId);
  const { error } = await db.from('circle_feed').insert({
    circle_id: circleId,
    user_id: userId,
    first_name: firstName,
    type: 'message',
    message_text: text,
  });

  if (error) throw new Error(error.message);
}

export async function postScanToCircle(params: {
  circleId: string;
  userId: string;
  firstName: string;
  productName: string;
  verdict: 'safe' | 'caution' | 'danger';
}): Promise<void> {
  if (!isSupabaseConfigured) return;

  const db = getAuthedClient(params.userId);
  const { error } = await db.from('circle_feed').insert({
    circle_id: params.circleId,
    user_id: params.userId,
    first_name: params.firstName,
    type: 'scan',
    product_name: params.productName,
    verdict: params.verdict,
  });

  if (error) throw new Error(error.message);
}

export async function toggleReaction(
  entryId: string,
  userId: string,
  emoji: string,
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const db = getAuthedClient(userId);

  // Use the atomic SECURITY DEFINER RPC to avoid read-modify-write races
  const { error } = await db.rpc('toggle_circle_reaction', {
    p_entry_id: entryId,
    p_user_id: userId,
    p_emoji: emoji,
  });

  if (error) throw new Error(error.message);
}

export async function getCircleFeed(
  circleId: string,
  userId: string,
  limit = 50,
): Promise<CircleFeedEntry[]> {
  if (!isSupabaseConfigured) return [];

  const db = getAuthedClient(userId);
  const { data } = await db
    .from('circle_feed')
    .select('*')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []) as CircleFeedEntry[];
}

export function getWeeklyChallenge(
  members: CircleMember[],
  feedEntries: CircleFeedEntry[],
): WeeklyChallenge {
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  const weekEntries = feedEntries.filter(
    (e) => e.type === 'scan' && new Date(e.created_at) >= monday,
  );

  const progress: Record<string, number> = {};
  for (const member of members) {
    progress[member.user_id] = 0;
  }
  for (const entry of weekEntries) {
    if (progress[entry.user_id] !== undefined) {
      progress[entry.user_id] += 1;
    }
  }

  const weekNum = getISOWeek(now);
  const weekLabel = `Semaine ${weekNum}`;

  return {
    label: `Scannez ${WEEKLY_CHALLENGE_GOAL} produits chacune cette semaine`,
    goal: WEEKLY_CHALLENGE_GOAL,
    progress,
    weekLabel,
  };
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function computeCircleGlowScore(
  members: CircleMember[],
  feedEntries: CircleFeedEntry[],
): number {
  const scanEntries = feedEntries.filter((e) => e.type === 'scan' && e.verdict);
  if (scanEntries.length === 0) return 0;

  const total = scanEntries.length;
  const safe = scanEntries.filter((e) => e.verdict === 'safe').length;
  const caution = scanEntries.filter((e) => e.verdict === 'caution').length;

  const score = (safe * 100 + caution * 40) / total;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function checkAndSendWeekMilestoneNotification(params: {
  userId: string;
  firstName: string;
  currentWeek: number;
}): Promise<void> {
  if (!isSupabaseConfigured || !params.currentWeek || params.currentWeek < 1) return;

  const storageKey = `@helo_circle_week_notified_${params.userId}`;

  try {
    const lastNotifiedRaw = await AsyncStorage.getItem(storageKey);
    const lastNotifiedWeek = lastNotifiedRaw ? parseInt(lastNotifiedRaw, 10) : 0;

    if (lastNotifiedWeek === params.currentWeek) return;

    const data = await getCircle(params.userId);
    if (!data) return;

    await AsyncStorage.setItem(storageKey, String(params.currentWeek));

    const { sendCircleWeekNotification } = await import('@/lib/notifications');
    await sendCircleWeekNotification({
      memberFirstName: params.firstName,
      weekNumber: params.currentWeek,
      circleId: data.circle.id,
      memberUserId: params.userId,
    });
  } catch {
    // Notification delivery failure — circle still created, user can enable notifications later
  }
}

export function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHr < 24) return `Il y a ${diffHr}h`;
  if (diffDay === 1) return 'Hier';
  if (diffDay < 7) return `Il y a ${diffDay} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function getMemberColor(userId: string): string {
  const colors = [
    '#C9A96E', '#7CB69F', '#D4A853', '#C27B7B',
    '#8B9EC7', '#C47BB5', '#7BB5C4', '#9EC47B',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) % colors.length;
  }
  return colors[Math.abs(hash) % colors.length];
}
