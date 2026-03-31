// ─── Prescription scanner — Hēlo ─────────────────────────────────────────────
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Trimester, Phase } from '@/types';

// ─── Known medication name dictionary ────────────────────────────────────────
// Used as anchors for OCR parsing when the word is not preceded by a dosage
const KNOWN_MEDICATIONS = [
  'doliprane', 'paracétamol', 'paracetamol',
  'spasfon', 'phloroglucinol',
  'gaviscon', 'maalox', 'inexium', 'oméprazole', 'omeprazole', 'pantoprazole',
  'ibuprofène', 'ibuprofene', 'advil', 'nurofèn', 'nurofen',
  'amoxicilline', 'amoxicillin', 'augmentin', 'clamoxyl',
  'érythromycine', 'erythromycine', 'zithromax', 'azithromycine',
  'céfuroxime', 'cefuroxime', 'zinnat',
  'metronidazole', 'flagyl',
  'clotrimazole', 'mycostatine', 'fluconazole',
  'héparine', 'heparine', 'lovenox', 'fragmine',
  'aspégic', 'aspirine', 'aspirin',
  'magnésium', 'magnesium',
  'vitamine', 'acide folique', 'folacine', 'speciafoldine',
  'fer', 'tardyferon', 'fumafer', 'totem',
  'calcium', 'cacit', 'orocal',
  'iode', 'iodure',
  'progynova', 'utrogestan', 'duphaston', 'progesterone',
  'nifedipine', 'adalate',
  'methyldopa', 'aldomet',
  'labetalol', 'trandate',
  'prednisolone', 'cortisone', 'betnesol',
  'metoclopramide', 'primpéran', 'primperan',
  'ondansetron', 'zophren',
  'doxylamine', 'donormyl', 'mercalm',
  'diclofenac', 'voltarène', 'voltarene',
  'codeine', 'codéine',
  'tramadol', 'topalgic',
  'metformine', 'glucophage',
  'insuline', 'novorapid', 'humalog', 'lantus',
  'levothyrox', 'levothyroxine', 'euthyrox',
  'betadine', 'povidone',
];

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ExtractedMedication {
  name: string;
  dosage?: string;
  rawMatch: string;
}

export type MedicationRisk = 'safe' | 'caution' | 'danger' | 'unknown';

export interface MedicationResult {
  name: string;
  dosage?: string;
  found: boolean;
  riskLevel: MedicationRisk;
  description?: string;
  contraindication?: string;
}

// ─── 1. Extract medications from OCR text ─────────────────────────────────────
export function extractMedications(ocrText: string): ExtractedMedication[] {
  const lines = ocrText.split('\n').map((l) => l.trim()).filter(Boolean);
  const found: ExtractedMedication[] = [];
  const seen = new Set<string>();

  // Pattern: word(s) followed by a dosage (e.g. "Doliprane 1000 mg")
  const dosagePattern = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s-]{2,40}?)\s+(\d+(?:[.,]\d+)?\s*(?:mg|g|ml|µg|mcg|UI|cp|cps|gél|gel|comprimé|sachets?)(?:\/\w+)?)/gi;

  for (const line of lines) {
    let match: RegExpExecArray | null;
    dosagePattern.lastIndex = 0;
    while ((match = dosagePattern.exec(line)) !== null) {
      const name = match[1].trim();
      const dosage = match[2].trim();
      const key = name.toLowerCase();
      if (key.length < 3 || seen.has(key)) continue;
      seen.add(key);
      found.push({ name, dosage, rawMatch: match[0] });
    }
  }

  // Pattern: known medication names anywhere in the text
  const normalised = ocrText.toLowerCase();
  for (const med of KNOWN_MEDICATIONS) {
    if (normalised.includes(med) && !seen.has(med)) {
      seen.add(med);
      // Try to find capitalised version from original text
      const regex = new RegExp(`(${med}[a-zÀ-ÿ]*)`, 'i');
      const m = ocrText.match(regex);
      const displayName = m ? m[1] : med.charAt(0).toUpperCase() + med.slice(1);
      found.push({ name: displayName, rawMatch: displayName });
    }
  }

  return found;
}

// ─── 2. Check medications against Supabase ────────────────────────────────────
export async function checkMedications(
  medications: ExtractedMedication[],
  phase: Phase,
): Promise<MedicationResult[]> {
  if (medications.length === 0) return [];

  if (!isSupabaseConfigured) {
    return medications.map((med) => ({
      name: med.name,
      dosage: med.dosage,
      found: false,
      riskLevel: 'unknown' as MedicationRisk,
      description: 'Base de données non configurée.',
    }));
  }

  const names = medications.map((m) => m.name.toLowerCase());

  const { data, error } = await supabase
    .from('ingredients')
    .select('name, risk_level_t1, risk_level_t2, risk_level_t3, risk_level_breastfeeding, description, contraindication')
    .or(
      names.map((n) => `name.ilike.%${n}%`).join(','),
    )
    .limit(50);

  if (error) {
    if (__DEV__) console.warn('[prescription] Supabase error:', error.message);
  }

  const dbRows = data ?? [];

  return medications.map((med): MedicationResult => {
    const nameLower = med.name.toLowerCase();
    const row = dbRows.find((r) =>
      r.name?.toLowerCase().includes(nameLower) ||
      nameLower.includes(r.name?.toLowerCase() ?? '____'),
    );

    if (!row) {
      return {
        name: med.name,
        dosage: med.dosage,
        found: false,
        riskLevel: 'unknown',
      };
    }

    let rawRisk: string | null = null;
    if (phase === 'breastfeeding') {
      rawRisk = row.risk_level_breastfeeding ?? row.risk_level_t3;
    } else if (phase === 1) {
      rawRisk = row.risk_level_t1;
    } else if (phase === 2) {
      rawRisk = row.risk_level_t2;
    } else {
      rawRisk = row.risk_level_t3;
    }

    const riskLevel = mapRisk(rawRisk);

    return {
      name: med.name,
      dosage: med.dosage,
      found: true,
      riskLevel,
      description: row.description ?? undefined,
      contraindication: row.contraindication ?? undefined,
    };
  });
}

function mapRisk(raw: string | null): MedicationRisk {
  if (!raw) return 'unknown';
  if (raw === 'safe' || raw === 'no_signal') return 'safe';
  if (raw === 'caution') return 'caution';
  if (raw === 'danger') return 'danger';
  return 'unknown';
}

// ─── 3. Overall verdict for the prescription ─────────────────────────────────
export function prescriptionVerdict(results: MedicationResult[]): MedicationRisk {
  if (results.some((r) => r.riskLevel === 'danger')) return 'danger';
  if (results.some((r) => r.riskLevel === 'caution')) return 'caution';
  if (results.every((r) => r.riskLevel === 'unknown' || !r.found)) return 'unknown';
  return 'safe';
}
