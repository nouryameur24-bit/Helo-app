import type { Trimester } from '@/types';

export interface TrimesterInfo {
  trimester: Trimester;
  weekOfPregnancy: number;
  daysUntilDue: number;
}

export interface TrimesterPalette {
  accent: string;
  accentLight: string;
  background: string;
}

const PREGNANCY_DAYS = 280;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function calculateTrimester(dueDate: Date | string): TrimesterInfo {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const now = new Date();

  const daysUntilDue = Math.round((due.getTime() - now.getTime()) / MS_PER_DAY);

  const conceptionDate = new Date(due.getTime() - PREGNANCY_DAYS * MS_PER_DAY);
  const daysSinceConception = Math.round((now.getTime() - conceptionDate.getTime()) / MS_PER_DAY);
  const weekOfPregnancy = Math.max(1, Math.min(40, Math.floor(daysSinceConception / 7) + 1));

  let trimester: Trimester;
  if (weekOfPregnancy <= 13) {
    trimester = 1;
  } else if (weekOfPregnancy <= 26) {
    trimester = 2;
  } else {
    trimester = 3;
  }

  return { trimester, weekOfPregnancy, daysUntilDue };
}

export function getTrimesterPalette(trimester: Trimester): TrimesterPalette {
  switch (trimester) {
    case 1:
      return {
        accent: '#8BB5A2',
        accentLight: '#C5DDD4',
        background: '#F0F7F4',
      };
    case 2:
      return {
        accent: '#C9A96E',
        accentLight: '#E8D5B0',
        background: '#FFFAF5',
      };
    case 3:
      return {
        accent: '#B8A0C4',
        accentLight: '#DDD0E8',
        background: '#F5F0F8',
      };
  }
}
