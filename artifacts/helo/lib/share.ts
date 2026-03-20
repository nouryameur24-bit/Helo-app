import * as ExpoSharing from 'expo-sharing';
import type { RefObject } from 'react';
import ViewShot from 'react-native-view-shot';

export async function captureShareCard(ref: RefObject<ViewShot | null>): Promise<string> {
  const instance = ref.current;
  if (!instance) {
    throw new Error('ViewShot ref is not attached');
  }
  if (!instance.capture) {
    throw new Error('ViewShot capture method is not available');
  }
  const uri = await instance.capture();
  return uri;
}

export async function shareImage(uri: string): Promise<void> {
  const isAvailable = await ExpoSharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error("Le partage n'est pas disponible sur cet appareil");
  }
  await ExpoSharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle: 'Partager avec Hēlo',
  });
}
