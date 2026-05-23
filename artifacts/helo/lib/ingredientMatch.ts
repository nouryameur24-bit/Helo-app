/**
 * Utilitaires de matching d'ingrédients partagés entre :
 *   - lib/productLookup.ts (chemin online Supabase)
 *   - lib/offline.ts        (chemin offline AsyncStorage)
 *
 * Mirror exact de artifacts/api-server/src/lib/matcher.ts. Le matcher
 * mobile et le matcher backend DOIVENT rester synchrones sinon un même
 * produit donne 2 scores différents selon le chemin (online vs offline
 * vs alternatives).
 *
 * Bug d'origine (QA test Moutarde Amora, 23 mai 2026) : `nameLower.includes`
 * faisait matcher l'ingrédient "vinaigre d'alcool" sur la row "alcool" du
 * dictionnaire → score 27/100 (danger T1). Fix : whitelist d'exceptions
 * médicalement safe + word-boundary regex.
 */

// ─── Whitelist d'exceptions safe ────────────────────────────────────────────
//
// Court-circuite TOUTE règle du dictionnaire. Les composés ci-dessous
// contiennent un mot dangereux dans leur libellé mais sont médicalement
// inoffensifs en grossesse.
const SAFE_OVERRIDES: { pattern: RegExp; label: string }[] = [
  {
    pattern:
      /\bvinaigre\s+(?:blanc|d['’]?\s*alcool|de\s+vin|de\s+cidre|balsamique)\b/iu,
    label: 'Vinaigre',
  },
  { pattern: /\bcetearyl\s+alcohol\b/iu, label: 'Cetearyl alcohol (alcool gras)' },
  { pattern: /\bcetyl\s+alcohol\b/iu, label: 'Cetyl alcohol (alcool gras)' },
  { pattern: /\bstearyl\s+alcohol\b/iu, label: 'Stearyl alcohol (alcool gras)' },
  { pattern: /\bbehenyl\s+alcohol\b/iu, label: 'Behenyl alcohol (alcool gras)' },
  { pattern: /\bmyristyl\s+alcohol\b/iu, label: 'Myristyl alcohol (alcool gras)' },
  { pattern: /\bbenzyl\s+alcohol\b/iu, label: 'Benzyl alcohol (conservateur cosmétique)' },
  { pattern: /\balcool[s]?\s+gras\b/iu, label: 'Alcool gras' },
];

export function matchSafeOverride(
  ingredientName: string,
): { matched: true; label: string } | null {
  for (const { pattern, label } of SAFE_OVERRIDES) {
    if (pattern.test(ingredientName)) return { matched: true, label };
  }
  return null;
}

// ─── Word-boundary matching ─────────────────────────────────────────────────

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const REGEX_CACHE = new Map<string, RegExp | null>();
const REGEX_CACHE_MAX = 20_000;

function makeWordRegex(term: string): RegExp | null {
  const trimmed = term.trim();
  if (trimmed.length < 2) return null;
  const cached = REGEX_CACHE.get(trimmed);
  if (cached !== undefined) return cached;
  const escaped = escapeForRegex(trimmed)
    .replace(/['’]/g, "['’]")
    .replace(/\s+/g, '\\s+');
  let compiled: RegExp | null = null;
  try {
    compiled = new RegExp(`\\b${escaped}\\b`, 'iu');
  } catch {
    compiled = null;
  }
  if (REGEX_CACHE.size < REGEX_CACHE_MAX) {
    REGEX_CACHE.set(trimmed, compiled);
  }
  return compiled;
}

export function wordMatches(haystack: string, needle: string): boolean {
  const re = makeWordRegex(needle);
  return re ? re.test(haystack) : false;
}

/**
 * Trouve la première row du dictionnaire qui match l'ingrédient scanné
 * en respectant les word-boundaries. Retourne `null` si l'ingrédient est
 * dans la whitelist safe (caller doit alors flag riskLevel="safe").
 *
 * Reproduit la stratégie bi-directionnelle de l'ancien `includes()` mais
 * avec frontières de mots strictes :
 *   a) row → ingredient : `\b${row.name}\b` test dans l'ingrédient scanné
 *   b) ingredient → row : inverse, gated sur ingredient.length >= 4 pour
 *      éviter les matches sur tokens courts (ex: "fat" dans "sulfate")
 */
export interface MatchableRow {
  name: string;
  name_inci?: string | null;
  synonyms?: string[] | null;
}

export function findMatchingRow<T extends MatchableRow>(
  ingredientName: string,
  rows: T[],
): T | undefined {
  return rows.find((ing) => {
    const ingName = ing.name;
    const ingInci = ing.name_inci ?? '';
    if (ingName && wordMatches(ingredientName, ingName)) return true;
    if (ingInci && wordMatches(ingredientName, ingInci)) return true;
    if (ing.synonyms?.some((syn) => syn && wordMatches(ingredientName, syn))) {
      return true;
    }
    if (ingredientName.length >= 4) {
      if (ingName && wordMatches(ingName, ingredientName)) return true;
      if (ingInci && wordMatches(ingInci, ingredientName)) return true;
    }
    return false;
  });
}
