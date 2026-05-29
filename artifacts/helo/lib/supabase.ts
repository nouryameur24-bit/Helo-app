import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { Config } from '@/lib/config';

const supabaseUrl = Config.supabaseUrl;
const supabaseAnonKey = Config.supabaseAnonKey;

export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

// Audit fix #5 : `createClient` throw sur une URL vide/invalide AU MOMENT DE
// L'IMPORT. En env de test / preview (pas d'env vars), ça faisait planter
// 3 suites entières à l'import (cf. ancien Gotcha #1). On passe un placeholder
// au format valide quand non configuré — tous les vrais appels restent gatés
// par `isSupabaseConfigured`, donc aucun risque de requête vers le placeholder.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

/**
 * Garantit qu'une session Supabase (anonyme) existe et renvoie l'user.id.
 * - Si une session est déjà présente (persistée dans AsyncStorage), la retourne.
 * - Sinon, déclenche `signInAnonymously()` pour en créer une.
 *
 * Doit être appelé avant toute requête authentifiée. Throw si l'opération
 * échoue (ex: anonymous sign-ins désactivés dans le dashboard Supabase).
 */
export async function ensureAnonymousSession(): Promise<string> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw new Error(`Supabase session error: ${sessionError.message}`);
  }
  if (session?.user) {
    return session.user.id;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(
      `Anonymous sign-in failed: ${error?.message ?? 'no user returned'}. ` +
      'Vérifiez que "Anonymous Sign-Ins" est activé dans Supabase Dashboard → Authentication → Providers.',
    );
  }
  return data.user.id;
}
