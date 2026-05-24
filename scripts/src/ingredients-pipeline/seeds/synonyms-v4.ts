/**
 * seeds/synonyms-v4.ts — Patches de synonymes pour les 30 ingrédients les
 * plus FRÉQUEMMENT vus en `no_signal` lors des scans (cf. metric
 * `scan_no_signal_sample` introduit au Lot 9).
 *
 * Pourquoi : le matcher actuel (matcher.ts:wordMatches) cherche dans
 * `name`, `name_inci` et `synonyms`. Si OFF renvoie "MILK" (anglais) alors
 * que la BDD a "Lait" (français) sans synonyme "milk", le match rate
 * tombe. Ce patch enrichit la colonne `synonyms` des ingrédients les plus
 * communs avec : nom français, nom anglais, nom INCI, CAS number, alias
 * commerciaux.
 *
 * Application : exécuter le SQL généré par `buildSynonymsSql()` dans le
 * SQL Editor Supabase (le pipeline d'insertion gère pas la mise à jour
 * partielle d'une colonne sans réécrire toute la row).
 *
 * Impact attendu : +5-10% sur le match_rate global (mesurable via metric
 * scan_coverage). À valider après seed.
 */

/**
 * Format : la clé est le `name_inci` cible (lookup unique en base), la
 * valeur est la liste des synonymes à fusionner avec ceux déjà présents.
 */
export const SYNONYMS_V4: Record<string, string[]> = {
  // ─── Allergènes alimentaires majeurs ─────────────────────────────────────
  lait: ["milk", "leche", "milch", "latte", "melk", "lait écrémé", "lait entier", "lait demi-écrémé", "lait en poudre", "lait UHT", "milk powder", "skimmed milk"],
  oeuf: ["œuf", "egg", "egg white", "egg yolk", "blanc d'œuf", "jaune d'œuf", "huevo", "ovo", "uovo"],
  gluten: ["gluten", "wheat gluten", "gluten de blé", "gluten de froment"],
  soja: ["soy", "soya", "soja", "lécithine de soja", "soy lecithin", "soybean", "isolat de soja", "protéines de soja"],
  arachide: ["peanut", "arachis", "arachis hypogaea", "huile d'arachide", "peanut oil", "groundnut"],
  noisette: ["hazelnut", "corylus avellana", "noisettes", "pâte de noisette", "hazelnut paste"],
  amande: ["almond", "prunus amygdalus dulcis", "huile d'amande", "almond oil", "lait d'amande", "almond milk"],
  sesame: ["sésame", "sesame", "sesamum indicum", "huile de sésame", "tahin", "tahini"],

  // ─── Conservateurs cosmétiques top 10 ─────────────────────────────────────
  methylparaben: ["methyl paraben", "methyl 4-hydroxybenzoate", "e218", "nipagine", "cas-99-76-3"],
  propylparaben: ["propyl paraben", "propyl 4-hydroxybenzoate", "e216", "cas-94-13-3"],
  butylparaben: ["butyl paraben", "butyl 4-hydroxybenzoate", "cas-94-26-8"],
  ethylparaben: ["ethyl paraben", "ethyl 4-hydroxybenzoate", "e214", "cas-120-47-8"],
  phenoxyethanol: ["phénoxyéthanol", "phenoxyethanol", "2-phenoxyethanol", "cas-122-99-6"],
  "sodium benzoate": ["benzoate de sodium", "e211", "cas-532-32-1"],
  "potassium sorbate": ["sorbate de potassium", "e202", "cas-24634-61-5"],
  triclosan: ["triclosan", "5-chloro-2-(2,4-dichlorophenoxy)phenol", "cas-3380-34-5", "irgasan"],
  methylisothiazolinone: ["méthylisothiazolinone", "MIT", "kathon", "cas-2682-20-4"],
  methylchloroisothiazolinone: ["méthylchloroisothiazolinone", "MCIT", "kathon CG", "cas-26172-55-4"],

  // ─── Tensioactifs cosmétiques ─────────────────────────────────────────────
  "sodium lauryl sulfate": ["SLS", "sulfate de laurylsodium", "sodium dodecyl sulfate", "lauryl sulfate de sodium", "cas-151-21-3"],
  "sodium laureth sulfate": ["SLES", "sodium lauryl ether sulfate", "sulfate de laurethsodium", "cas-9004-82-4"],
  "cocamidopropyl betaine": ["cocamidopropylbétaïne", "CAPB", "cocoamphoacétate", "cas-61789-40-0"],

  // ─── Perturbateurs endocriniens connus ────────────────────────────────────
  bisphenol_a: ["BPA", "bisphénol A", "bisphenol a", "cas-80-05-7", "2,2-bis(4-hydroxyphenyl)propane"],
  oxybenzone: ["benzophénone-3", "benzophenone-3", "BP-3", "oxybenzone", "cas-131-57-7"],
  octocrylene: ["octocrylène", "octocrylene", "cas-6197-30-4"],

  // ─── Rétinoïdes (contre-indication grossesse) ─────────────────────────────
  retinol: ["rétinol", "vitamine A", "vitamin A", "retinyl", "rétinyle"],
  "retinyl palmitate": ["palmitate de rétinyle", "retinyl palmitate", "vitamin A palmitate", "cas-79-81-2"],
  tretinoin: ["trétinoïne", "tretinoin", "acide rétinoïque", "retinoic acid", "cas-302-79-4", "isotrétinoïne", "isotretinoin"],

  // ─── Médicaments fréquents ────────────────────────────────────────────────
  paracetamol: ["paracétamol", "acetaminophen", "acetaminophène", "doliprane", "efferalgan", "dafalgan", "cas-103-90-2", "n-acetyl-para-aminophenol"],
  ibuprofene: ["ibuprofène", "ibuprofen", "nurofen", "advil", "spedifen", "cas-15687-27-1"],
  aspirine: ["aspirine", "acide acétylsalicylique", "acetylsalicylic acid", "ASA", "cas-50-78-2", "aspegic"],

  // ─── Caféine et stimulants ────────────────────────────────────────────────
  cafeine: ["caféine", "caffeine", "1,3,7-trimethylxanthine", "cas-58-08-2", "guaranine", "matéine", "théine"],
  taurine: ["taurine", "acide 2-aminoéthylsulfonique", "cas-107-35-7"],
};

/**
 * Génère le SQL d'UPDATE pour fusionner ces synonymes avec ceux déjà
 * présents en BDD (sans écraser, sans doublon — array_cat + dédoublonnage).
 *
 * Usage : copier la sortie dans le SQL Editor Supabase et exécuter.
 *
 *   import { buildSynonymsSql } from './seeds/synonyms-v4.js';
 *   console.log(buildSynonymsSql());
 */
export function buildSynonymsSql(): string {
  const lines: string[] = [
    "-- Patch synonymes v4 — Lot 9 coverage & reliability",
    "-- Idempotent : utilise un set union via SELECT DISTINCT pour ne pas dupliquer.",
    "",
  ];
  for (const [nameInci, syns] of Object.entries(SYNONYMS_V4)) {
    const escapedSyns = syns.map((s) => `'${s.replace(/'/g, "''")}'`).join(", ");
    const escapedKey = nameInci.replace(/'/g, "''");
    lines.push(
      `UPDATE public.ingredients`,
      `SET synonyms = (`,
      `  SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(synonyms, ARRAY[]::text[]) || ARRAY[${escapedSyns}]))`,
      `)`,
      `WHERE LOWER(name_inci) = LOWER('${escapedKey}');`,
      "",
    );
  }
  return lines.join("\n");
}

/**
 * À ajouter à un script dédié `scripts/src/seed-synonyms.ts` :
 *
 *   import { buildSynonymsSql } from './ingredients-pipeline/seeds/synonyms-v4.js';
 *   console.log(buildSynonymsSql());
 *
 * Puis : `npx tsx src/seed-synonyms.ts > /tmp/syn.sql`
 * Puis : coller le contenu dans Supabase SQL Editor → Run.
 */
