import { Colors } from '@/constants/theme';
import { STORAGE_KEYS } from '@/lib/storageKeys';

export type Phase = 'config' | 'scan' | 'summary' | 'export';
export type Theme = 'salle-de-bain' | 'frigo' | 'maquillage' | 'libre';
export type VerdictType = 'safe' | 'caution' | 'danger';

export interface PartyResult {
  barcode: string;
  name: string;
  brand: string;
  verdict: VerdictType;
}

export const THEMES: { id: Theme; label: string; emoji: string }[] = [
  { id: 'salle-de-bain', label: 'Salle de bain', emoji: '🛁' },
  { id: 'frigo', label: 'Frigo', emoji: '🧊' },
  { id: 'maquillage', label: 'Maquillage', emoji: '💄' },
  { id: 'libre', label: 'Libre', emoji: '✨' },
];

export const VERDICT_CONFIG: Record<VerdictType, { label: string; color: string; bg: string }> = {
  safe:    { label: 'COMPATIBLE',  color: Colors.safe,    bg: Colors.safeBg    },
  caution: { label: 'PRÉCAUTION',  color: Colors.caution, bg: Colors.cautionBg },
  danger:  { label: 'À ÉVITER',    color: Colors.danger,  bg: Colors.dangerBg  },
};

export const PARTY_USED_KEY = STORAGE_KEYS.scanPartyUsed;
export const DEBOUNCE_MS = 3000;
