/**
 * validate.ts — Validation runtime des ingrédients avant upsert Supabase.
 *
 * v4-Lot6 — Bloque la pollution silencieuse de la base ingredients quand
 * un scraper externe (EFSA, COSING, CRAT, etc.) retourne une donnée
 * corrompue. Sans cette validation, un risk_level="dangereuse" (au lieu
 * de "danger") passait à l'upsert et le matcher backend ne le retrouvait
 * jamais — silent data loss.
 *
 * Stratégie :
 *   - Whitelist stricte des enums (risk_level, category)
 *   - Champs requis non vides
 *   - description_fr taille bornée (évite les rows monstrueuses)
 *   - Stats anomalies par raison pour debug pipeline
 *   - Threshold global : si > 5 % de rows rejetées, throw → stop le run
 *     plutôt qu'inserer une base à moitié saine
 */
import type { CrossRefResult } from "./crossref.js";

// ─── Enums valides ──────────────────────────────────────────────────────────

const VALID_RISK_LEVELS = new Set(["safe", "caution", "danger", "no_signal"]);
const VALID_CATEGORIES = new Set(["food", "cosmetic", "medication"]);

// ─── Bornes ─────────────────────────────────────────────────────────────────

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_NAME_LENGTH = 2;
const ANOMALY_THRESHOLD_PCT = 5; // > 5 % rejet = stop le run

// ─── Validation row par row ─────────────────────────────────────────────────

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: ValidationReason; detail?: string };

export type ValidationReason =
  | "name_empty"
  | "name_too_short"
  | "name_too_long"
  | "name_inci_empty"
  | "name_inci_too_long"
  | "invalid_risk_t1"
  | "invalid_risk_t2"
  | "invalid_risk_t3"
  | "invalid_risk_breastfeeding"
  | "invalid_category"
  | "source_empty"
  | "description_too_long";

export function validateRow(entry: CrossRefResult): ValidationResult {
  // name
  const name = (entry.name ?? "").trim();
  if (!name) return { ok: false, reason: "name_empty" };
  if (name.length < MIN_NAME_LENGTH)
    return { ok: false, reason: "name_too_short", detail: `${name.length} chars` };
  if (name.length > MAX_NAME_LENGTH)
    return { ok: false, reason: "name_too_long", detail: `${name.length} chars` };

  // name_inci
  const inci = (entry.name_inci ?? "").trim();
  if (!inci) return { ok: false, reason: "name_inci_empty" };
  if (inci.length > MAX_NAME_LENGTH)
    return { ok: false, reason: "name_inci_too_long", detail: `${inci.length} chars` };

  // risk_levels — toutes les phases doivent être dans l'enum
  if (!VALID_RISK_LEVELS.has(entry.risk_level_t1))
    return { ok: false, reason: "invalid_risk_t1", detail: String(entry.risk_level_t1) };
  if (!VALID_RISK_LEVELS.has(entry.risk_level_t2))
    return { ok: false, reason: "invalid_risk_t2", detail: String(entry.risk_level_t2) };
  if (!VALID_RISK_LEVELS.has(entry.risk_level_t3))
    return { ok: false, reason: "invalid_risk_t3", detail: String(entry.risk_level_t3) };
  if (!VALID_RISK_LEVELS.has(entry.risk_level_breastfeeding))
    return {
      ok: false,
      reason: "invalid_risk_breastfeeding",
      detail: String(entry.risk_level_breastfeeding),
    };

  // category
  if (!VALID_CATEGORIES.has(entry.category))
    return { ok: false, reason: "invalid_category", detail: String(entry.category) };

  // source non vide (sinon sourceToDomain renvoie cosmetic par défaut → drift)
  if (!(entry.source_raw ?? "").trim())
    return { ok: false, reason: "source_empty" };

  // description bornée (lazy : on tronquera côté insert si trop longue, mais
  // > 2x la limite = probablement données corrompues)
  if ((entry.description_fr ?? "").length > MAX_DESCRIPTION_LENGTH * 2)
    return {
      ok: false,
      reason: "description_too_long",
      detail: `${entry.description_fr.length} chars`,
    };

  return { ok: true };
}

// ─── Validation batch + stats ───────────────────────────────────────────────

export interface ValidationStats {
  total: number;
  valid: number;
  rejected: number;
  byReason: Record<ValidationReason, number>;
}

export function validateBatch(entries: CrossRefResult[]): {
  valid: CrossRefResult[];
  stats: ValidationStats;
  samples: { reason: ValidationReason; entry: CrossRefResult; detail?: string }[];
} {
  const valid: CrossRefResult[] = [];
  const byReason: Record<string, number> = {};
  const samples: { reason: ValidationReason; entry: CrossRefResult; detail?: string }[] = [];
  const SAMPLE_PER_REASON = 3; // capture jusqu'à 3 exemples par type d'erreur

  for (const entry of entries) {
    const r = validateRow(entry);
    if (r.ok) {
      valid.push(entry);
    } else {
      byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;
      if ((byReason[r.reason] ?? 0) <= SAMPLE_PER_REASON) {
        samples.push({ reason: r.reason, entry, detail: r.detail });
      }
    }
  }

  const stats: ValidationStats = {
    total: entries.length,
    valid: valid.length,
    rejected: entries.length - valid.length,
    byReason: byReason as Record<ValidationReason, number>,
  };

  return { valid, stats, samples };
}

// ─── Threshold check ────────────────────────────────────────────────────────

/**
 * Throw si plus de ANOMALY_THRESHOLD_PCT (%) des rows sont rejetées.
 * Évite d'insérer une base à moitié saine sans réaliser que la donnée
 * source est corrompue.
 */
export function enforceQualityThreshold(stats: ValidationStats): void {
  if (stats.total === 0) return;
  const rejectPct = (stats.rejected / stats.total) * 100;
  if (rejectPct > ANOMALY_THRESHOLD_PCT) {
    throw new Error(
      `Pipeline halted: ${rejectPct.toFixed(1)}% rows rejected ` +
        `(${stats.rejected}/${stats.total}). Threshold = ${ANOMALY_THRESHOLD_PCT}%. ` +
        `By reason: ${JSON.stringify(stats.byReason)}. ` +
        `Fix the upstream scraper before re-running.`
    );
  }
}
