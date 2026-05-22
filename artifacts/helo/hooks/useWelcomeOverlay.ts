import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { swallow } from '@/lib/swallow';
import { STORAGE_KEYS } from '@/lib/storageKeys';

const WELCOME_FLAG = STORAGE_KEYS.showWelcomeOverlay;

/**
 * Reads the one-shot AsyncStorage flag set after onboarding and exposes the
 * "show / dismiss" pair so the Home screen stays free of storage plumbing.
 */
export function useWelcomeOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_FLAG)
      .then((flag) => { if (flag === '1') setVisible(true); })
      .catch((err) => swallow(err, 'useWelcomeOverlay.read'));
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    AsyncStorage.removeItem(WELCOME_FLAG).catch((err) =>
      swallow(err, 'useWelcomeOverlay.remove'),
    );
  }, []);

  return { visible, dismiss };
}
