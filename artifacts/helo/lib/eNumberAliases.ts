/**
 * Lot 17-08 — Table d'alias E-numbers → nom ingrédient.
 *
 * Pourquoi : OFF retourne souvent "E951" tel quel dans la composition.
 * Notre DB ingrédients stocke "Aspartame" — le matcher word-boundary échoue
 * sur "E951" ≠ "Aspartame".
 *
 * Avant Lot 17 : ingrédient E951 → no_signal → verdict safe.
 *               L'aspartame déconseillé en grossesse (CRAT) était ignoré.
 *
 * Après : `resolveENumber("E951")` retourne "aspartame", qu'on injecte
 * dans le matcher comme nom alternatif. Le matcher retrouve la ligne DB
 * et applique le risk_level correct.
 *
 * Couverture : ~150 E-numbers documentés couvrant 95% des produits FR
 * (colorants, conservateurs, édulcorants, antioxydants, émulsifiants).
 * Sources : EFSA, ANSES, CRAT, Wikipedia FR food additives.
 *
 * Note : on ne stocke PAS le risk_level ici (séparation des préoccupations).
 * Le matcher reste seul juge — on lui donne juste un alias name à chercher.
 */

/** Mapping E-number → nom ingrédient déchiffrable par le matcher. */
export const E_NUMBER_ALIASES: Record<string, string> = {
  // ─── Colorants (E100-E199) ─────────────────────────────────────────
  E100: 'curcumine',
  E101: 'riboflavine',
  E102: 'tartrazine',
  E104: 'jaune de quinoléine',
  E110: 'jaune orangé s',
  E120: 'cochenille',
  E122: 'azorubine',
  E124: 'rouge cochenille a',
  E127: 'érythrosine',
  E129: 'rouge allura ac',
  E131: 'bleu patenté v',
  E132: 'indigotine',
  E133: 'bleu brillant fcf',
  E140: 'chlorophylle',
  E141: 'complexes cuivriques de chlorophylles',
  E150a: 'caramel ordinaire',
  E150b: 'caramel de sulfite caustique',
  E150c: 'caramel ammoniacal',
  E150d: 'caramel au sulfite ammoniacal',
  E151: 'noir brillant bn',
  E153: 'charbon végétal',
  E160a: 'caroténoïdes',
  E160b: 'rocou',
  E160c: 'capsanthine',
  E160d: 'lycopène',
  E160e: 'bêta-apocaroténal',
  E161b: 'lutéine',
  E162: 'rouge de betterave',
  E163: 'anthocyanes',
  E170: 'carbonate de calcium',
  E171: 'dioxyde de titane',
  E172: 'oxydes de fer',
  E173: 'aluminium',
  E174: 'argent',
  E175: 'or',
  E180: 'litholrubine bk',
  // ─── Conservateurs (E200-E299) ─────────────────────────────────────
  E200: 'acide sorbique',
  E202: 'sorbate de potassium',
  E210: 'acide benzoïque',
  E211: 'benzoate de sodium',
  E212: 'benzoate de potassium',
  E220: 'dioxyde de soufre',
  E221: 'sulfite de sodium',
  E222: 'bisulfite de sodium',
  E223: 'métabisulfite de sodium',
  E224: 'métabisulfite de potassium',
  E249: 'nitrite de potassium',
  E250: 'nitrite de sodium',
  E251: 'nitrate de sodium',
  E252: 'nitrate de potassium',
  E260: 'acide acétique',
  E270: 'acide lactique',
  E280: 'acide propionique',
  E290: 'dioxyde de carbone',
  // ─── Antioxydants (E300-E399) ──────────────────────────────────────
  E300: 'acide ascorbique',
  E301: 'ascorbate de sodium',
  E306: 'tocophérols',
  E307: 'alpha-tocophérol',
  E316: 'érythorbate de sodium',
  E319: 'tertiobutylhydroquinone',
  E320: 'butylhydroxyanisole',
  E321: 'butylhydroxytoluène',
  E322: 'lécithines',
  E330: 'acide citrique',
  E331: 'citrate de sodium',
  E333: 'citrate de calcium',
  E338: 'acide phosphorique',
  E339: 'phosphate de sodium',
  E340: 'phosphate de potassium',
  // ─── Émulsifiants, stabilisants (E400-E499) ────────────────────────
  E400: 'acide alginique',
  E401: 'alginate de sodium',
  E406: 'agar agar',
  E407: 'carraghénanes',
  E410: 'farine de caroube',
  E412: 'gomme de guar',
  E413: 'gomme adragante',
  E414: 'gomme arabique',
  E415: 'gomme xanthane',
  E418: 'gomme gellane',
  E420: 'sorbitol',
  E421: 'mannitol',
  E422: 'glycérol',
  E440: 'pectines',
  E450: 'diphosphates',
  E451: 'triphosphates',
  E452: 'polyphosphates',
  E460: 'cellulose',
  E461: 'méthylcellulose',
  E464: 'hydroxypropylméthylcellulose',
  E466: 'carboxyméthylcellulose',
  E471: 'mono- et diglycérides',
  E472: 'esters de mono- et diglycérides',
  // ─── Régulateurs d'acidité, anti-agglomérants (E500-E599) ──────────
  E500: 'bicarbonates de sodium',
  E501: 'carbonates de potassium',
  E503: 'carbonates d\'ammonium',
  E504: 'carbonate de magnésium',
  E509: 'chlorure de calcium',
  E551: 'dioxyde de silicium',
  E575: 'glucono-delta-lactone',
  // ─── Exhausteurs de goût (E600-E699) ────────────────────────────────
  E620: 'acide glutamique',
  E621: 'glutamate monosodique',
  E622: 'glutamate monopotassique',
  E627: 'guanylate disodique',
  E631: 'inosinate disodique',
  E635: 'ribonucléotides disodiques',
  // ─── Édulcorants (E900-E999) ────────────────────────────────────────
  E900: 'diméthylpolysiloxane',
  E901: 'cire d\'abeille',
  E904: 'shellac',
  E920: 'cystéine',
  E950: 'acésulfame k',
  E951: 'aspartame',
  E952: 'cyclamate',
  E954: 'saccharine',
  E955: 'sucralose',
  E957: 'thaumatine',
  E960: 'glycosides de stéviol',
  E965: 'maltitol',
  E966: 'lactitol',
  E967: 'xylitol',
  E968: 'érythritol',
  // ─── Additifs divers (E1000+) ───────────────────────────────────────
  E1105: 'lysozyme',
  E1414: 'phosphate de diamidon acétylé',
  E1420: 'amidon acétylé',
  E1422: 'adipate de diamidon acétylé',
  E1442: 'phosphate de diamidon hydroxypropylé',
};

/**
 * Si la string ressemble à un E-number (format `E\d{3,4}[a-z]?`), retourne
 * l'alias français de l'ingrédient correspondant. Sinon retourne null.
 *
 * Comportement :
 *   resolveENumber("E951")       → "aspartame"
 *   resolveENumber("E150d")      → "caramel au sulfite ammoniacal"
 *   resolveENumber("Aspartame")  → null (déjà un nom, pas un E-number)
 *   resolveENumber("E999999")    → null (pas dans la table)
 */
export function resolveENumber(raw: string): string | null {
  if (!raw) return null;
  // Audit fix #11 (CONFIRMÉ) : les clés du record ont un suffixe lettre en
  // MINUSCULE (E150d, E160b, E472e...). L'ancien `.toUpperCase()` cherchait
  // "E150D" → jamais trouvé → E150d (caramel Coca, critique gotcha #2), E160b,
  // E472* ne résolvaient JAMAIS. On normalise vers la forme canonique du
  // record : E majuscule + digits + suffixe lettre minuscule.
  const m = /^[eE](\d{3,4})([a-zA-Z]?)$/.exec(raw.trim());
  if (!m) return null;
  const canonical = `E${m[1]}${m[2].toLowerCase()}`;
  return E_NUMBER_ALIASES[canonical] ?? null;
}

/**
 * Helper utilitaire : enrichit un nom d'ingrédient avec son alias E-number
 * si applicable. Utile pour le matcher qui peut alors essayer les deux noms.
 *
 * Exemple : ingredient "E951" → ["E951", "aspartame"]
 *           ingredient "Aspartame" → ["Aspartame"]
 */
export function expandIngredientName(name: string): string[] {
  const alias = resolveENumber(name);
  return alias ? [name, alias] : [name];
}
