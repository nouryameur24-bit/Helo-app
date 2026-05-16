/**
 * useCircle — Cercle social privé (famille proche) avec feed temps réel.
 *
 * Charge le cercle, le feed d'activité et le Glow Score collectif depuis Supabase.
 * En cas d'échec réseau, repli sur le cache local (AsyncStorage) pour éviter
 * un écran vide — les données peuvent avoir quelques minutes de retard.
 *
 * L'identification de l'utilisateur passe désormais par la session Supabase
 * Anonymous Auth (cf. lib/supabase.ts → ensureAnonymousSession). Les fonctions
 * de circleUtils récupèrent l'user.id via supabase.auth.getUser().
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  getCircle,
  getCircleFeed,
  postMessage,
  postScanToCircle,
  toggleReaction,
  computeCircleGlowScore,
  getWeeklyChallenge,
  type Circle,
  type CircleMember,
  type CircleFeedEntry,
  type CircleData,
  type WeeklyChallenge,
} from '@/lib/circleUtils';

const CIRCLE_CACHE_KEY = '@helo_circle_cache';
const FEED_CACHE_KEY = '@helo_circle_feed_cache';

interface UseCircleState {
  isLoading: boolean;
  isOffline: boolean;
  circleData: CircleData | null;
  feed: CircleFeedEntry[];
  glowScore: number;
  weeklyChallenge: WeeklyChallenge | null;
  error: string | null;
}

interface UseCircleActions {
  refresh: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  shareScan: (productName: string, verdict: 'safe' | 'caution' | 'danger') => Promise<void>;
  react: (entryId: string, emoji: string) => Promise<void>;
}

type UseCircleReturn = UseCircleState & UseCircleActions & {
  circle: Circle | null;
  members: CircleMember[];
};

async function loadCachedCircle(): Promise<CircleData | null> {
  try {
    const raw = await AsyncStorage.getItem(CIRCLE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CircleData;
  } catch {
    return null;
  }
}

async function saveCachedCircle(data: CircleData | null): Promise<void> {
  try {
    if (data) {
      await AsyncStorage.setItem(CIRCLE_CACHE_KEY, JSON.stringify(data));
    } else {
      await AsyncStorage.removeItem(CIRCLE_CACHE_KEY);
    }
  } catch {
    // Cache write failure — circle data re-fetched from Supabase on next mount
  }
}

async function loadCachedFeed(): Promise<CircleFeedEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CircleFeedEntry[];
  } catch {
    return [];
  }
}

async function saveCachedFeed(feed: CircleFeedEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify(feed));
  } catch {
    // Cache write failure — feed re-fetched from Supabase on next mount
  }
}

export function useCircle(userId: string, firstName: string): UseCircleReturn {
  const [state, setState] = useState<UseCircleState>({
    isLoading: true,
    isOffline: false,
    circleData: null,
    feed: [],
    glowScore: 0,
    weeklyChallenge: null,
    error: null,
  });

  const realtimeChannel = useRef<any>(null);

  const loadFeed = useCallback(async (circleId: string, members: CircleMember[]) => {
    try {
      const entries = await getCircleFeed(circleId, 50);
      const score = computeCircleGlowScore(members, entries);
      const challenge = getWeeklyChallenge(members, entries);
      await saveCachedFeed(entries);
      setState((prev) => ({
        ...prev,
        feed: entries,
        glowScore: score,
        weeklyChallenge: challenge,
        isOffline: false,
      }));
    } catch {
      // Feed load failed — stay with current state
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await getCircle();

      if (!data) {
        // No circle — clear cache
        await saveCachedCircle(null);
        await saveCachedFeed([]);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          circleData: null,
          feed: [],
          glowScore: 0,
          weeklyChallenge: null,
          isOffline: false,
        }));
        return;
      }

      await saveCachedCircle(data);

      const entries = await getCircleFeed(data.circle.id, 50);
      await saveCachedFeed(entries);

      const score = computeCircleGlowScore(data.members, entries);
      const challenge = getWeeklyChallenge(data.members, entries);

      setState({
        isLoading: false,
        isOffline: false,
        circleData: data,
        feed: entries,
        glowScore: score,
        weeklyChallenge: challenge,
        error: null,
      });
    } catch (err) {
      // Network/Supabase error — load from cache for offline fallback
      const cachedCircle = await loadCachedCircle();
      const cachedFeed = await loadCachedFeed();
      const score = cachedCircle ? computeCircleGlowScore(cachedCircle.members, cachedFeed) : 0;
      const challenge = cachedCircle
        ? getWeeklyChallenge(cachedCircle.members, cachedFeed)
        : null;

      setState({
        isLoading: false,
        isOffline: true,
        circleData: cachedCircle,
        feed: cachedFeed,
        glowScore: score,
        weeklyChallenge: challenge,
        error: cachedCircle ? null : (err instanceof Error ? err.message : 'Erreur de chargement'),
      });
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured || Platform.OS === 'web') return;
    if (!state.circleData?.circle.id) return;

    const circleId = state.circleData.circle.id;

    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current);
      realtimeChannel.current = null;
    }

    const channel = supabase
      .channel(`circle_feed:${circleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'circle_feed',
          filter: `circle_id=eq.${circleId}`,
        },
        () => {
          if (state.circleData) {
            loadFeed(circleId, state.circleData.members);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'circle_members',
          filter: `circle_id=eq.${circleId}`,
        },
        () => {
          refresh();
        },
      )
      .subscribe();

    realtimeChannel.current = channel;

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
        realtimeChannel.current = null;
      }
    };
  }, [state.circleData, loadFeed, refresh]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (state.isOffline) throw new Error('Hors ligne — message non envoyé');
      const circleId = state.circleData?.circle.id;
      if (!circleId || !userId) return;
      await postMessage(circleId, firstName, text);
      if (state.circleData) {
        await loadFeed(circleId, state.circleData.members);
      }
    },
    [state.circleData, state.isOffline, userId, firstName, loadFeed],
  );

  const shareScan = useCallback(
    async (productName: string, verdict: 'safe' | 'caution' | 'danger') => {
      if (state.isOffline) throw new Error('Hors ligne — partage impossible');
      const circleId = state.circleData?.circle.id;
      if (!circleId || !userId) return;
      await postScanToCircle({ circleId, firstName, productName, verdict });
      if (state.circleData) {
        await loadFeed(circleId, state.circleData.members);
      }
    },
    [state.circleData, state.isOffline, userId, firstName, loadFeed],
  );

  const react = useCallback(
    async (entryId: string, emoji: string) => {
      if (state.isOffline) return;
      await toggleReaction(entryId, emoji);
      const circleId = state.circleData?.circle.id;
      if (circleId && state.circleData) {
        await loadFeed(circleId, state.circleData.members);
      }
    },
    [state.circleData, state.isOffline, loadFeed],
  );

  return {
    ...state,
    circle: state.circleData?.circle ?? null,
    members: state.circleData?.members ?? [],
    refresh,
    sendMessage,
    shareScan,
    react,
  };
}
