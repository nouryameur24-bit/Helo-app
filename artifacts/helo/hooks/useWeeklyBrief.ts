import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const DEFAULT_BRIEF_READ_KEY = '@helo_last_brief_read';

export function useWeeklyBrief(currentWeek: number, storageKey?: string) {
  const key = storageKey ?? DEFAULT_BRIEF_READ_KEY;
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key).then((val) => {
      const lastRead = val ? parseInt(val, 10) : -1;
      setIsNew(lastRead !== currentWeek);
    });
  }, [currentWeek, key]);

  const markAsRead = async () => {
    await AsyncStorage.setItem(key, String(currentWeek));
    setIsNew(false);
  };

  return { isNew, markAsRead };
}
