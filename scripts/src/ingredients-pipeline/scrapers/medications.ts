/**
 * medications.ts — Fetch OTC medication data from the French public medication database.
 *
 * Base de données publique des médicaments (BDPM)
 * API: https://base-donnees-publique.medicaments.gouv.fr
 * Public API, no key needed.
 */

import { fetchWithTimeout, log, RateLimiter, withRetry } from '../utils.js';

export interface MedicationEntry {
  name: string;
  active_substance: string;
  pregnancy_warning: string;
  source: 'bdpm';
}

const BDPM_SEARCH_URL = 'https://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=';
const RATE_LIMITER = new RateLimiter(2, 500);

// BDPM provides downloadable CSV files for various data sets
const BDPM_SUBSTANCE_CSV_URL =
  'https://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_COMPO_bdpm.txt';
const BDPM_SPECIALITES_CSV_URL =
  'https://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_bdpm.txt';

export async function scrapeMedications(): Promise<MedicationEntry[]> {
  log.info('BDPM — fetching French medication database…');

  try {
    const entries = await fetchBDPMLive();
    if (entries.length > 0) {
      log.ok(`BDPM — fetched ${entries.length} OTC medications`);
      return entries;
    }
  } catch (err) {
    log.warn(`BDPM — live fetch failed: ${String(err)}`);
  }

  log.info('BDPM — using curated OTC medication fallback dataset');
  return getFallbackEntries();
}

async function fetchBDPMLive(): Promise<MedicationEntry[]> {
  // Fetch the main specialties file (CIS_bdpm.txt)
  await RATE_LIMITER.acquire();
  const res = await withRetry(
    () => fetchWithTimeout(BDPM_SPECIALITES_CSV_URL, { timeoutMs: 30_000 }),
    { maxAttempts: 3, label: 'BDPM specialties' },
  );

  if (!res.ok) throw new Error(`BDPM HTTP ${res.status}`);

  const text = await res.text();
  return parseBDPMSpecialties(text);
}

function parseBDPMSpecialties(text: string): MedicationEntry[] {
  const lines = text.split('\n').slice(1); // Skip header
  const entries: MedicationEntry[] = [];

  for (const line of lines) {
    const cols = line.split('\t');
    if (cols.length < 10) continue;

    const name = cols[1]?.trim() || '';
    // Column 8 or 9 often contains OTC status ("Médicament non soumis à prescription médicale")
    const prescriptionStatus = cols[8]?.trim() || '';
    const isOTC = prescriptionStatus.toLowerCase().includes('non soumis') ||
      prescriptionStatus.toLowerCase().includes('sans ordonnance');

    if (!isOTC || !name) continue;

    // Column 9 often contains marketing status
    const marketingStatus = cols[7]?.trim() || '';
    if (!marketingStatus.toLowerCase().includes('commercialis')) continue;

    entries.push({
      name,
      active_substance: '',
      pregnancy_warning: 'Consulter un professionnel de santé avant utilisation pendant la grossesse',
      source: 'bdpm',
    });
  }

  return entries.slice(0, 400); // Limit to 400 entries
}

function getFallbackEntries(): MedicationEntry[] {
  return [
    {
      name: 'Paracétamol 500mg', active_substance: 'Paracétamol', source: 'bdpm',
      pregnancy_warning: 'Antalgique de référence pendant la grossesse. Utiliser à la dose minimale efficace. Durée de traitement courte recommandée. À discuter avec le médecin si usage prolongé.',
    },
    {
      name: 'Ibuprofène 200mg/400mg', active_substance: 'Ibuprofène', source: 'bdpm',
      pregnancy_warning: 'CONTRE-INDIQUÉ à partir du 5e mois (20 SA). Déconseillé aux 1er et 2e trimestres. Risque de fermeture prématurée du canal artériel et d\'insuffisance rénale fœtale.',
    },
    {
      name: 'Aspirine 500mg', active_substance: 'Acide acétylsalicylique', source: 'bdpm',
      pregnancy_warning: 'CONTRE-INDIQUÉE à partir du 6e mois à doses antalgiques. À faible dose (75-100mg) peut être prescrite par le médecin. Ne jamais s\'automédiquer pendant la grossesse.',
    },
    {
      name: 'Doliprane', active_substance: 'Paracétamol', source: 'bdpm',
      pregnancy_warning: 'Compatible pendant la grossesse à dose usuelle (1g × 4/j max). Éviter toute dose excessive (hépatotoxicité). Discuter avec médecin si usage > 5 jours.',
    },
    {
      name: 'Efferalgan', active_substance: 'Paracétamol', source: 'bdpm',
      pregnancy_warning: 'Antalgique autorisé pendant la grossesse à dose recommandée. Forme effervescente : tenir compte de la teneur en sodium en cas de rétention hydrique.',
    },
    {
      name: 'Advil', active_substance: 'Ibuprofène', source: 'bdpm',
      pregnancy_warning: 'INTERDIT à partir du 5e mois de grossesse. Déconseillé aux 1er et 2e trimestres. Préférer le paracétamol pour toute la durée de la grossesse.',
    },
    {
      name: 'Nurofen', active_substance: 'Ibuprofène', source: 'bdpm',
      pregnancy_warning: 'CONTRE-INDIQUÉ à partir du 5e mois. Risque de malformation rénale et cardiovasculaire fœtale si pris après 20 SA.',
    },
    {
      name: 'Maalox', active_substance: 'Hydroxyde d\'aluminium / hydroxyde de magnésium', source: 'bdpm',
      pregnancy_warning: 'Antiacide : généralement compatible pendant la grossesse. Éviter usage chronique — l\'aluminium peut s\'accumuler. Préférer les antiacides à base de calcium sur avis médical.',
    },
    {
      name: 'Gaviscon', active_substance: 'Alginate de sodium / bicarbonate de sodium', source: 'bdpm',
      pregnancy_warning: 'Traitement des brûlures d\'estomac : compatible pendant la grossesse. Première intention recommandée pour le RGO gestationnel.',
    },
    {
      name: 'Smecta', active_substance: 'Diosmectite', source: 'bdpm',
      pregnancy_warning: 'Anti-diarrhéique : compatible pendant la grossesse. Peut réduire l\'absorption de médicaments — à prendre à distance des autres traitements.',
    },
    {
      name: 'Imodium', active_substance: 'Lopéramide', source: 'bdpm',
      pregnancy_warning: 'Déconseillé pendant la grossesse (données limitées). En cas de diarrhée sévère, consulter. Préférer la réhydratation orale et les pansements digestifs.',
    },
    {
      name: 'Benadryl', active_substance: 'Diphenhydramine', source: 'bdpm',
      pregnancy_warning: 'Antihistaminique H1 : à éviter au 1er trimestre (données contradictoires). Au 3e trimestre : risque de syndrome de sevrage néonatal. Consulter avant usage.',
    },
    {
      name: 'Zyrtec', active_substance: 'Cétirizine', source: 'bdpm',
      pregnancy_warning: 'Antihistaminique : données rassurantes sur les malformations majeures. Peut être utilisé si bénéfice > risque, de préférence sur courte durée et sur avis médical.',
    },
    {
      name: 'Clarityne', active_substance: 'Loratadine', source: 'bdpm',
      pregnancy_warning: 'Antihistaminique : données rassurantes en 2e et 3e trimestres. Antihistaminique de préférence pour les allergies si traitement nécessaire.',
    },
    {
      name: 'Rhinofluimucil', active_substance: 'Acétylcystéine / tuaminoheptane', source: 'bdpm',
      pregnancy_warning: 'Déconseillé pendant la grossesse — le vasoconstricteur (tuaminoheptane) peut réduire la perfusion placentaire.',
    },
    {
      name: 'Imigrane', active_substance: 'Sumatriptan', source: 'bdpm',
      pregnancy_warning: 'Triptan antimigraine : données rassurantes dans les registres de grossesse. Peut être utilisé si bénéfice > risque, sur avis médical. Préférer le paracétamol en première intention.',
    },
    {
      name: 'Voltarène gel', active_substance: 'Diclofénac', source: 'bdpm',
      pregnancy_warning: 'AINS en usage local : contre-indiqué à partir du 6e mois même en application cutanée. Passage systémique documenté. À éviter pendant toute la grossesse si possible.',
    },
    {
      name: 'Synthol', active_substance: 'Camphre / alcool', source: 'bdpm',
      pregnancy_warning: 'Camphre : contre-indiqué pendant la grossesse — tératogène documenté à fortes doses. Même en application locale, le passage transcutané est possible.',
    },
    {
      name: 'Hexomédine', active_substance: 'Hexamidine', source: 'bdpm',
      pregnancy_warning: 'Antiseptique topique : données limitées. À utiliser avec précaution sur de petites surfaces pendant la grossesse.',
    },
    {
      name: 'Bétadine', active_substance: 'Polyvidone iodée', source: 'bdpm',
      pregnancy_warning: 'CONTRE-INDIQUÉE à partir du 4e mois : l\'iode passe dans la circulation fœtale et peut bloquer la thyroïde fœtale (goitre, hypothyroïdie néonatale). Utiliser des antiseptiques non iodés.',
    },
  ];
}
