/**
 * User preferences captured during onboarding (allergies, dietary restrictions,
 * cosmetic sensitivities). Stored locally first — Hēlo works offline by design.
 *
 * The list values are kept as raw strings (chip labels) so they round-trip
 * cleanly between the onboarding UI and any downstream scan logic.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserPreferences {
  allergies: string[];
  dietary: string[];
  cosmetic_sensitivities: string[];
  updated_at: string;
}

const KEY = '@helo_user_preferences';

export async function getUserPreferences(): Promise<UserPreferences | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    // Defence-in-depth : guard against legacy / corrupted payloads.
    if (
      !parsed ||
      !Array.isArray(parsed.allergies) ||
      !Array.isArray(parsed.dietary) ||
      !Array.isArray(parsed.cosmetic_sensitivities) ||
      typeof parsed.updated_at !== 'string'
    ) {
      return null;
    }
    return {
      allergies: parsed.allergies,
      dietary: parsed.dietary,
      cosmetic_sensitivities: parsed.cosmetic_sensitivities,
      updated_at: parsed.updated_at,
    };
  } catch (err) {
    if (__DEV__) console.error('[userPreferences] read failed:', err);
    return null;
  }
}

export async function saveUserPreferences(
  prefs: Omit<UserPreferences, 'updated_at'>,
): Promise<void> {
  const payload: UserPreferences = {
    allergies: prefs.allergies,
    dietary: prefs.dietary,
    cosmetic_sensitivities: prefs.cosmetic_sensitivities,
    updated_at: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(payload));
}

export async function hasUserPreferences(): Promise<boolean> {
  const prefs = await getUserPreferences();
  return prefs !== null;
}
