import { swallow } from '@/lib/swallow';
import { Platform, NativeModules } from 'react-native';

const APP_GROUP_ID = 'group.com.helo.widget';

export interface WidgetData {
  glowScore: number;
  weekOfPregnancy: number;
  trimester: number;
}

interface HeloWidgetStorageNative {
  setItem(key: string, value: string, groupId: string): Promise<boolean>;
}

function getNativeStorageModule(): HeloWidgetStorageNative | null {
  if (Platform.OS !== 'ios') return null;
  const mod = (NativeModules as Record<string, unknown>)['HeloWidgetStorage'];
  if (!mod) return null;
  return mod as HeloWidgetStorageNative;
}

export async function syncWidgetData(data: WidgetData): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    const storage = getNativeStorageModule();
    if (!storage) return;

    await Promise.all([
      storage.setItem('glow_score', String(data.glowScore), APP_GROUP_ID),
      storage.setItem('week_of_pregnancy', String(data.weekOfPregnancy), APP_GROUP_ID),
      storage.setItem('trimester', String(data.trimester), APP_GROUP_ID),
    ]);
  } catch (err) { swallow(err); }
}

export async function reloadWidgets(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    const { reloadAllTimelines } = await import('react-native-ios-widget');
    await reloadAllTimelines();
  } catch (err) { swallow(err); }
}
