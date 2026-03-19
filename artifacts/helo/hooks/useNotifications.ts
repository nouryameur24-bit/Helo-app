import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import {
  cancelAllNotifications,
  cancelNotification,
  getDeepLinkRoute,
  NotificationPayload,
  scheduleNotification,
  ScheduleOptions,
} from '@/lib/notifications';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

const PERMISSION_ASKED_KEY = 'notification_permission_asked';

let globalTapListenerSubscription: Notifications.EventSubscription | null = null;

function handleNotificationRoute(
  router: ReturnType<typeof useRouter>,
  response: Notifications.NotificationResponse,
) {
  const data = response.notification.request.content.data as NotificationPayload | undefined;
  if (data?.type) {
    const payload = data.data as Record<string, string | number | boolean> | undefined;
    const route = getDeepLinkRoute(data.type, payload);
    try {
      router.push(route as Parameters<typeof router.push>[0]);
    } catch {
    }
  }
}

export function useNotificationTapRouting() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (Platform.OS === 'web') return;

    if (globalTapListenerSubscription) {
      globalTapListenerSubscription.remove();
      globalTapListenerSubscription = null;
    }

    Notifications.getLastNotificationResponseAsync()
      .then((lastResponse) => {
        if (lastResponse) {
          handleNotificationRoute(routerRef.current, lastResponse);
        }
      })
      .catch(() => {});

    globalTapListenerSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationRoute(routerRef.current, response);
      },
    );

    return () => {
      if (globalTapListenerSubscription) {
        globalTapListenerSubscription.remove();
        globalTapListenerSubscription = null;
      }
    };
  }, []);
}

export function useNotifications() {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [permissionInitialized, setPermissionInitialized] = useState(false);
  const [showPermissionScreen, setShowPermissionScreen] = useState(false);

  const refreshPermissionStatus = useCallback(async () => {
    if (Platform.OS === 'web') {
      setPermissionStatus('denied');
      setPermissionInitialized(true);
      return;
    }
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        setPermissionStatus('granted');
      } else if (status === 'denied') {
        setPermissionStatus('denied');
      } else {
        setPermissionStatus('undetermined');
      }
    } catch {
      setPermissionStatus('undetermined');
    } finally {
      setPermissionInitialized(true);
    }
  }, []);

  useEffect(() => {
    refreshPermissionStatus();
  }, [refreshPermissionStatus]);

  const requestPermission = useCallback(async (): Promise<PermissionStatus> => {
    if (Platform.OS === 'web') return 'denied';

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      const mapped: PermissionStatus =
        status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
      setPermissionStatus(mapped);
      await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
      return mapped;
    } catch {
      return 'undetermined';
    }
  }, []);

  const checkShouldShowPermissionScreen = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    if (!permissionInitialized) return false;
    if (permissionStatus !== 'undetermined') return false;
    try {
      const asked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
      return !asked;
    } catch {
      return false;
    }
  }, [permissionInitialized, permissionStatus]);

  const dismissPermissionScreen = useCallback(async () => {
    await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
    setShowPermissionScreen(false);
  }, []);

  const triggerPermissionScreenIfNeeded = useCallback(async () => {
    const should = await checkShouldShowPermissionScreen();
    if (should) {
      setShowPermissionScreen(true);
    }
  }, [checkShouldShowPermissionScreen]);

  return {
    permissionStatus,
    permissionInitialized,
    showPermissionScreen,
    setShowPermissionScreen,
    requestPermission,
    dismissPermissionScreen,
    triggerPermissionScreenIfNeeded,
    scheduleNotification: (opts: ScheduleOptions) => scheduleNotification(opts),
    cancelNotification: (id: string) => cancelNotification(id),
    cancelAll: () => cancelAllNotifications(),
  };
}
