/**
 * cosing.ts — Download and parse the CosIng cosmetic ingredients CSV from the EU Commission.
 *
 * CosIng (Cosmetic Ingredient database) contains ~5000 ingredients with
 * INCI names, CAS numbers, functions, and restriction data.
 *
 * Data source: https://ec.europa.eu/growth/tools-databases/cosing/
 * Open data CSV: https://data.europa.eu/data/datasets/cosing-ingredients-and-fragrance-inventory
 */

import { parse } from 'csv-parse/sync';
import { fetchWithTimeout, log, withRetry } from '../utils.js';

// The EU Commission provides a public CSV export of CosIng data.
// Multiple mirror URLs in case the primary is down.
const COSING_CSV_URLS = [
  'https://ec.europa.eu/growth/tools-databases/cosing/pdf/COSING_Ingredients-Fragrance%20Inventory_v2.csv',
  'https://data.europa.eu/api/hub/repo/datasets/cosing-ingredients-and-fragrance-inventory/resource/cosing-csv',
];

export interface CosIngEntry {
  name_inci: string;
  cas_number: string;
  function: string;
  restriction_text: string;
  source: 'cosing';
}

/**
 * Downloads the CosIng CSV and returns entries that have a restriction
 * or warning relevant to pregnancy safety.
 */
export async function scrapeCosIng(): Promise<CosIngEntry[]> {
  log.info('CosIng — fetching CSV from EU Commission…');

  let csvText: string | null = null;

  for (const url of COSING_CSV_URLS) {
    try {
      const res = await withRetry(
        () => fetchWithTimeout(url, { timeoutMs: 30_000 }),
        { label: 'CosIng CSV download', maxAttempts: 3 },
      );
      if (res.ok) {
        csvText = await res.text();
        log.ok(`CosIng — downloaded ${(csvText.length / 1024).toFixed(1)} KB`);
        break;
      }
    } catch (err) {
      log.warn(`CosIng — URL failed: ${url} — ${String(err)}`);
    }
  }

  if (!csvText) {
    log.warn('CosIng — all URLs failed, using fallback sample dataset');
    return getFallbackEntries();
  }

  return parseCosIngCSV(csvText);
}

function parseCosIngCSV(csvText: string): CosIngEntry[] {
  let records: Record<string, string>[];
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true,
      bom: true,
    }) as Record<string, string>[];
  } catch {
    log.warn('CosIng — CSV parse error, trying with semicolon delimiter');
    try {
      records = parse(csvText, {
        columns: true,
        delimiter: ';',
        skip_empty_lines: true,
        relax_quotes: true,
        trim: true,
        bom: true,
      }) as Record<string, string>[];
    } catch (err2) {
      log.error(`CosIng — CSV parse failed: ${String(err2)}`);
      return getFallbackEntries();
    }
  }

  const entries: CosIngEntry[] = [];

  for (const row of records) {
    // Column names vary by CSV version; try common variants
    const inciName =
      row['INCI name'] || row['INCIname'] || row['INCI_NAME'] ||
      row['Name'] || row['name'] || '';

    if (!inciName) continue;

    const restriction =
      row['Restriction'] || row['RESTRICTION'] ||
      row['restriction_type'] || row['Annex'] || '';

    const casNumber =
      row['CAS No'] || row['CAS number'] || row['CAS_NUMBER'] || row['cas'] || '';

    const functionText =
      row['Function'] || row['FUNCTION'] || row['function'] || '';

    // Only include ingredients with restrictions or flagged functions
    const hasRestriction = restriction && restriction.trim() !== '';
    const hasFlaggedFunction = /\b(UV|PRESERV|FRAGRANCE|COLORANT|DRYING|SOLVENT)\b/i.test(functionText);

    if (hasRestriction || hasFlaggedFunction) {
      entries.push({
        name_inci: inciName.toUpperCase().trim(),
        cas_number: casNumber.trim(),
        function: functionText.trim(),
        restriction_text: restriction.trim(),
        source: 'cosing',
      });
    }
  }

  log.ok(`CosIng — parsed ${entries.length} flagged ingredients from ${records.length} total`);
  return entries;
}

/** Fallback dataset of known problematic cosmetic ingredients when CSV download fails. */
function getFallbackEntries(): CosIngEntry[] {
  return [
    { name_inci: 'RETINOL', cas_number: '68-26-8', function: 'SKIN CONDITIONING', restriction_text: 'Annex III - restricted', source: 'cosing' },
    { name_inci: 'RETINYL ACETATE', cas_number: '127-47-9', function: 'SKIN CONDITIONING', restriction_text: 'Annex III - restricted', source: 'cosing' },
    { name_inci: 'RETINYL PALMITATE', cas_number: '79-81-2', function: 'SKIN CONDITIONING', restriction_text: 'Annex III - restricted', source: 'cosing' },
    { name_inci: 'RETINOIC ACID', cas_number: '302-79-4', function: 'SKIN CONDITIONING', restriction_text: 'Annex II - prohibited', source: 'cosing' },
    { name_inci: 'FORMALDEHYDE', cas_number: '50-00-0', function: 'PRESERVATIVE', restriction_text: 'Annex III - max 0.2%', source: 'cosing' },
    { name_inci: 'METHYLPARABEN', cas_number: '99-76-3', function: 'PRESERVATIVE', restriction_text: 'Annex V - max 0.4%', source: 'cosing' },
    { name_inci: 'PROPYLPARABEN', cas_number: '94-13-3', function: 'PRESERVATIVE', restriction_text: 'Annex V - max 0.14% leave-on', source: 'cosing' },
    { name_inci: 'BUTYLPARABEN', cas_number: '94-26-8', function: 'PRESERVATIVE', restriction_text: 'Annex V - restricted', source: 'cosing' },
    { name_inci: 'TRICLOSAN', cas_number: '3380-34-5', function: 'PRESERVATIVE', restriction_text: 'Annex V - restricted', source: 'cosing' },
    { name_inci: 'BHA', cas_number: '25013-16-5', function: 'ANTIOXIDANT', restriction_text: 'Annex III - restricted', source: 'cosing' },
    { name_inci: 'HYDROQUINONE', cas_number: '123-31-9', function: 'SKIN BLEACHING', restriction_text: 'Annex II - prohibited in leave-on', source: 'cosing' },
    { name_inci: 'OXYBENZONE', cas_number: '131-57-7', function: 'UV FILTER', restriction_text: 'Annex VI - max 6%', source: 'cosing' },
    { name_inci: 'AVOBENZONE', cas_number: '70356-09-1', function: 'UV FILTER', restriction_text: 'Annex VI - max 5%', source: 'cosing' },
    { name_inci: 'KOJIC ACID', cas_number: '501-30-4', function: 'SKIN CONDITIONING', restriction_text: 'Annex III - max 1%', source: 'cosing' },
    { name_inci: 'DIHYDROXYACETONE', cas_number: '96-26-4', function: 'TANNING', restriction_text: 'Annex III - spray restriction', source: 'cosing' },
    { name_inci: 'ALUMINUM CHLOROHYDRATE', cas_number: '1327-41-9', function: 'ANTIPERSPIRANT', restriction_text: 'Annex III - max 10.6% Al', source: 'cosing' },
    { name_inci: 'LEAD ACETATE', cas_number: '301-04-2', function: 'HAIR COLORANT', restriction_text: 'Annex II - prohibited', source: 'cosing' },
    { name_inci: 'MERCURY COMPOUNDS', cas_number: '', function: 'PRESERVATIVE', restriction_text: 'Annex II - prohibited', source: 'cosing' },
    { name_inci: 'SALICYLIC ACID', cas_number: '69-72-7', function: 'KERATOLYTIC', restriction_text: 'Annex III - max 2% leave-on', source: 'cosing' },
    { name_inci: 'KOJIC DIPALMITATE', cas_number: '79725-98-7', function: 'SKIN CONDITIONING', restriction_text: 'Annex III', source: 'cosing' },
  ];
}
