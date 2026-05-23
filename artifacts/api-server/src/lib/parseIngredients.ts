// Port of artifacts/helo/lib/productLookup.ts → parseIngredients
// Keep IN SYNC with mobile version so deterministic results are identical.
//
// HOTFIX 2 (post-CHUNK 7) — Améliorations Open Food Facts :
//   1. Extraction des sous-ingrédients entre parenthèses au lieu de les jeter.
//      "émulsifiants (lécithines de SOJA)" → ["émulsifiants",
//                                              "lécithines de soja"]
//   2. Normalisation des ALLERGÈNES EN MAJUSCULES (convention OFF pour
//      surligner SOJA/LAIT/GLUTEN/etc.) → minuscules pour matcher la base.
//   3. Pourcentages avec virgule/point déjà gérés ("21,5 %", "0.3%").
//
// Objectif : maximiser le taux de hit sur la base 5000 ingrédients sans
// toucher au schéma Supabase. Les chaînes OFF typiques deviennent
// matchables par le matcher déterministe.

const NUTRITION_PATTERNS =
  /\b(mati[èe]res?\s+grasses?|acides?\s+gras\s+satur[ée]s?|fibres?\s+alimentaires?|valeur\s+[ée]nerg[ée]tique|sels?\s+min[ée]raux|dont\s+(?:sucres?|acides?))\b/i;

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Normalise les allergènes en MAJUSCULES (convention Open Food Facts pour
 * mettre en évidence SOJA/LAIT/GLUTEN/ŒUFS/etc.) en minuscules.
 *
 * Stratégie conservatrice : on ne lowercase QUE les séquences de ≥ 3 lettres
 * tout-en-maj entourées de séparateurs (espace, début/fin, ponctuation). On
 * évite ainsi de casser les codes E (E150c, E471) ou les acronymes courts.
 */
function normalizeAllergenCaps(s: string): string {
  return s.replace(/\b([A-ZÀ-Ÿ]{3,})\b/g, (m) => m.toLowerCase());
}

/**
 * Extrait le contenu entre parenthèses comme sous-ingrédients séparés AVANT
 * de nettoyer la chaîne principale. Préserve l'info utile (souvent les
 * ingrédients composés OFF type "huile végétale (palme)" cachent l'info
 * critique dans les parens).
 */
function extractParenthesizedSubItems(text: string): string[] {
  const subs: string[] = [];
  const re = /\(([^()]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    subs.push(m[1]);
  }
  return subs;
}

export function parseIngredients(ingredientsText: string): string[] {
  if (!ingredientsText.trim()) return [];

  // 1) Pré-nettoyage GLOBAL (avant extraction parens) : on retire les
  //    pourcentages et marqueurs typographiques pour qu'ils ne polluent ni
  //    la chaîne principale NI les sous-items extraits ensuite. Sans cette
  //    étape, "huile végétale (palme 21,5 %)" donnerait après split un
  //    token "21,5 %" / fragments junk dans les parens.
  const preCleaned = ingredientsText
    .replace(/\d+[,.]?\d*\s*%/g, "")
    .replace(/[*†‡§#]/g, "");

  // 2) Extraire les sous-ingrédients entre parens APRÈS pré-nettoyage.
  const parenSubItems = extractParenthesizedSubItems(preCleaned);

  // 3) Nettoyer la chaîne principale (supprimer les parens elles-mêmes).
  const text = preCleaned.replace(/\([^)]*\)/g, "").replace(/[()]/g, "");

  // 4) Concaténer items principaux + sous-items extraits, puis split commun.
  //    On utilise " ; " comme séparateur sûr qui sera re-splité ensuite.
  const combined =
    parenSubItems.length > 0 ? `${text} ; ${parenSubItems.join(" ; ")}` : text;

  const cleaned = combined
    .split(/[,;.\n]+/)
    .map((s) => s.trim())
    .map((s) => s.replace(/[\s\-–—:.]+$/, "").trim())
    .map(normalizeAllergenCaps) // SOJA → soja, LAIT → lait
    .filter((s) => s.length >= 2)
    .filter((s) => !/:\s*\d/.test(s))
    .filter((s) => !/^dont\b/i.test(s))
    .filter((s) => !NUTRITION_PATTERNS.test(s))
    .filter(
      (s, i, arr) =>
        arr.findIndex((o) => o.toLowerCase() === s.toLowerCase()) === i,
    )
    .map(capitalizeFirst);

  return cleaned;
}
