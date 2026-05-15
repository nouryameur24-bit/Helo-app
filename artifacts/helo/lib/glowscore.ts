import { Colors } from '@/constants/theme';
import type { ShelfProduct } from '@/components/shelf/ShelfCard';

export interface GlowScoreBreakdown {
  score: number;
  countSafe: number;
  countCaution: number;
  countDanger: number;
  total: number;
}

export function calculateGlowScore(products: ShelfProduct[]): GlowScoreBreakdown {
  const total = products.length;
  if (total === 0) {
    return { score: 0, countSafe: 0, countCaution: 0, countDanger: 0, total: 0 };
  }

  const countSafe = products.filter((p) => p.verdict === 'safe').length;
  const countCaution = products.filter((p) => p.verdict === 'caution').length;
  const countDanger = products.filter((p) => p.verdict === 'danger').length;

  let score = (countSafe * 100 + countCaution * 40 + countDanger * 0) / total;

  if (countDanger === 0) {
    score = Math.min(100, score + 5);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, countSafe, countCaution, countDanger, total };
}

export interface GlowLabel {
  label: string;
  color: string;
  variant: 'safe' | 'accent' | 'caution' | 'danger';
}

export function getGlowLabel(score: number, hasData: boolean = true): GlowLabel {
  if (!hasData) {
    return { label: 'Pas encore d\'analyse', color: Colors.textTertiary, variant: 'accent' };
  }
  if (score > 80) {
    return { label: 'Excellent', color: Colors.safe, variant: 'safe' };
  }
  if (score >= 60) {
    return { label: 'Bon', color: Colors.accent, variant: 'accent' };
  }
  if (score >= 40) {
    return { label: 'À améliorer', color: Colors.caution, variant: 'caution' };
  }
  return { label: 'Attention', color: Colors.danger, variant: 'danger' };
}
