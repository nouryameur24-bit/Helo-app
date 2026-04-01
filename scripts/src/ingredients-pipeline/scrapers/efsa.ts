/**
 * efsa.ts — Fetch EFSA (European Food Safety Authority) food additive data.
 *
 * EFSA provides open data on food additives (E-numbers) including
 * acceptable daily intake (ADI) values and safety warnings.
 *
 * Primary source: EFSA open data API
 * Fallback: curated list of E-numbers with pregnancy concerns
 */

import { fetchWithTimeout, log, withRetry } from '../utils.js';

export interface EFSAEntry {
  name: string;
  e_number: string;
  category: string;
  adi: string;
  warnings_text: string;
  source: 'efsa';
}

const EFSA_OPEN_DATA_URL =
  'https://data.efsa.europa.eu/api/explore/v2.1/catalog/datasets/food-additives-union-list/records?limit=100&offset=0';

export async function scrapeEFSA(): Promise<EFSAEntry[]> {
  log.info('EFSA — fetching food additives open data…');

  try {
    const res = await withRetry(
      () => fetchWithTimeout(EFSA_OPEN_DATA_URL, { timeoutMs: 20_000 }),
      { label: 'EFSA fetch', maxAttempts: 3 },
    );

    if (res.ok) {
      const json = await res.json() as { results?: EFSAApiRecord[] };
      if (json.results && json.results.length > 0) {
        const entries = mapEFSARecords(json.results);
        log.ok(`EFSA — fetched ${entries.length} additives from API`);
        return entries;
      }
    }
  } catch (err) {
    log.warn(`EFSA — API failed: ${String(err)}, using fallback dataset`);
  }

  log.info('EFSA — using curated fallback dataset');
  return getFallbackEntries();
}

interface EFSAApiRecord {
  additive_name?: string;
  e_number?: string;
  functional_class?: string;
  adi?: string;
  re_evaluation_status?: string;
  safety_notes?: string;
}

function mapEFSARecords(records: EFSAApiRecord[]): EFSAEntry[] {
  const entries: EFSAEntry[] = [];
  for (const r of records) {
    const name = r.additive_name || '';
    const eNumber = r.e_number || '';
    if (!name && !eNumber) continue;

    const safetyNotes = [r.safety_notes, r.re_evaluation_status]
      .filter(Boolean)
      .join('; ');

    entries.push({
      name: name.trim(),
      e_number: eNumber.trim(),
      category: r.functional_class?.trim() || 'food additive',
      adi: r.adi?.trim() || 'not specified',
      warnings_text: safetyNotes.trim(),
      source: 'efsa',
    });
  }
  return entries;
}

function getFallbackEntries(): EFSAEntry[] {
  return [
    {
      name: 'Aspartame', e_number: 'E951', category: 'sweetener',
      adi: '40 mg/kg/j', source: 'efsa',
      warnings_text: 'Contient phénylalanine — contre-indiqué en cas de phénylcétonurie. À limiter pendant la grossesse.',
    },
    {
      name: 'Acésulfame K', e_number: 'E950', category: 'sweetener',
      adi: '9 mg/kg/j', source: 'efsa',
      warnings_text: 'Édulcorant de synthèse — données limitées pendant la grossesse, à éviter en excès.',
    },
    {
      name: 'Saccharine', e_number: 'E954', category: 'sweetener',
      adi: '5 mg/kg/j', source: 'efsa',
      warnings_text: 'Traverse le placenta — déconseillée pendant la grossesse.',
    },
    {
      name: 'Nitrite de sodium', e_number: 'E250', category: 'preservative',
      adi: '0.06 mg/kg/j', source: 'efsa',
      warnings_text: 'Précurseur de nitrosamines — consommation à limiter pendant la grossesse, éviter charcuterie crue.',
    },
    {
      name: 'Nitrate de sodium', e_number: 'E251', category: 'preservative',
      adi: '3.7 mg/kg/j', source: 'efsa',
      warnings_text: 'Précurseur de nitrosamines — à limiter pendant la grossesse.',
    },
    {
      name: 'Dioxide de soufre', e_number: 'E220', category: 'preservative',
      adi: '0.7 mg/kg/j', source: 'efsa',
      warnings_text: 'Sulfites — peut provoquer des réactions allergiques. Vin et fruits séchés à surveiller.',
    },
    {
      name: 'Benzoate de sodium', e_number: 'E211', category: 'preservative',
      adi: '5 mg/kg/j', source: 'efsa',
      warnings_text: 'Conservateur — données limitées pendant la grossesse, à éviter en excès.',
    },
    {
      name: 'Tartrazine', e_number: 'E102', category: 'colorant',
      adi: '7.5 mg/kg/j', source: 'efsa',
      warnings_text: 'Colorant azoïque — peut provoquer des réactions d\'hypersensibilité.',
    },
    {
      name: 'Carmin (cochenille)', e_number: 'E120', category: 'colorant',
      adi: '5 mg/kg/j', source: 'efsa',
      warnings_text: 'Colorant naturel — peut provoquer des réactions allergiques.',
    },
    {
      name: 'BHA (Butylhydroxyanisole)', e_number: 'E320', category: 'antioxidant',
      adi: '0.5 mg/kg/j', source: 'efsa',
      warnings_text: 'Antioxydant synthétique — classé possible cancérogène. À éviter pendant la grossesse.',
    },
    {
      name: 'BHT (Butylhydroxytoluène)', e_number: 'E321', category: 'antioxidant',
      adi: '0.25 mg/kg/j', source: 'efsa',
      warnings_text: 'Antioxydant synthétique — données toxicité limitées. À éviter pendant la grossesse.',
    },
    {
      name: 'Sulfate d\'aluminium', e_number: 'E520', category: 'firming agent',
      adi: '1 mg/kg/j', source: 'efsa',
      warnings_text: 'Sel d\'aluminium — exposition à l\'aluminium à limiter pendant la grossesse (neurotoxicité potentielle).',
    },
    {
      name: 'Acide propionique', e_number: 'E280', category: 'preservative',
      adi: 'not specified', source: 'efsa',
      warnings_text: 'Conservateur — généralement considéré sûr aux doses alimentaires.',
    },
    {
      name: 'Caféine', e_number: 'E_CAFFEINE', category: 'natural stimulant',
      adi: '<200 mg/j pendant la grossesse', source: 'efsa',
      warnings_text: 'EFSA recommande < 200 mg/j pendant la grossesse. Présente dans café, thé, sodas, chocolat.',
    },
    {
      name: 'Stevia (glycosides de stéviol)', e_number: 'E960', category: 'sweetener',
      adi: '4 mg/kg/j', source: 'efsa',
      warnings_text: 'Édulcorant naturel — considéré sûr à doses modérées pendant la grossesse.',
    },
    {
      name: 'Carraghénanes', e_number: 'E407', category: 'thickener',
      adi: 'not specified', source: 'efsa',
      warnings_text: 'Épaississant marin — données limitées sur l\'exposition fœtale. À éviter en grandes quantités.',
    },
    {
      name: 'Dioxyde de titane', e_number: 'E171', category: 'colorant',
      adi: 'not established (carcinogen group 2B)', source: 'efsa',
      warnings_text: 'Interdit dans les aliments en UE depuis 2022 (classifié cancérogène potentiel). Toujours présent dans certains cosmétiques.',
    },
    {
      name: 'Glutamate monosodique', e_number: 'E621', category: 'flavor enhancer',
      adi: 'not specified', source: 'efsa',
      warnings_text: 'Exhausteur de goût — données contradictoires sur le passage placentaire. À consommer avec modération.',
    },
    {
      name: 'Phosphate disodique', e_number: 'E339', category: 'acidity regulator',
      adi: '40 mg/kg/j (phosphates totaux)', source: 'efsa',
      warnings_text: 'Consommation excessive de phosphates déconseillée pendant la grossesse.',
    },
    {
      name: 'Érythrosine', e_number: 'E127', category: 'colorant',
      adi: '0.1 mg/kg/j', source: 'efsa',
      warnings_text: 'Colorant iodé — à éviter en cas de troubles thyroïdiens, données limitées grossesse.',
    },
  ];
}
