import { Colors } from '@/constants/theme';
import type { MatchResult, Phase, RiskLevel, VerdictResult } from '@/types';

export const CIRCLE_RADIUS = 60;
export const CIRCLE_STROKE = 8;
export const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
export const BOTTOM_BAR_HEIGHT = 120;

export function getVerdictColor(v?: string): string {
  if (v === 'danger') return Colors.danger;
  if (v === 'caution') return Colors.caution;
  return Colors.safe;
}

export function getVerdictBg(v?: string): string {
  if (v === 'danger') return Colors.dangerBg;
  if (v === 'caution') return Colors.cautionBg;
  return Colors.safeBg;
}

export function getVerdictLabel(v?: string): string {
  if (v === 'danger') return 'À éviter pendant ta grossesse';
  if (v === 'caution') return 'Vigilance';
  return 'Compatible';
}

export function getRiskColor(r: RiskLevel): string {
  if (r === 'danger') return Colors.danger;
  if (r === 'caution') return Colors.caution;
  if (r === 'safe') return Colors.safe;
  return Colors.textTertiary;
}

export function getRiskVariant(r: RiskLevel): 'danger' | 'caution' | 'safe' | 'accent' {
  if (r === 'danger') return 'danger';
  if (r === 'caution') return 'caution';
  if (r === 'safe') return 'safe';
  return 'accent';
}

export function getRiskBadgeLabel(r: RiskLevel): string {
  if (r === 'danger') return 'À éviter';
  if (r === 'caution') return 'Vigilance';
  if (r === 'safe') return 'Compatible';
  return 'Aucun signal';
}

export function computeGlowScore(verdict: VerdictResult): number {
  const danger = verdict.flaggedIngredients.filter((m) => m.riskLevel === 'danger').length;
  const caution = verdict.flaggedIngredients.filter((m) => m.riskLevel === 'caution').length;
  const penaltyD = Math.min(danger * 25, 65);
  const penaltyC = Math.min(caution * 10, 30);
  return Math.max(10, 100 - penaltyD - penaltyC);
}

export function sortMatches(matches: MatchResult[]): MatchResult[] {
  const order: Record<RiskLevel, number> = { danger: 0, caution: 1, safe: 2, no_signal: 3 };
  return [...matches].sort((a, b) => order[a.riskLevel] - order[b.riskLevel]);
}

export function phaseLabel(p: Phase): string {
  if (p === 'breastfeeding') return 'mode allaitement';
  if (p === 1) return '1er trimestre';
  if (p === 2) return '2ème trimestre';
  return '3ème trimestre';
}

export function getSourceAttribution(source?: string): string {
  if (source === 'openbeautyfacts') {
    return 'Analyse basée sur les données SCCS / CosIng (Commission Européenne)';
  }
  if (source === 'openfoodfacts') {
    return 'Analyse basée sur les données EFSA / ANSES';
  }
  return 'Analyse basée sur les données CRAT, ANSM, EFSA';
}
