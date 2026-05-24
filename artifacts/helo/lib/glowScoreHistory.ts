/**
 * lib/glowScoreHistory.ts — Historique des Glow Scores pour afficher le trend.
 *
 * v4 Lot 11. Stocke les ~12 dernières mesures (≈ 3 mois si 1 mesure/semaine).
 * Pattern AsyncStorage simple, pas de migration ni de versioning — un trend
 * cassé n'est pas critique. La donnée est purement locale (pas de Supabase
 * sync pour éviter de re-synchroniser des données dérivées).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@helo_glow_score_history';
const MAX_ENTRIES = 12;

export interface GlowScoreEntry {
  score: number;     // 0..100
  recorded_at: string; // ISO date string
}

export async function getGlowScoreHistory(): Promise<GlowScoreEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive : ne garde que les entrées bien formées
    return parsed.filter(
      (e): e is GlowScoreEntry =>
        e &&
        typeof e === 'object' &&
        typeof e.score === 'number' &&
        typeof e.recorded_at === 'string',
    );
  } catch {
    return [];
  }
}

/**
 * Ajoute un score à l'historique. Dedup si même score que la dernière entrée
 * (évite de saturer l'historique de doublons quand on revient sur l'écran).
 * Caps à MAX_ENTRIES (FIFO oldest-out).
 */
export async function recordGlowScore(score: number): Promise<void> {
  if (typeof score !== 'number' || !Number.isFinite(score)) return;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  try {
    const history = await getGlowScoreHistory();
    const last = history[history.length - 1];
    // Dedup : si même score et < 1h écart → on ignore (pas un vrai nouveau point)
    if (last) {
      const lastTime = new Date(last.recorded_at).getTime();
      if (Number.isFinite(lastTime) && Date.now() - lastTime < 3600_000 && last.score === clamped) {
        return;
      }
    }
    const next: GlowScoreEntry[] = [
      ...history,
      { score: clamped, recorded_at: new Date().toISOString() },
    ].slice(-MAX_ENTRIES);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Best effort
  }
}

/** Pour les tests + reset utilisateur. */
export async function clearGlowScoreHistory(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch { /* ignore */ }
}
