/**
 * crossref.ts — Cross-reference multi-source entries, deduplicate, keep strictest risk.
 *
 * Rules:
 * - Group by name_inci (case-insensitive, normalized)
 * - For each trimester risk: keep the STRICTEST (danger > caution > safe)
 * - Merge description_fr from the most detailed source
 * - Combine source fields
 * - One entry per unique name_inci
 */

import type { NormalizedIngredient, RiskLevel } from './normalize.js';
import { log, normalizeINCIName } from './utils.js';

const RISK_SEVERITY: Record<RiskLevel, number> = {
  danger: 3,
  caution: 2,
  safe: 1,
};

function strictestRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_SEVERITY[a] >= RISK_SEVERITY[b] ? a : b;
}

function longestString(a: string, b: string): string {
  return a.length >= b.length ? a : b;
}

export interface CrossRefResult extends NormalizedIngredient {
  sources: string[];
}

/**
 * Merge all normalized entries, keeping strictest risk per trimester and
 * deduplicating by INCI name.
 */
export function crossReference(
  entries: NormalizedIngredient[],
): CrossRefResult[] {
  log.info(`CrossRef — merging ${entries.length} normalized entries…`);

  const byINCIName = new Map<string, CrossRefResult>();

  for (const entry of entries) {
    const key = normalizeINCIName(entry.name_inci || entry.name);

    if (!byINCIName.has(key)) {
      byINCIName.set(key, {
        ...entry,
        name_inci: key,
        sources: [entry.source_raw],
      });
      continue;
    }

    const existing = byINCIName.get(key)!;

    // Apply strictest risk per trimester
    existing.risk_level_t1 = strictestRisk(existing.risk_level_t1, entry.risk_level_t1);
    existing.risk_level_t2 = strictestRisk(existing.risk_level_t2, entry.risk_level_t2);
    existing.risk_level_t3 = strictestRisk(existing.risk_level_t3, entry.risk_level_t3);
    existing.risk_level_breastfeeding = strictestRisk(
      existing.risk_level_breastfeeding,
      entry.risk_level_breastfeeding,
    );

    // Keep longer description
    existing.description_fr = longestString(existing.description_fr, entry.description_fr);

    // Merge sources
    if (!existing.sources.includes(entry.source_raw)) {
      existing.sources.push(entry.source_raw);
    }

    // Keep highest confidence
    const confOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    if ((confOrder[entry.confidence] ?? 0) > (confOrder[existing.confidence] ?? 0)) {
      existing.confidence = entry.confidence;
    }

    // Use more descriptive name (French preferred)
    if (entry.name.length > existing.name.length) {
      existing.name = entry.name;
    }
  }

  const merged = Array.from(byINCIName.values()).map((entry) => ({
    ...entry,
    source_raw: entry.sources.join(', '),
  }));

  // Statistics
  const dangerCount = merged.filter((e) => e.risk_level_t2 === 'danger').length;
  const cautionCount = merged.filter((e) => e.risk_level_t2 === 'caution').length;
  const safeCount = merged.filter((e) => e.risk_level_t2 === 'safe').length;

  log.ok(
    `CrossRef — ${merged.length} unique ingredients: ` +
    `${dangerCount} danger, ${cautionCount} caution, ${safeCount} safe (T2)`,
  );

  return merged;
}

/**
 * Additional quality filters: remove obviously invalid entries.
 */
export function filterQuality(entries: CrossRefResult[]): CrossRefResult[] {
  return entries.filter((e) => {
    if (!e.name_inci || e.name_inci.length < 2) return false;
    if (!e.description_fr || e.description_fr.length < 10) return false;
    if (!e.name || e.name.length < 2) return false;
    return true;
  });
}
