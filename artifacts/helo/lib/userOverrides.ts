/**
 * lib/userOverrides.ts — Mémoire des décisions "j'achète quand même".
 *
 * v4 Lot 12. Quand l'utilisatrice voit un verdict caution/danger sur un
 * produit qu'elle ACHÈTE quand même (parce qu'elle juge le risque acceptable
 * pour elle, ou parce qu'un médecin lui a dit OK), elle tape "J'achète
 * quand même" → on mémorise.
 *
 * Au prochain scan du même barcode :
 *   - Le verdict s'affiche normalement (toujours informatif)
 *   - MAIS le banner "danger" devient un rappel doux "Vous avez accepté ce
 *     produit le {date}" — pas d'effrayage répété
 *   - Si l'utilisatrice change d'avis, elle peut révoquer l'override
 *
 * Stockage local AsyncStorage. Cap à 200 overrides (FIFO, oldest-out).
 * Format simple : map barcode → ISO timestamp + raison optionnelle.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@helo_user_overrides';
const MAX_ENTRIES = 200;

export interface UserOverride {
  barcode: string;
  accepted_at: string; // ISO
  reason?: 'doctor_ok' | 'low_dose' | 'occasional' | 'other';
}

interface OverridesPayload {
  entries: UserOverride[];
}

async function readAll(): Promise<UserOverride[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OverridesPayload | UserOverride[];
    const list = Array.isArray(parsed) ? parsed : parsed?.entries ?? [];
    return list.filter(
      (e): e is UserOverride =>
        e && typeof e === 'object' && typeof e.barcode === 'string' && typeof e.accepted_at === 'string',
    );
  } catch {
    return [];
  }
}

async function writeAll(entries: UserOverride[]): Promise<void> {
  try {
    const capped = entries.slice(-MAX_ENTRIES);
    await AsyncStorage.setItem(KEY, JSON.stringify({ entries: capped }));
  } catch {
    // Best effort
  }
}

/** Récupère l'override pour un barcode donné, ou null. */
export async function getOverride(barcode: string): Promise<UserOverride | null> {
  if (!barcode) return null;
  const list = await readAll();
  return list.find((e) => e.barcode === barcode) ?? null;
}

/** Ajoute ou met à jour un override. Idempotent (refresh la date si déjà présent). */
export async function setOverride(
  barcode: string,
  reason?: UserOverride['reason'],
): Promise<UserOverride> {
  const list = await readAll();
  const filtered = list.filter((e) => e.barcode !== barcode);
  const entry: UserOverride = {
    barcode,
    accepted_at: new Date().toISOString(),
    reason,
  };
  await writeAll([...filtered, entry]);
  return entry;
}

/** Révoque un override (l'utilisatrice change d'avis). */
export async function clearOverride(barcode: string): Promise<void> {
  const list = await readAll();
  const filtered = list.filter((e) => e.barcode !== barcode);
  await writeAll(filtered);
}

/** Pour debug / reset. */
export async function clearAllOverrides(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Combien de fois l'utilisatrice a-t-elle outrepassé un verdict ? Utile pour
 *  proposer un coach "vous acceptez beaucoup de cautions — voulez-vous
 *  recalibrer votre niveau de prudence ?" plus tard. */
export async function getOverrideCount(): Promise<number> {
  return (await readAll()).length;
}
