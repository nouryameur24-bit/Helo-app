/**
 * lib/config.ts — Centralized environment configuration for Hēlo
 *
 * All environment variable access MUST go through this module.
 * Never call process.env directly in application code.
 *
 * Sensitive API keys (Anthropic, Google Vision) are now managed server-side
 * via Supabase Edge Function secrets — they are NOT exposed to the client app.
 * See docs/SECURITY.md for the full architecture.
 */

import { Platform } from 'react-native';

function readEnv(key: string): string {
  return (process.env as Record<string, string | undefined>)[key] ?? '';
}

export const Config = {
  supabaseUrl: readEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),

  // RevenueCat — separate keys per platform
  revenueCatKey:
    Platform.OS === 'ios'
      ? readEnv('EXPO_PUBLIC_RC_KEY_IOS')
      : readEnv('EXPO_PUBLIC_RC_KEY_ANDROID'),
} as const;

export type AppConfig = typeof Config;

/**
 * Validate that critical config values are present.
 * Logs a warning (dev only) when a required key is missing.
 * Never throws — the app degrades gracefully.
 */
export function validateConfig(): void {
  const critical: (keyof AppConfig)[] = ['supabaseUrl', 'supabaseAnonKey'];
  for (const key of critical) {
    if (!Config[key]) {
      if (__DEV__) {
        console.warn(`[Hēlo Config] Missing required env var for key: "${key}"`);
      }
    }
  }
}
