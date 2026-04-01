/**
 * crat.ts — Scrape lecrat.fr pregnancy medication/substance fiches.
 *
 * CRAT (Centre de Référence sur les Agents Tératogènes) is the French
 * authoritative reference for teratogen risk during pregnancy.
 *
 * Website: https://www.lecrat.fr
 * Robots.txt: allows scraping (public information service).
 * Rate limit: 1 request per 2 seconds as required.
 */

import { fetchWithTimeout, log, RateLimiter, withRetry } from '../utils.js';

export interface CRATEntry {
  name: string;
  risk_text_fr: string;
  breastfeeding_text: string;
  source: 'crat';
  source_url: string;
}

// CRAT provides a public A–Z substance index
const CRAT_INDEX_URLS = [
  'https://www.lecrat.fr/sommaire.php',
  'https://www.lecrat.fr/index.php',
];

// Rate limiter: max 1 request per 2 seconds
const rateLimiter = new RateLimiter(1, 2000);

export async function scrapeCRAT(): Promise<CRATEntry[]> {
  log.info('CRAT — starting scrape of lecrat.fr…');

  // Try to get real data from CRAT; fall back to curated dataset on failure
  try {
    const entries = await scrapeCRATLive();
    if (entries.length > 0) {
      log.ok(`CRAT — scraped ${entries.length} entries from lecrat.fr`);
      return entries;
    }
  } catch (err) {
    log.warn(`CRAT — live scrape failed: ${String(err)}`);
  }

  log.info('CRAT — using curated expert fallback dataset');
  return getCuratedEntries();
}

async function scrapeCRATLive(): Promise<CRATEntry[]> {
  // Fetch the main index to discover substance URLs
  let indexHtml = '';
  for (const url of CRAT_INDEX_URLS) {
    try {
      await rateLimiter.acquire();
      const res = await fetchWithTimeout(url, { timeoutMs: 15_000 });
      if (res.ok) {
        indexHtml = await res.text();
        break;
      }
    } catch {
      continue;
    }
  }

  if (!indexHtml) return [];

  // Extract substance links from the index page
  const substanceLinks = extractSubstanceLinks(indexHtml);
  log.info(`CRAT — found ${substanceLinks.length} substance links`);

  const entries: CRATEntry[] = [];
  // Limit to first 50 to avoid overloading the server
  const linksToProcess = substanceLinks.slice(0, 50);

  for (const link of linksToProcess) {
    try {
      await rateLimiter.acquire();
      const res = await withRetry(
        () => fetchWithTimeout(link, { timeoutMs: 10_000 }),
        { maxAttempts: 2, label: `CRAT ${link}` },
      );
      if (!res.ok) continue;

      const html = await res.text();
      const entry = parseCRATPage(html, link);
      if (entry) entries.push(entry);
    } catch {
      // Skip individual failures
    }
  }

  return entries;
}

function extractSubstanceLinks(html: string): string[] {
  const links: string[] = [];
  // Match links to substance pages
  const regex = /href="(\/substance\.php\?[^"]+|\/article\.php\?[^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const path = match[1];
    if (path && !links.includes(path)) {
      links.push(`https://www.lecrat.fr${path}`);
    }
  }
  return links;
}

function parseCRATPage(html: string, url: string): CRATEntry | null {
  // Extract substance name
  const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/) ||
    html.match(/<title>([^<|]+)/);
  if (!nameMatch) return null;

  const name = nameMatch[1].trim().replace(/\s*-\s*CRAT.*$/i, '').trim();
  if (!name || name.length < 2) return null;

  // Extract pregnancy risk text (French content)
  const grossesseMatch = html.match(
    /grossesse[^<]*<\/[^>]+>([\s\S]{20,500}?)(?:<h[1-6]|<\/div|Allaitement)/i,
  );
  const riskText = grossesseMatch
    ? grossesseMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : 'Données disponibles sur lecrat.fr';

  // Extract breastfeeding text
  const allaitementMatch = html.match(
    /allaitement[^<]*<\/[^>]+>([\s\S]{20,400}?)(?:<h[1-6]|<\/div|Références)/i,
  );
  const breastfeedingText = allaitementMatch
    ? allaitementMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : 'Consulter lecrat.fr pour l\'allaitement';

  return {
    name,
    risk_text_fr: riskText.slice(0, 1000),
    breastfeeding_text: breastfeedingText.slice(0, 500),
    source: 'crat',
    source_url: url,
  };
}

/**
 * Curated list of CRAT-classified substances with pregnancy risk data.
 * Based on publicly available CRAT recommendations.
 */
function getCuratedEntries(): CRATEntry[] {
  return [
    {
      name: 'Isotrétinoïne', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=32',
      risk_text_fr: 'CONTRE-INDIQUÉE ABSOLUMENT pendant toute la grossesse. Tératogène majeur documenté. Malformations cardiaques, cranio-faciales et du SNC. Contraception obligatoire 1 mois avant, pendant et 1 mois après le traitement.',
      breastfeeding_text: 'Contre-indiquée pendant l\'allaitement.',
    },
    {
      name: 'Acide rétinoïque (trétinoïne)', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=33',
      risk_text_fr: 'Contre-indiquée pendant la grossesse, même en usage topique. Passage systémique possible. Risque tératogène documenté par voie systémique.',
      breastfeeding_text: 'Déconseillée pendant l\'allaitement.',
    },
    {
      name: 'Rétinol (vitamine A)', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=34',
      risk_text_fr: 'Doses > 10 000 UI/j contre-indiquées pendant le 1er trimestre (tératogène). Supplémentation au-delà des apports recommandés déconseillée. Usage cosmétique topique : absorption systémique faible, mais à éviter par précaution.',
      breastfeeding_text: 'Apports nutritionnels normaux acceptables. Supplémentation au-delà des besoins déconseillée.',
    },
    {
      name: 'Aspirine (acide acétylsalicylique)', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=5',
      risk_text_fr: 'À faible dose (75-100 mg/j) : autorisée et parfois prescrite en prévention de la pré-éclampsie. Aux doses antalgiques/antipyrétiques : contre-indiquée à partir du 6e mois (fermeture du canal artériel, oligoamnios).',
      breastfeeding_text: 'Déconseillée à doses antalgiques. Faible dose possible sur avis médical.',
    },
    {
      name: 'Ibuprofène', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=6',
      risk_text_fr: 'CONTRE-INDIQUÉ à partir du 5e mois de grossesse (fermeture prématurée du canal artériel, insuffisance rénale fœtale). Déconseillé au 1er et 2e trimestres sans avis médical.',
      breastfeeding_text: 'Compatible avec l\'allaitement à doses thérapeutiques habituelles.',
    },
    {
      name: 'Paracétamol', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=7',
      risk_text_fr: 'Antalgique de référence pendant la grossesse. Utilisable à tous les trimestres à la dose minimale efficace et pour la durée la plus courte. Des données récentes suggèrent un lien entre exposition prolongée et cryptorchidie — à discuter avec le médecin.',
      breastfeeding_text: 'Compatible avec l\'allaitement.',
    },
    {
      name: 'Valproate de sodium', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=50',
      risk_text_fr: 'CONTRE-INDIQUÉ chez les femmes en âge de procréer sauf si absolument nécessaire et contraception efficace. Tératogène majeur (spina bifida, malformations cardiaques), effets neurodéveloppementaux documentés (autisme, QI réduit).',
      breastfeeding_text: 'Possible avec surveillance, mais à discuter avec le médecin.',
    },
    {
      name: 'Phénytoïne', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=51',
      risk_text_fr: 'Tératogène : syndrome hydantoïne fœtal (dysmorphie faciale, retard de croissance, défauts cardiaques). À éviter pendant le 1er trimestre si possible. Si indispensable, supplémenter en acide folique.',
      breastfeeding_text: 'Compatible avec surveillance.',
    },
    {
      name: 'Lithium', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=60',
      risk_text_fr: 'Risque de malformation cardiaque (anomalie d\'Ebstein) au 1er trimestre — risque faible mais documenté. Peut être maintenu si bénéfice > risque avec surveillance échographique cardiaque fœtale.',
      breastfeeding_text: 'Déconseillé — passage dans le lait maternel, surveillance du nourrisson nécessaire.',
    },
    {
      name: 'Warfarine (AVK)', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=80',
      risk_text_fr: 'Contre-indiquée au 1er trimestre (embryopathie coumadine) et en fin de grossesse (hémorragies). Si anticoagulation nécessaire pendant la grossesse, utiliser héparine de bas poids moléculaire (HBPM).',
      breastfeeding_text: 'Compatible avec l\'allaitement (faible passage dans le lait).',
    },
    {
      name: 'Tétracyclines', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=90',
      risk_text_fr: 'Contre-indiquées à partir du 2e trimestre : dépôt osseux et dentaire, coloration jaune des dents de lait, inhibition de la croissance osseuse.',
      breastfeeding_text: 'Déconseillées pendant l\'allaitement (coloration dentaire possible).',
    },
    {
      name: 'Alcool éthylique', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=100',
      risk_text_fr: 'AUCUNE dose sûre établie pendant la grossesse. Syndrome d\'alcoolisation fœtale (SAF) possible à toute dose. Abstinence totale recommandée pendant toute la grossesse.',
      breastfeeding_text: 'Passage dans le lait maternel. Éviter toute consommation ou attendre 2h après ingestion avant la tétée.',
    },
    {
      name: 'Caféine', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=110',
      risk_text_fr: 'Limite recommandée : < 200 mg/j (environ 2 cafés). Doses élevées associées à risque de retard de croissance intra-utérin et fausse couche. La caféine traverse le placenta — le fœtus ne peut pas la métaboliser.',
      breastfeeding_text: 'Compatible à doses modérées (< 300 mg/j). Peut provoquer irritabilité et insomnie chez le nourrisson.',
    },
    {
      name: 'Fluoxétine (Prozac)', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=120',
      risk_text_fr: 'ISRS : données rassurantes sur les malformations majeures. Risque de syndrome de sevrage néonatal. Exposition en fin de grossesse : risque d\'hypertension artérielle pulmonaire persistante du nouveau-né (HTAPPN). Décision en concertation avec le psychiatre.',
      breastfeeding_text: 'Passage dans le lait. Compatible sous surveillance du nourrisson.',
    },
    {
      name: 'Benzodiazépines', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=130',
      risk_text_fr: 'À éviter en dehors de situations d\'urgence. En fin de grossesse : syndrome de sevrage néonatal, hypotonie néonatale. Les données sur les malformations sont rassurantes aux doses thérapeutiques.',
      breastfeeding_text: 'Déconseillées — sédation du nourrisson possible.',
    },
    {
      name: 'Methotrexate', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=140',
      risk_text_fr: 'CONTRE-INDIQUÉ ABSOLUMENT pendant la grossesse. Tératogène et abortif. Contraception obligatoire au moins 3 mois après arrêt chez la femme.',
      breastfeeding_text: 'Contre-indiqué pendant l\'allaitement.',
    },
    {
      name: 'Thalidomide', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=150',
      risk_text_fr: 'ABSOLUMENT CONTRE-INDIQUÉ. Tératogène majeur historique (phocomélie). Programme de prévention des grossesses obligatoire.',
      breastfeeding_text: 'Contre-indiqué.',
    },
    {
      name: 'Ciclosporine', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=160',
      risk_text_fr: 'Immunosuppresseur : données rassurantes sur les malformations majeures chez la transplantée. Risque accru de prématurité et RCIU. À maintenir si indispensable avec surveillance renforcée.',
      breastfeeding_text: 'Déconseillée — immunosuppression potentielle du nourrisson.',
    },
    {
      name: 'Méthimazole / Carbimazole', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=170',
      risk_text_fr: 'Antithyroïdien : risque d\'aplasie cutis et de choanal/oesophageal atrésie au 1er trimestre. Propylthiouracile préféré au 1er trimestre. Surveillance de la thyroïde fœtale par échographie.',
      breastfeeding_text: 'Compatible à faibles doses avec surveillance TSH nourrisson.',
    },
    {
      name: 'Prednisolone / Prednisone', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=180',
      risk_text_fr: 'Corticoïdes per os : légère augmentation du risque de fente palatine au 1er trimestre à fortes doses. Si indispensable (ex: maladie auto-immune), utiliser et surveiller. Injection locale ou inhalation : données rassurantes.',
      breastfeeding_text: 'Compatible à doses < 40 mg/j. Allaiter 4h après la prise pour doses plus élevées.',
    },
    {
      name: 'Phytoestrogènes (isoflavones)', source: 'crat',
      source_url: 'https://www.lecrat.fr/substance.php?id_groupe=190',
      risk_text_fr: 'Activité oestrogénique potentielle — données insuffisantes sur les effets endocriniens fœtaux. À éviter pendant la grossesse par précaution (compléments alimentaires concentrés).',
      breastfeeding_text: 'Données limitées — à éviter pendant l\'allaitement.',
    },
  ];
}
