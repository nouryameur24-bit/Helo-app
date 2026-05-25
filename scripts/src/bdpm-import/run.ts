/**
 * src/bdpm-import/run.ts
 *
 * Import BDPM (Base de Données Publique des Médicaments, data.gouv.fr).
 * Source officielle ministère de la Santé → ~18k médicaments FR.
 *
 * Format BDPM : 8 fichiers TXT pipe-separated.
 *   - CIS_bdpm.txt : médicaments principaux (1 ligne = 1 CIS)
 *   - CIS_CIP_bdpm.txt : présentations + EAN13
 *   - CIS_COMPO_bdpm.txt : composition (substances actives + dosage)
 *   - CIS_HAS_SMR_bdpm.txt : Service Médical Rendu
 *   - ... (autres : indications, conditions, etc.)
 *
 * Pour Hēlo, on importe :
 *   - CIS_bdpm → products (category=medication, name=denomination)
 *   - CIS_CIP → products.barcode (code CIP13 = EAN13)
 *   - CIS_COMPO → products.ingredients_raw (substances actives concaténées)
 *
 * URL téléchargement :
 *   https://www.data.gouv.fr/fr/datasets/base-de-donnees-publique-des-medicaments-bdpm/
 *   → fichiers ZIP, format ISO-8859-15
 *
 * Run :
 *   pnpm --filter @workspace/scripts run import:bdpm [--dry-run] [--max=100]
 *
 * Coût : $0 (pas d'API externe).
 * Durée : ~5 min pour 18k médicaments.
 */
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const BDPM_BASE_URL = 'https://base-donnees-publique.medicaments.gouv.fr/telechargement.php';
const CACHE_DIR = join(process.cwd(), '.bdpm-cache');

const FILES = {
  cis: 'CIS_bdpm.txt',
  cip: 'CIS_CIP_bdpm.txt',
  compo: 'CIS_COMPO_bdpm.txt',
};

interface CIS {
  cis_code: string;
  denomination: string;
  forme_pharma: string;
  voies_admin: string;
  statut_amm: string;
  type_amm: string;
  titulaire: string;
  surveillance: string;
}

interface CIP {
  cis_code: string;
  cip7: string;
  libelle_presentation: string;
  statut_admin: string;
  etat_commercial: string;
  date_declaration: string;
  cip13: string; // EAN13
  agrement: string;
  prix_euro: string;
  prix_avec_honor: string;
  honor_dispens: string;
  indic_rembours: string;
  taux_rembours: string;
}

interface Compo {
  cis_code: string;
  designation_element: string;
  code_substance: string;
  denomination_substance: string;
  dosage_substance: string;
  reference_dosage: string;
  nature_composant: string;
  num_lien: string;
}

/**
 * Note : on ne télécharge pas auto les fichiers BDPM car ils sont gated derrière
 * un formulaire. Le user doit télécharger manuellement le ZIP et placer les .txt
 * dans .bdpm-cache/. Ce script vérifie la présence et explique sinon.
 */
async function ensureFiles(): Promise<void> {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
  const missing: string[] = [];
  for (const fname of Object.values(FILES)) {
    if (!existsSync(join(CACHE_DIR, fname))) {
      missing.push(fname);
    }
  }
  if (missing.length > 0) {
    console.error('❌ Fichiers BDPM manquants dans .bdpm-cache/ :');
    missing.forEach((f) => console.error(`   - ${f}`));
    console.error('\n📥 Télécharge le ZIP BDPM :');
    console.error(`   ${BDPM_BASE_URL}`);
    console.error('   → onglet "Téléchargement" → "Base de données publique des médicaments"');
    console.error('   → Dézippe et place les .txt dans .bdpm-cache/');
    console.error('\n   (Les fichiers sont en ISO-8859-15 / latin1, le script les convertit en UTF-8)');
    process.exit(1);
  }
}

function readBDPMFile(filename: string): string {
  const path = join(CACHE_DIR, filename);
  // BDPM est en ISO-8859-15 (latin1) — Node lit en latin1 puis on caste UTF-8
  const buffer = require('node:fs').readFileSync(path);
  return buffer.toString('latin1');
}

function parseCIS(content: string): Map<string, CIS> {
  const records = parse(content, {
    delimiter: '\t',
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });
  const map = new Map<string, CIS>();
  for (const row of records as string[][]) {
    if (row.length < 8) continue;
    map.set(row[0], {
      cis_code: row[0],
      denomination: row[1],
      forme_pharma: row[2],
      voies_admin: row[3],
      statut_amm: row[4],
      type_amm: row[5],
      titulaire: row[6],
      surveillance: row[7],
    });
  }
  return map;
}

function parseCIP(content: string): Map<string, CIP[]> {
  const records = parse(content, {
    delimiter: '\t',
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });
  const map = new Map<string, CIP[]>();
  for (const row of records as string[][]) {
    if (row.length < 13) continue;
    const cip: CIP = {
      cis_code: row[0],
      cip7: row[1],
      libelle_presentation: row[2],
      statut_admin: row[3],
      etat_commercial: row[4],
      date_declaration: row[5],
      cip13: row[6],
      agrement: row[7],
      prix_euro: row[8],
      prix_avec_honor: row[9],
      honor_dispens: row[10],
      indic_rembours: row[11],
      taux_rembours: row[12],
    };
    const arr = map.get(cip.cis_code) ?? [];
    arr.push(cip);
    map.set(cip.cis_code, arr);
  }
  return map;
}

function parseCompo(content: string): Map<string, Compo[]> {
  const records = parse(content, {
    delimiter: '\t',
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });
  const map = new Map<string, Compo[]>();
  for (const row of records as string[][]) {
    if (row.length < 8) continue;
    const compo: Compo = {
      cis_code: row[0],
      designation_element: row[1],
      code_substance: row[2],
      denomination_substance: row[3],
      dosage_substance: row[4],
      reference_dosage: row[5],
      nature_composant: row[6],
      num_lien: row[7],
    };
    const arr = map.get(compo.cis_code) ?? [];
    arr.push(compo);
    map.set(compo.cis_code, arr);
  }
  return map;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const maxArg = args.find((a) => a.startsWith('--max='));
  const maxProducts = maxArg ? Number(maxArg.split('=')[1]) : undefined;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  await ensureFiles();

  console.log('📂 Reading BDPM files...');
  const cisMap = parseCIS(readBDPMFile(FILES.cis));
  const cipMap = parseCIP(readBDPMFile(FILES.cip));
  const compoMap = parseCompo(readBDPMFile(FILES.compo));

  console.log(`   CIS:   ${cisMap.size} médicaments`);
  console.log(`   CIP:   ${[...cipMap.values()].reduce((acc, arr) => acc + arr.length, 0)} présentations`);
  console.log(`   Compo: ${[...compoMap.values()].reduce((acc, arr) => acc + arr.length, 0)} compositions`);

  // Build products array
  const products: Array<{
    barcode: string;
    name: string;
    brand: string;
    category: string;
    ingredients_raw: string;
    source: string;
    quality_score: number;
    metadata: Record<string, unknown>;
  }> = [];

  for (const [cis_code, cis] of cisMap) {
    const cips = cipMap.get(cis_code) ?? [];
    const compos = compoMap.get(cis_code) ?? [];

    // Substances actives concatenées
    const substances = compos
      .filter((c) => c.nature_composant === 'SA') // Substance Active
      .map((c) => `${c.denomination_substance} ${c.dosage_substance}`.trim())
      .filter((s) => s.length > 0);
    const ingredients_raw = substances.join(', ');

    // Pour chaque présentation (CIP13 = EAN13), créer un produit
    for (const cip of cips) {
      if (!cip.cip13 || cip.cip13.length !== 13) continue;
      // Skip non-commercialisés
      if (cip.etat_commercial !== 'Présentation active') continue;

      products.push({
        barcode: cip.cip13,
        name: cis.denomination,
        brand: cis.titulaire,
        category: 'medication',
        ingredients_raw,
        source: 'bdpm',
        quality_score: 95, // source officielle gov FR
        metadata: {
          cis_code,
          cip7: cip.cip7,
          forme_pharma: cis.forme_pharma,
          voies_admin: cis.voies_admin,
          statut_amm: cis.statut_amm,
          titulaire: cis.titulaire,
          presentation: cip.libelle_presentation,
          prix_euro: cip.prix_euro,
          taux_rembours: cip.taux_rembours,
        },
      });
    }
  }

  console.log(`\n📦 Built ${products.length} BDPM products with EAN13`);

  if (maxProducts) {
    products.splice(maxProducts);
    console.log(`   Limited to ${products.length} (--max=${maxProducts})`);
  }

  if (dryRun) {
    console.log('\n🧪 Dry-run, sample :');
    console.log(JSON.stringify(products.slice(0, 5), null, 2));
    return;
  }

  // Batched insert
  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const CHUNK = 500;
  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < products.length; i += CHUNK) {
    const chunk = products.slice(i, i + CHUNK);
    const { error, count } = await client
      .from('products')
      .upsert(chunk, { onConflict: 'barcode', ignoreDuplicates: true, count: 'exact' });
    if (error) {
      console.error(`Chunk ${i} error:`, error.message);
      continue;
    }
    inserted += count ?? 0;
    skipped += chunk.length - (count ?? 0);
    if ((i / CHUNK) % 5 === 0) {
      console.log(`Progress: ${i + chunk.length}/${products.length} (${inserted} inserted)`);
    }
  }

  console.log('\n✅ BDPM import done');
  console.log(`   ${inserted} new médicaments inserted`);
  console.log(`   ${skipped} déjà en DB (skipped)`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
