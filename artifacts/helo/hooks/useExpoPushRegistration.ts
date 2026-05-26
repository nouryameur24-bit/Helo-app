/**
 * hooks/useExpoPushRegistration.ts — Lot 19-I1
 *
 * Enregistre l'Expo push token côté Supabase (table push_subscriptions)
 * pour permettre au backend de notifier l'user en cas de :
 *   - Rappel RappelConso sur un produit qu'elle a scanné
 *   - (futur) Recommandations contextuelles trimestre
 *   - (futur) Interaction médicament détectée
 *
 * Pattern : appelé une fois au signup + à chaque app open. Idempotent
 * (upsert sur user_id). Respect du flag `enabled` (toggle dans settings).
 *
 * Permissions : requestPermissionsAsync demandée explicitement avec un
 * pre-prompt UI dédié (pas auto au cold start — Apple n'aime pas).
 */
import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { swallow } from '@/lib/swallow';

/**
 * Demande la permission de push + récupère le token Expo + upsert en DB.
 * Returns le token si OK, null sinon.
 *
 * Appel typique : depuis un onboarding step "Activer les alertes de rappel".
 */
export async function registerExpoPushToken(userId: string): Promise<string | null> {
  // Web : pas de push natif (Notifications API web différent, hors scope)
  if (Platform.OS === 'web') return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      // User refused — pas grave, on retentera plus tard via toggle settings
      return null;
    }

    // Récupère le token Expo
    const projectId =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Notifications as any).getExpoPushTokenAsync !== undefined
        ? undefined
        : undefined;
    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResult.data;

    if (!token || !isSupabaseConfigured) return token ?? null;

    // Upsert vers Supabase (RLS : self-only via user_id = auth.uid())
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        expo_push_token: token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        enabled: true,
        recall_alerts_enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      logError('expoPushRegistration.upsert', new Error(error.message), { userId });
      return token;
    }

    return token;
  } catch (err) {
    logError('expoPushRegistration.unknown', err, { userId });
    return null;
  }
}

/**
 * Hook qui auto-register le token au mount si user authentifié.
 *
 * Pour éviter le prompt système au cold start (mauvaise UX Apple), n'appelle
 * registerExpoPushToken QUE si l'user a déjà accepté précédemment. Le 1er
 * prompt doit se faire depuis un screen dédié onboarding/settings.
 */
export function useExpoPushRegistration(userId: string | null): void {
  const tryRegister = useCallback(async () => {
    if (!userId) return;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      // Ne fait quelque chose QUE si déjà accordé (sinon on attend prompt explicite)
      if (status !== 'granted') return;
      await registerExpoPushToken(userId);
    } catch {
      // silent — non bloquant
    }
  }, [userId]);

  useEffect(() => {
    tryRegister().catch(swallow);
  }, [tryRegister]);
}
