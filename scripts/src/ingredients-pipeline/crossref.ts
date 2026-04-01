/**
 * crossref.ts — Cross-reference multi-source entries, deduplicate, keep strictest risk.
 */

import type { PreComputedIngredient, RiskLevel } from './utils.js';
import { log, normalizeINCIName } from './utils.js';

const RISK_SEVERITY: Record<RiskLevel, number> = { danger: 3, caution: 2, safe: 1 };

function strictestRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_SEVERITY[a] >= RISK_SEVERITY[b] ? a : b;
}

export interface CrossRefResult extends PreComputedIngredient {
  sources: string[];
}

export function crossReference(entries: PreComputedIngredient[]): CrossRefResult[] {
  log.info(`CrossRef — merging ${entries.length} entries…`);
  const byINCIName = new Map<string, CrossRefResult>();

  for (const entry of entries) {
    const key = normalizeINCIName(entry.name_inci || entry.name);

    if (!byINCIName.has(key)) {
      byINCIName.set(key, { ...entry, name_inci: key, sources: [entry.source_raw] });
      continue;
    }

    const existing = byINCIName.get(key)!;
    existing.risk_level_t1 = strictestRisk(existing.risk_level_t1, entry.risk_level_t1);
    existing.risk_level_t2 = strictestRisk(existing.risk_level_t2, entry.risk_level_t2);
    existing.risk_level_t3 = strictestRisk(existing.risk_level_t3, entry.risk_level_t3);
    existing.risk_level_breastfeeding = strictestRisk(existing.risk_level_breastfeeding, entry.risk_level_breastfeeding);

    if (entry.description_fr.length > existing.description_fr.length)
      existing.description_fr = entry.description_fr;

    if (!existing.sources.includes(entry.source_raw)) existing.sources.push(entry.source_raw);

    const confOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    if ((confOrder[entry.confidence] ?? 0) > (confOrder[existing.confidence] ?? 0))
      existing.confidence = entry.confidence;

    if (entry.name.length > existing.name.length) existing.name = entry.name;
  }

  const merged = Array.from(byINCIName.values()).map((e) => ({
    ...e,
    source_raw: e.sources.join(', '),
  }));

  const dangerCount = merged.filter((e) => e.risk_level_t2 === 'danger').length;
  const cautionCount = merged.filter((e) => e.risk_level_t2 === 'caution').length;
  const safeCount = merged.filter((e) => e.risk_level_t2 === 'safe').length;

  log.ok(
    `CrossRef — ${merged.length} unique: ${dangerCount} danger, ${cautionCount} caution, ${safeCount} safe (T2)`,
  );
  return merged;
}

export function filterQuality(entries: CrossRefResult[]): CrossRefResult[] {
  return entries.filter((e) =>
    e.name_inci?.length >= 2 && e.description_fr?.length >= 10 && e.name?.length >= 2,
  );
}
