import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { Config } from '@/lib/config';

const supabaseUrl = Config.supabaseUrl;
const supabaseAnonKey = Config.supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

/**
 * Returns a Supabase client that passes the app-level user ID as a custom
 * request header so that RLS policies can identify the calling user.
 * This client should be used for all circle read/write operations.
 */
export function getAuthedClient(userId: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'x-app-user-id': userId,
      },
    },
  });
}
