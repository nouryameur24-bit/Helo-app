import { Dimensions } from 'react-native';
import type { BarcodeScanningResult } from 'expo-camera';

export const SCREEN = Dimensions.get('screen');
export const SW = SCREEN.width;
export const SH = SCREEN.height;

export const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

export const FADE_START_MS = 1200;
export const REMOVE_MS = 2200;
export const LOOKUP_DEBOUNCE_MS = 3000;

export type VerdictShort = 'safe' | 'caution' | 'danger';

export interface CachedLookup {
  verdict: VerdictShort;
  name: string;
  brand: string;
}

export interface TrackedBarcode {
  barcode: string;
  x: number;
  y: number;
  w: number;
  h: number;
  lookup: CachedLookup | null;
  lastSeen: number;
}

export interface RenderItem extends TrackedBarcode {
  opacity: number;
}

export const VERDICT_COLOR: Record<VerdictShort, string> = {
  safe: '#7CB69F',
  caution: '#C9A96E',
  danger: '#C27B7B',
};

export const VERDICT_EMOJI: Record<VerdictShort, string> = {
  safe: '✓',
  caution: '⚠',
  danger: '✕',
};

export const VERDICT_LABEL_FR: Record<VerdictShort, string> = {
  safe: 'Compatible',
  caution: 'Vigilance',
  danger: 'À éviter',
};

export function normaliseBounds(
  result: BarcodeScanningResult,
  cameraW: number,
  cameraH: number,
): { x: number; y: number; w: number; h: number } | null {
  const b = result.bounds;
  if (!b) return null;

  const ox = b.origin.x;
  const oy = b.origin.y;
  const bw = b.size.width;
  const bh = b.size.height;

  const isNormalised = ox <= 1.5 && oy <= 1.5 && bw <= 1.5 && bh <= 1.5;

  if (isNormalised) {
    return { x: ox * cameraW, y: oy * cameraH, w: bw * cameraW, h: bh * cameraH };
  }

  const refW = ox + bw > cameraW ? ox + bw : cameraW;
  const refH = oy + bh > cameraH ? oy + bh : cameraH;
  const sx = cameraW / refW;
  const sy = cameraH / refH;
  return { x: ox * sx, y: oy * sy, w: bw * sx, h: bh * sy };
}
