/**
 * lib/preferenceMatcher.ts — Personnalisation du verdict matcher selon les
 * préférences utilisatrice (allergies, restrictions, sensibilités).
 *
 * v4 Lot 12. Capitalise sur le profil onboarding (Lot 11). Au lieu de juste
 * retourner les risk_levels génériques du dico, on les BUMP UP quand
 * l'utilisatrice a déclaré une allergie/restriction qui matche.
 *
 * Pattern : matching par substring case-insensitive sur `ingredient_name`
 * et `ingredient.name_inci` du MatchResult. Très tolérant aux variantes
 * d'écriture (lait, milk, lactose, whey…).
 *
 * Override hiérarchie :
 *   - Allergie déclarée + ingrédient matche → 'danger' (urgence vitale)
 *   - Restriction alimentaire matche → 'caution' (éthique/santé)
 *   - Sensibilité cosmétique matche → 'caution' (confort)
 *
 * On n'écrase JAMAIS un 'danger' existant. On peut élever 'safe' / 'caution'
 * → 'danger' mais pas l'inverse (sécurité par défaut).
 */
import type { MatchResult, RiskLevel } from '@/types';
import { getUserPreferences } from '@/lib/userPreferences';

// ─── Mappings préférence → keywords ingrédients ─────────────────────────────

const ALLERGY_KEYWORDS: Record<string, string[]> = {
  Lait: ['lait', 'milk', 'lactose', 'whey', 'casein', 'caséine', 'lactosérum'],
  'Oeuf': ['oeuf', 'œuf', 'egg', 'albumen', 'ovalbumin', 'ovalbumine'],
  Gluten: ['gluten', 'wheat', 'blé', 'froment', 'épeautre', 'seigle', 'orge'],
  Soja: ['soja', 'soy', 'soya', 'soybean'],
  Arachide: ['arachide', 'peanut', 'arachis'],
  'Fruits à coque': ['noisette', 'amande', 'noix', 'cajou', 'pistache', 'hazelnut', 'almond', 'walnut', 'cashew', 'pecan'],
  Sésame: ['sésame', 'sesame', 'sesamum', 'tahin', 'tahini'],
  Poisson: ['poisson', 'fish', 'thon', 'saumon', 'cabillaud', 'morue', 'maquereau'],
  Crustacés: ['crustacé', 'shrimp', 'crab', 'crevette', 'homard', 'langoustine'],
};

const DIETARY_KEYWORDS: Record<string, string[]> = {
  Végétarien: ['boeuf', 'porc', 'jambon', 'gélatine', 'pork', 'beef', 'bacon', 'lard', 'gelatine', 'gelatin'],
  Végan: ['lait', 'milk', 'miel', 'honey', 'oeuf', 'gélatine', 'beurre', 'butter', 'caséine', 'whey'],
  Halal: ['porc', 'pork', 'jambon', 'bacon', 'gélatine porcine', 'alcool'],
  Casher: ['porc', 'pork', 'jambon', 'bacon', 'crustacé', 'shrimp'],
  'Sans porc': ['porc', 'pork', 'jambon', 'bacon', 'lard'],
  'Sans sucre': ['sucre', 'sugar', 'fructose', 'sirop de glucose', 'glucose syrup', 'sirop de maïs'],
  'Sans gluten': ['gluten', 'wheat', 'blé', 'froment', 'épeautre', 'seigle', 'orge'],
};

const COSMETIC_KEYWORDS: Record<string, string[]> = {
  Parfum: ['parfum', 'fragrance', 'perfume', 'aroma'],
  Alcool: ['alcohol', 'denatured', 'éthanol', 'isopropyl', 'sd alcohol'],
  'Huiles essentielles': ['essential oil', 'huile essentielle', 'mentha', 'rosmarinus', 'salvia', 'lavandula'],
  Sulfates: ['sulfate', 'sulphate', 'laureth sulfate', 'lauryl sulfate'],
  Parabens: ['paraben'],
};

// ─── Risk severity (réutilise la convention matcher backend) ────────────────

const RISK_RANK: Record<RiskLevel, number> = {
  no_signal: 0,
  safe: 1,
  caution: 2,
  danger: 3,
};

function strictest(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_RANK[a] >= RISK_RANK[b] ? a : b;
}

// ─── Helper : un ingrédient matche-t-il une liste de keywords ? ─────────────

function ingredientMatchesKeywords(
  match: MatchResult,
  keywords: string[],
): boolean {
  const haystack = [
    match.ingredientName,
    match.ingredient?.name,
    match.ingredient?.name_inci,
    ...(match.ingredient?.synonyms ?? []),
  ]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase();
  return keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

// ─── API publique ───────────────────────────────────────────────────────────

export interface PreferenceTag {
  type: 'allergy' | 'dietary' | 'cosmetic';
  /** Label affichable par l'UI (ex: "Allergie déclarée : Lait"). */
  reason: string;
}

/**
 * Applique les préférences utilisatrice aux match results.
 * Retourne les matches modifiés + un mapping `tagsByIndex` pour permettre
 * à l'UI d'expliquer pourquoi un produit est danger ("Vous êtes allergique
 * au lait").
 */
export async function applyPersonalPreferences(
  matches: MatchResult[],
): Promise<{ matches: MatchResult[]; tagsByIndex: Map<number, PreferenceTag[]> }> {
  const prefs = await getUserPreferences().catch(() => null);
  const tagsByIndex = new Map<number, PreferenceTag[]>();
  if (!prefs) return { matches, tagsByIndex };

  const allergies = (prefs.allergies ?? []).filter(
    (a) => a && a.toLowerCase() !== 'aucune',
  );
  const dietary = (prefs.dietary ?? []).filter(
    (d) => d && d.toLowerCase() !== 'aucune',
  );
  const cosmetic = (prefs.cosmetic_sensitivities ?? []).filter(
    (c) => c && c.toLowerCase() !== 'aucune',
  );

  if (allergies.length === 0 && dietary.length === 0 && cosmetic.length === 0) {
    return { matches, tagsByIndex };
  }

  const updated = matches.map((m, i) => {
    let newRisk: RiskLevel = m.riskLevel;
    const tags: PreferenceTag[] = [];

    // Allergies → danger
    for (const allergy of allergies) {
      const keywords = ALLERGY_KEYWORDS[allergy];
      if (!keywords) continue;
      if (ingredientMatchesKeywords(m, keywords)) {
        newRisk = strictest(newRisk, 'danger');
        tags.push({ type: 'allergy', reason: `Allergie déclarée : ${allergy}` });
      }
    }

    // Restrictions alimentaires → caution
    for (const restriction of dietary) {
      const keywords = DIETARY_KEYWORDS[restriction];
      if (!keywords) continue;
      if (ingredientMatchesKeywords(m, keywords)) {
        newRisk = strictest(newRisk, 'caution');
        tags.push({ type: 'dietary', reason: `Régime : ${restriction}` });
      }
    }

    // Sensibilités cosmétiques → caution
    for (const sensitivity of cosmetic) {
      const keywords = COSMETIC_KEYWORDS[sensitivity];
      if (!keywords) continue;
      if (ingredientMatchesKeywords(m, keywords)) {
        newRisk = strictest(newRisk, 'caution');
        tags.push({ type: 'cosmetic', reason: `Sensibilité : ${sensitivity}` });
      }
    }

    if (tags.length > 0) {
      tagsByIndex.set(i, tags);
    }

    return newRisk !== m.riskLevel
      ? ({ ...m, matched: true, riskLevel: newRisk } as MatchResult)
      : m;
  });

  return { matches: updated, tagsByIndex };
}
