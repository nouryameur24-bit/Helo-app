/**
 * Lot 16-10 — Tracker des messages chat non-lus.
 *
 * Pourquoi : si l'IA répond pendant que l'utilisateur a quitté l'onglet
 * Chat (ex: tap sur une suggestion qui ouvre une notif ailleurs, ou
 * réponse async), aucune indication visuelle ne le pousse à revenir
 * voir la réponse. Le badge rouge sur l'icône Chat tab résout ça.
 *
 * Pattern : signal global module-level (pas de Context) — moins de
 * boilerplate, fonctionne dans les Tabs.Screen options qui ne supportent
 * pas Provider. Persisté en AsyncStorage pour survivre aux cold starts
 * (la réponse asynchrone d'une push-notif peut arriver entre 2 lancements).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const STORAGE_KEY = '@helo_chat_unread_count';

type Listener = (count: number) => void;
const listeners = new Set<Listener>();
let cachedCount = 0;
let initialized = false;

async function init() {
  if (initialized) return;
  initialized = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    cachedCount = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    listeners.forEach((l) => l(cachedCount));
  } catch {
    cachedCount = 0;
  }
}

void init();

function persist(count: number) {
  cachedCount = count;
  AsyncStorage.setItem(STORAGE_KEY, String(count)).catch(() => {});
  listeners.forEach((l) => l(count));
}

/**
 * Incrémente le compteur d'unread (à appeler quand l'IA répond
 * pendant que l'utilisateur N'EST PAS sur le chat tab).
 */
export function incrementChatUnread(by: number = 1) {
  persist(cachedCount + by);
}

/**
 * Reset le compteur à zéro (à appeler dans useFocusEffect du chat tab).
 */
export function clearChatUnread() {
  if (cachedCount === 0) return;
  persist(0);
}

/**
 * Hook React qui expose le compteur unread + reste à jour via subscribe.
 */
export function useChatUnread(): number {
  const [count, setCount] = useState(cachedCount);

  useEffect(() => {
    const listener: Listener = (n) => setCount(n);
    listeners.add(listener);
    // Sync immédiat au cas où init() a fini après mount
    setCount(cachedCount);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return count;
}
