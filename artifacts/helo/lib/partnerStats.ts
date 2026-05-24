/**
 * Local tracker for partner scans — the "héros UX" system.
 *
 * When the partner (e.g. Thomas) scans a product for the pregnant mum
 * (e.g. Marie), Thomas is the hero, not an assistant. We surface a tiered
 * badge ("Premier pas" → "Soutien dévoué" → "Allié engagé" → "Héros du
 * couple") on the partner home screen so he feels recognized for every
 * scan he runs.
 *
 * Why local + AsyncStorage rather than reading scans from Supabase?
 *   • The badge must render instantly when the partner returns to home
 *     after a successful scan — a network round-trip would delay the
 *     "you levelled up" feeling and break the immediate reward loop.
 *   • Offline partners still see their badge upgrade.
 *   • The server-side scan count is still authoritative for analytics,
 *     but the badge UX only needs "fast and felt", not "exact to the row".
 *
 * The tier function lives next to the storage helpers so every consumer
 * (home badge, future toast, future stats) renders the same label for
 * the same threshold. Thresholds are empirical — tweak with product
 * feedback. They differ from the Ghost Capture tier (1/5/20) because
 * partner scanning is a higher-cadence activity (multiple scans per
 * shopping trip), so we space thresholds further (3/15/50).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@helo_partner_scan_count';
const FIRST_SCAN_KEY = '@helo_partner_first_scan_at';

export async function getPartnerScanCount(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function incrementPartnerScanCount(): Promise<number> {
  const current = await getPartnerScanCount();
  const next = current + 1;
  try {
    await AsyncStorage.setItem(KEY, String(next));
    // Stamp the first-scan timestamp on the very first increment so we can
    // later show "you've been supporting Marie since {date}" — a small
    // emotional anchor for long-term partners. Subsequent writes are no-ops.
    if (current === 0) {
      const existing = await AsyncStorage.getItem(FIRST_SCAN_KEY);
      if (!existing) {
        await AsyncStorage.setItem(FIRST_SCAN_KEY, new Date().toISOString());
      }
    }
  } catch {
    // Storage write failure is non-critical — the user still progresses
    // visually for this session via the in-memory state; the counter will
    // resync on the next successful write.
  }
  return next;
}

export async function getPartnerFirstScanDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(FIRST_SCAN_KEY);
  } catch {
    return null;
  }
}

export type PartnerTier = {
  level: 0 | 1 | 2 | 3;
  emoji: string;
  label: string;
  nextThreshold: number | null;
};

/**
 * Map a raw partner-scan count to a tier descriptor for badge display.
 * Empirical thresholds — 0/3/15/50 — chosen so even an occasional partner
 * (one scan per supermarket trip) reaches the first tier in a couple of
 * weeks, while the top tier ("Héros du couple") feels earned after a
 * full pregnancy of attentive support.
 */
export function partnerTier(count: number): PartnerTier {
  if (count >= 50) {
    return { level: 3, emoji: '✨', label: 'Héros du couple', nextThreshold: null };
  }
  if (count >= 15) {
    return { level: 2, emoji: '★', label: 'Allié engagé', nextThreshold: 50 };
  }
  if (count >= 3) {
    return { level: 1, emoji: '💛', label: 'Soutien dévoué', nextThreshold: 15 };
  }
  return { level: 0, emoji: '🌱', label: 'Premier pas', nextThreshold: 3 };
}
