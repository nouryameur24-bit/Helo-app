/**
 * Lightweight local tracker for Ghost Capture contributions.
 *
 * Why local + AsyncStorage rather than reading `community_submissions`
 * directly from Supabase?
 *   • The reward toast must render instantly after `ghostCaptureSave` —
 *     a network round-trip would delay the celebration and break the
 *     reciprocity moment.
 *   • Offline contributors still see their badge upgrade.
 *   • Server-side `useProfileStats` remains the canonical source of truth
 *     for the Profile screen stats grid; this counter is purely a UX
 *     accelerator for the immediate post-save reward.
 *
 * The tier function intentionally lives next to the storage helpers so
 * every consumer (toast, badge, profile) renders the same label for the
 * same threshold. Thresholds are empirical — tweak with product feedback.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@helo_ghost_contributions_count';

export async function getContributionCount(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function incrementContributionCount(): Promise<number> {
  const current = await getContributionCount();
  const next = current + 1;
  try {
    await AsyncStorage.setItem(KEY, String(next));
  } catch {
    // Storage write failure is non-critical — the user still sees the
    // reward toast for this session; the counter will resync on next save.
  }
  return next;
}

/**
 * Map a raw contribution count to a (stars, label) tuple for badge display.
 * Empirical thresholds — start with 1/5/20 to match the badge progression
 * already used in ProfileHeader's "Encore N pour devenir Contributrice".
 */
export function contributionTier(count: number): { stars: number; label: string } {
  if (count >= 20) return { stars: 3, label: 'Pionnière' };
  if (count >= 5) return { stars: 2, label: 'Contributrice' };
  if (count >= 1) return { stars: 1, label: 'Première contribution' };
  return { stars: 0, label: '' };
}
