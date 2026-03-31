/**
 * lib/config.ts — Centralized environment configuration for Hēlo
 *
 * All environment variable access MUST go through this module.
 * Never call process.env directly in application code.
 *
 * NOTE: EXPO_PUBLIC_* variables are inlined at build time by Expo.
 * Sensitive keys (Anthropic, Google Vision) should be moved to
 * Supabase Edge Functions in production. See docs/SECURITY.md.
 */

import { Platform } from 'react-native';

function readEnv(key: string): string {
  return (process.env as Record<string, string | undefined>)[key] ?? '';
}

export const Config = {
  supabaseUrl: readEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),

  // ⚠️ These keys are transitionally client-side.
  // In production they must live in Supabase Edge Functions (supabase/functions/).
  // See docs/SECURITY.md for the migration guide.
  googleVisionKey: readEnv('EXPO_PUBLIC_GOOGLE_VISION_KEY'),
  anthropicKey: readEnv('EXPO_PUBLIC_ANTHROPIC_API_KEY'),

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
