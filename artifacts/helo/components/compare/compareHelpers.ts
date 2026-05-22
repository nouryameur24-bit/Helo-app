/**
 * Helpers purs et types partagés pour le comparateur de produits.
 */

import { Colors } from '@/constants/theme';
import type { VerdictResult, MatchResult } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────
export type VerdictKind = 'safe' | 'caution' | 'danger';

export interface SlotData {
  barcode: string;
  product: import('@/types').ProductData;
  matches: MatchResult[];
  verdict: VerdictResult;
  score: number;
}

// ─── Score ────────────────────────────────────────────────────────────────────
export function computeScore(verdict: VerdictResult): number {
  const danger = verdict.flaggedIngredients.filter((m) => m.riskLevel === 'danger').length;
  const caution = verdict.flaggedIngredients.filter((m) => m.riskLevel === 'caution').length;
  const penaltyD = Math.min(danger * 25, 65);
  const penaltyC = Math.min(caution * 10, 30);
  return Math.max(10, 100 - penaltyD - penaltyC);
}

// ─── Verdict helpers ──────────────────────────────────────────────────────────
export function verdictColor(v: VerdictKind): string {
  if (v === 'danger') return Colors.danger;
  if (v === 'caution') return Colors.caution;
  return Colors.safe;
}

export function verdictBg(v: VerdictKind): string {
  if (v === 'danger') return Colors.dangerBg;
  if (v === 'caution') return Colors.cautionBg;
  return Colors.safeBg;
}

export function verdictLabel(v: VerdictKind): string {
  if (v === 'danger') return 'À éviter';
  if (v === 'caution') return 'Vigilance';
  return 'Compatible';
}

// ─── Trimester ────────────────────────────────────────────────────────────────
export function trimesterLabel(t: number): string {
  if (t === 1) return '1er trimestre';
  if (t === 2) return '2ème trimestre';
  return '3ème trimestre';
}

// ─── Avis narratif ────────────────────────────────────────────────────────────
export function buildAvis(
  slotA: SlotData,
  slotB: SlotData,
  trimester: number,
): string {
  const trim = trimesterLabel(trimester);
  const nameA = slotA.product.name;
  const nameB = slotB.product.name;
  const vA = slotA.verdict.verdict;
  const vB = slotB.verdict.verdict;

  if (vA === 'safe' && vB === 'safe') {
    return `Les deux produits ne présentent aucun signalement identifié pour votre ${trim}. Vous pouvez utiliser l'un ou l'autre en toute sérénité.`;
  }
  if (vA === 'safe' && vB !== 'safe') {
    return `Pour votre ${trim}, ${nameA} ne présente aucun signalement contrairement à ${nameB}. Nous vous recommandons d'opter pour ${nameA}. Consultez votre professionnel de santé si besoin.`;
  }
  if (vA !== 'safe' && vB === 'safe') {
    return `Pour votre ${trim}, ${nameB} ne présente aucun signalement contrairement à ${nameA}. Nous vous recommandons d'opter pour ${nameB}. Consultez votre professionnel de santé si besoin.`;
  }
  if (vA === 'danger' && vB === 'danger') {
    return `Les deux produits contiennent des ingrédients signalés pour votre ${trim}. Nous vous suggérons de consulter des alternatives sécurisées. Parlez-en à votre professionnel de santé.`;
  }
  if (slotA.score >= slotB.score) {
    return `Pour votre ${trim}, ${nameA} présente moins d'ingrédients à surveiller que ${nameB}. Les deux nécessitent une attention particulière — consultez votre professionnel de santé.`;
  }
  return `Pour votre ${trim}, ${nameB} présente moins d'ingrédients à surveiller que ${nameA}. Les deux nécessitent une attention particulière — consultez votre professionnel de santé.`;
}
