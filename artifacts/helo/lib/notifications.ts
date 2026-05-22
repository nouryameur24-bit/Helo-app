import { swallow } from '@/lib/swallow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { STORAGE_KEYS } from '@/lib/storageKeys';

export const NOTIFICATION_SETTINGS_KEY = STORAGE_KEYS.notificationSettings;

export type NotificationType =
  | 'weekly_brief'
  | 'trimester_change'
  | 'product_reclassified'
  | 'partner_activity'
  | 'inactivity_reminder'
  | 'community_approved'
  | 'recall_alert'
  | 'pact_reminder'
  | 'capsule_ready';

export interface NotificationSettings {
  weekly_brief: boolean;
  trimester_change: boolean;
  product_reclassified: boolean;
  partner_activity: boolean;
  inactivity_reminder: boolean;
  community_approved: boolean;
  recall_alert: boolean;
  pact_reminder: boolean;
  capsule_ready: boolean;
  maxPerWeek: number;
  quietHours: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  weekly_brief: true,
  trimester_change: true,
  product_reclassified: true,
  partner_activity: true,
  inactivity_reminder: true,
  community_approved: true,
  recall_alert: true,
  pact_reminder: true,
  capsule_ready: true,
  maxPerWeek: 3,
  quietHours: true,
};

export const NOTIFICATION_LABELS: Record<NotificationType, { title: string; description: string }> = {
  weekly_brief: {
    title: 'Récapitulatif hebdomadaire',
    description: 'Un résumé de votre semaine de grossesse chaque lundi matin.',
  },
  trimester_change: {
    title: 'Changement de trimestre',
    description: 'Une notification lors de chaque passage à un nouveau trimestre.',
  },
  product_reclassified: {
    title: 'Produit reclassifié',
    description: "Alertes quand un produit de votre étagère change d'analyse.",
  },
  partner_activity: {
    title: 'Activité du partenaire',
    description: "Mises à jour lorsque votre partenaire utilise l'application.",
  },
  inactivity_reminder: {
    title: 'Rappel de scan',
    description: "Un rappel doux si vous n'avez pas scanné de produit récemment.",
  },
  community_approved: {
    title: 'Communauté',
    description: 'Notifications lors de nouvelles approbations communautaires.',
  },
  recall_alert: {
    title: 'Alertes rappels produits',
    description: 'Alertes urgentes si un produit de votre placard fait l\'objet d\'un rappel.',
  },
  pact_reminder: {
    title: 'Rappel du Pacte',
    description: 'Un rappel à 20h si vous n\'avez pas encore scanné aujourd\'hui.',
  },
  capsule_ready: {
    title: 'Capsule Hēlo prête',
    description: 'Une notification le jour où une capsule souvenir peut être ouverte.',
  },
};

export interface NotificationPayload extends Record<string, unknown> {
  type: NotificationType;
  data?: Record<string, string | number | boolean>;
}

export function buildDeepLinkPayload(type: NotificationType, data?: Record<string, string | number | boolean>): NotificationPayload {
  return { type, data };
}

export function getDeepLinkRoute(
  type: NotificationType,
  data?: Record<string, string | number | boolean>,
): string {
  switch (type) {
    case 'weekly_brief':
      return '/(tabs)';
    case 'trimester_change':
      return '/trimester-milestone';
    case 'product_reclassified': {
      const barcode = data?.barcode ? String(data.barcode) : null;
      if (barcode) {
        return `/(tabs)/shelf?highlight=${encodeURIComponent(barcode)}`;
      }
      return '/(tabs)/shelf';
    }
    case 'partner_activity':
      return '/(tabs)/profile';
    case 'inactivity_reminder':
      return '/(tabs)/scan';
    case 'community_approved':
      return '/(tabs)';
    case 'recall_alert':
      return '/(tabs)/shelf';
    case 'pact_reminder':
      return '/pact';
    case 'capsule_ready':
      return '/memories';
    default:
      return '/(tabs)';
  }
}

const QUIET_HOUR_START = 22;
const QUIET_HOUR_END = 8;

function applyQuietHours(date: Date): Date {
  const h = date.getHours();
  const inQuiet = h >= QUIET_HOUR_START || h < QUIET_HOUR_END;
  if (!inQuiet) return date;

  const next = new Date(date);
  next.setHours(QUIET_HOUR_END, 0, 0, 0);
  if (h < QUIET_HOUR_END) {
    // same day, move to 8h
  } else {
    // after 22h, move to 8h next day
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
}

const WEEKLY_CAP_KEY = STORAGE_KEYS.notificationWeeklyCap;

interface WeeklyCap {
  weekStart: number;
  count: number;
}

function getWeekStart(): number {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

async function checkWeeklyCap(maxPerWeek: number): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(WEEKLY_CAP_KEY);
    const weekStart = getWeekStart();
    const cap: WeeklyCap = raw ? JSON.parse(raw) : { weekStart, count: 0 };
    if (cap.weekStart !== weekStart) return true;
    return cap.count < maxPerWeek;
  } catch {
    return true;
  }
}

async function incrementWeeklyCap(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(WEEKLY_CAP_KEY);
    const weekStart = getWeekStart();
    let cap: WeeklyCap = raw ? JSON.parse(raw) : { weekStart, count: 0 };
    if (cap.weekStart !== weekStart) {
      cap = { weekStart, count: 0 };
    }
    cap.count++;
    await AsyncStorage.setItem(WEEKLY_CAP_KEY, JSON.stringify(cap));
  } catch (err) { swallow(err); }
}

export async function initAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('helo-default', {
    name: 'Notifications Hēlo',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#C9A96E',
  });
  await Notifications.setNotificationChannelAsync('helo-milestones', {
    name: 'Jalons de grossesse',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#C9A96E',
  });
}

export interface ScheduleOptions {
  type: NotificationType;
  title: string;
  body: string;
  scheduledAt?: Date;
  data?: Record<string, string | number | boolean>;
}

export async function scheduleNotification(opts: ScheduleOptions): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const settings = await getNotificationSettings();

  if (!settings[opts.type]) return null;

  const canSend = await checkWeeklyCap(settings.maxPerWeek);
  if (!canSend) return null;

  let fireDate = opts.scheduledAt ?? new Date(Date.now() + 5000);

  if (settings.quietHours) {
    fireDate = applyQuietHours(fireDate);
  }

  const now = Date.now();
  const seconds = Math.max(1, Math.floor((fireDate.getTime() - now) / 1000));

  const channelId =
    opts.type === 'trimester_change' ? 'helo-milestones' : 'helo-default';

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: opts.title,
        body: opts.body,
        data: buildDeepLinkPayload(opts.type, opts.data),
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
    await incrementWeeklyCap();
    return id;
  } catch (err) {
    if (__DEV__) console.warn('[notifications] scheduleNotification error:', err);
    return null;
  }
}

export async function cancelNotification(id: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// ─── Partner Mode: push token registration ────────────────────────────────────

export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    if (isSupabaseConfigured && pushToken) {
      await supabase
        .from('profiles')
        .upsert(
          { id: userId, push_token: pushToken, updated_at: new Date().toISOString() },
          { onConflict: 'id' },
        );
    }
  } catch (err) {
    if (__DEV__) console.warn('[notifications] registerPushToken error:', err);
  }
}

// ─── Partner Mode: cross-device shelf notification ────────────────────────────

async function sendExpoPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
): Promise<void> {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data: { source: 'helo-partner' },
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

export async function sendCircleScanNotification(params: {
  senderFirstName: string;
  productName: string;
  verdict: string;
  circleId: string;
}): Promise<void> {
  if (!isSupabaseConfigured) return;

  const verdictLabel =
    params.verdict === 'danger' ? 'À éviter' :
    params.verdict === 'caution' ? 'Précaution' : 'Compatible';
  const title = 'Mon Cercle';
  const body = `${params.senderFirstName} a scanné ${params.productName} — ${verdictLabel}`;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const senderUserId = user.id;

    const { data: members } = await supabase
      .from('circle_members')
      .select('user_id')
      .eq('circle_id', params.circleId)
      .neq('user_id', senderUserId);

    if (!members || members.length === 0) return;

    const memberIds = members.map((m: { user_id: string }) => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('push_token')
      .in('id', memberIds);

    const pushPromises = (profiles ?? []).map(async (p: { push_token: string | null }) => {
      const token = p.push_token;
      if (token && typeof token === 'string' && token.startsWith('ExponentPushToken')) {
        await sendExpoPushNotification(token, title, body);
      }
    });

    await Promise.allSettled(pushPromises);
  } catch (err) {
    if (__DEV__) console.warn('[notifications] sendCircleScanNotification error:', err);
  }
}

export async function sendCircleWeekNotification(params: {
  memberFirstName: string;
  weekNumber: number;
  circleId: string;
}): Promise<void> {
  if (!isSupabaseConfigured) return;

  const title = 'Mon Cercle 🎉';
  const body = `${params.memberFirstName} entre dans sa ${params.weekNumber}ème semaine !`;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const memberUserId = user.id;

    const { data: members } = await supabase
      .from('circle_members')
      .select('user_id')
      .eq('circle_id', params.circleId)
      .neq('user_id', memberUserId);

    if (!members || members.length === 0) return;

    const memberIds = members.map((m: { user_id: string }) => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('push_token')
      .in('id', memberIds);

    const pushPromises = (profiles ?? []).map(async (p: { push_token: string | null }) => {
      const token = p.push_token;
      if (token && typeof token === 'string' && token.startsWith('ExponentPushToken')) {
        await sendExpoPushNotification(token, title, body);
      }
    });

    await Promise.allSettled(pushPromises);
  } catch (err) {
    if (__DEV__) console.warn('[notifications] sendCircleWeekNotification error:', err);
  }
}

export async function sendShelfAddNotification(params: {
  firstName: string;
  productName: string;
  recipientUserId: string;
}): Promise<void> {
  const title = 'Placard mis à jour';
  const body = `${params.firstName} a ajouté "${params.productName}" à votre placard`;

  try {
    if (isSupabaseConfigured) {
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', params.recipientUserId)
        .maybeSingle();

      const pushToken = recipientProfile?.push_token;
      if (pushToken && typeof pushToken === 'string' && pushToken.startsWith('ExponentPushToken')) {
        await sendExpoPushNotification(pushToken, title, body);
        return;
      }
    }

    if (Platform.OS !== 'web') {
      await scheduleNotification({
        type: 'partner_activity',
        title,
        body,
      });
    }
  } catch (err) {
    if (__DEV__) console.warn('[notifications] sendShelfAddNotification error:', err);
  }
}
