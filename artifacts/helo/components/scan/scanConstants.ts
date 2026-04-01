/**
 * Constantes partagées du scanner de produits.
 */

import { Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// ─── Viewfinder dimensions ────────────────────────────────────────────────────
export const VF_BARCODE_W = Math.min(W * 0.68, 280);
export const VF_BARCODE_H = VF_BARCODE_W;
export const VF_BARCODE_Y = H * 0.28;

export const VF_OCR_W = Math.min(W * 0.85, 340);
export const VF_OCR_H = Math.round(VF_OCR_W * (2 / 3));
export const VF_OCR_Y = H * 0.24;

export const VF_MENU_W = W - 24;
export const VF_MENU_H = Math.min(Math.round(VF_MENU_W * 1.15), H * 0.5);
export const VF_MENU_Y = H * 0.14;

export const VF_PHOTO_W = Math.min(W * 0.85, 340);
export const VF_PHOTO_H = Math.round(VF_PHOTO_W * (2 / 3));
export const VF_PHOTO_Y = H * 0.24;

export const SCREEN_W = W;

// ─── Corner bracket ───────────────────────────────────────────────────────────
export const CORNER_SIZE = 22;
export const CORNER_THICKNESS = 3;

// ─── Overlay ──────────────────────────────────────────────────────────────────
export const OVERLAY_COLOR = 'rgba(45, 41, 38, 0.62)';

// ─── Debounce ─────────────────────────────────────────────────────────────────
export const DEBOUNCE_MS = 3000;

// ─── Barcode types ────────────────────────────────────────────────────────────
export const BARCODE_TYPES = [
  'ean13', 'ean8', 'upc_a', 'upc_e', 'code128',
] as const;

// ─── Menu ─────────────────────────────────────────────────────────────────────
export const MAX_MENU_PHOTOS = 5;

// ─── Types ───────────────────────────────────────────────────────────────────
export type ScanMode = 'barcode' | 'ingredients' | 'menu' | 'photo';
