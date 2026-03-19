import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const BRIEF_READ_KEY = '@helo_last_brief_read';

export function useWeeklyBrief(currentWeek: number) {
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(BRIEF_READ_KEY).then((val) => {
      const lastRead = val ? parseInt(val, 10) : -1;
      setIsNew(lastRead !== currentWeek);
    });
  }, [currentWeek]);

  const markAsRead = async () => {
    await AsyncStorage.setItem(BRIEF_READ_KEY, String(currentWeek));
    setIsNew(false);
  };

  return { isNew, markAsRead };
}
