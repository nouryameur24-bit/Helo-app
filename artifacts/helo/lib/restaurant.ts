// ─── Restaurant Menu Analysis — Hēlo ─────────────────────────────────────────
// OCR + keyword-based safety analysis for restaurant menus during pregnancy

import { processOCRImage } from './ocr';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DishRisk = 'danger' | 'caution' | 'safe';
export type DishCourse = 'entrée' | 'plat' | 'dessert' | 'boisson' | 'autre';

export interface DishResult {
  name: string;
  risk: DishRisk;
  reasons: string[];
  questions: string[];
  course: DishCourse;
}

export interface MenuAnalysis {
  dishes: DishResult[];
  safeCount: number;
  cautionCount: number;
  dangerCount: number;
  rawText: string;
  error?: string;
}

// ─── Risk rules ───────────────────────────────────────────────────────────────

interface RiskRule {
  pattern: RegExp;
  risk: 'danger' | 'caution';
  reason: string;
  question: string | null;
}

const RISK_RULES: RiskRule[] = [
  // ── DANGER — viande/poisson cru ──────────────────────────────────────────
  {
    pattern: /\btartare\b/i,
    risk: 'danger',
    reason: 'Viande crue — risque de toxoplasmose et salmonelle',
    question: 'La viande peut-elle être servie bien cuite à la place ?',
  },
  {
    pattern: /\bcarpaccio\b/i,
    risk: 'danger',
    reason: 'Viande ou poisson cru — risque bactérien et parasitaire',
    question: 'Le carpaccio peut-il être préparé cuit ?',
  },
  {
    pattern: /\bsashimi\b/i,
    risk: 'danger',
    reason: 'Poisson cru — risque parasitaire et teneur en mercure',
    question: 'Le poisson est-il préalablement surgelé (norme anti-parasites) ?',
  },
  {
    pattern: /\bsushi\b/i,
    risk: 'danger',
    reason: 'Peut contenir du poisson cru — risque parasitaire',
    question: 'Les sushis contiennent-ils du poisson cru ou est-il cuit ?',
  },
  {
    pattern: /\bceviche\b/i,
    risk: 'danger',
    reason: 'Poisson mariné non cuit — risque parasitaire',
    question: 'Le poisson du ceviche est-il préalablement surgelé ?',
  },
  {
    pattern: /\bfoie\s*gras\b/i,
    risk: 'danger',
    reason: 'Très riche en vitamine A (rétinol) — déconseillé pendant la grossesse',
    question: null,
  },
  {
    pattern: /\bterrine\b/i,
    risk: 'danger',
    reason: 'Charcuterie à base de viande — risque de listériose',
    question: 'La terrine est-elle à base de produits pasteurisés ?',
  },
  {
    pattern: /\bp[âa]t[eé](?!\s+de\s+fruits?)\b/i,
    risk: 'danger',
    reason: 'Charcuterie — risque de listériose et toxoplasmose',
    question: 'Le pâté est-il pasteurisé ?',
  },
  {
    pattern: /\boeuf[s]?\s+(mollet|poché|cru)\b/i,
    risk: 'danger',
    reason: 'Œuf peu ou pas cuit — risque de salmonelle',
    question: "L'œuf peut-il être servi bien cuit ?",
  },
  // ── CAUTION — risque modéré ──────────────────────────────────────────────
  {
    pattern: /\btiramisu\b/i,
    risk: 'caution',
    reason: 'Peut contenir des œufs crus — risque de salmonelle',
    question: 'Les œufs du tiramisu sont-ils pasteurisés ?',
  },
  {
    pattern: /\bmousse\s+(au\s+)?chocolat\b/i,
    risk: 'caution',
    reason: 'La mousse au chocolat est souvent à base d\'œufs crus',
    question: 'La mousse est-elle préparée avec des œufs pasteurisés ?',
  },
  {
    pattern: /\bmayonnaise\s+maison\b|\bmayo\s+maison\b/i,
    risk: 'caution',
    reason: 'Mayonnaise maison aux œufs crus — risque de salmonelle',
    question: 'La mayonnaise est-elle industrielle (pasteurisée) ou faite maison ?',
  },
  {
    pattern: /\bsaumon\s+fum[eé]\b/i,
    risk: 'caution',
    reason: 'Saumon fumé à froid — risque de listériose',
    question: 'Le saumon fumé est-il conditionné industriellement ou artisanal ?',
  },
  {
    pattern: /\b(brie|camembert|roquefort|gorgonzola|munster|époisse|saint[- ]marcellin|chèvre\s+frais|fromage\s+frais)\b/i,
    risk: 'caution',
    reason: 'Fromage à lait cru possible — risque de listériose',
    question: 'Le fromage est-il au lait pasteurisé ?',
  },
  {
    pattern: /\bfromage\b/i,
    risk: 'caution',
    reason: 'Nature du lait inconnue — vérifier si lait pasteurisé',
    question: 'Le fromage est-il au lait pasteurisé ?',
  },
  {
    pattern: /\bthon\b/i,
    risk: 'caution',
    reason: 'Riche en mercure — à consommer avec modération en grossesse',
    question: null,
  },
  {
    pattern: /\bcaf[eé]\b/i,
    risk: 'caution',
    reason: 'Caféine — limitée à 200 mg/jour pendant la grossesse',
    question: null,
  },
  {
    pattern: /\b(alcool|vin|bi[eè]re|champagne|cidre|prosecco|cocktail)\b/i,
    risk: 'caution',
    reason: 'Alcool — aucune quantité sûre pendant la grossesse',
    question: null,
  },
  {
    pattern: /\bfumé\b/i,
    risk: 'caution',
    reason: 'Produit fumé à froid — risque de listériose potentiel',
    question: 'Ce produit est-il fumé à chaud (cuit) ou à froid ?',
  },
];

// ─── Safe modifiers (downgrade danger → caution if present) ──────────────────

const SAFE_MODIFIERS = [
  /\bbien\s+cuit\b/i,
  /\bgrillé\b/i,
  /\brôti\b/i,
  /\bvapeur\b/i,
  /\bpasteuris[eé]\b/i,
  /\bcuit\s+[àa]\s+(coeur|point)\b/i,
  /\bfrit\b/i,
  /\bcuisson\s+(lente|basse|haute)/i,
  /\bmijoté\b/i,
  /\bconfit\b(?!\s+de\s+canard)/i, // "confit de canard" is actually cooked long
];

// ─── Course detection ─────────────────────────────────────────────────────────

const COURSE_RULES: Array<{ pattern: RegExp; course: DishCourse }> = [
  {
    pattern: /\b(soupe|velouté|consommé|potage|gaspacho|bisque|bouillon)\b/i,
    course: 'entrée',
  },
  {
    pattern: /\b(salade|carpaccio|terrine|p[âa]t[eé]|foie\s*gras|rillettes|tartare(?!\s+de\s+(boeuf|viande)))\b/i,
    course: 'entrée',
  },
  {
    pattern: /\b(tiramisu|tarte\s+(tatin|aux|au)\b|gâteau|mousse\s+(au\s+)?chocolat|sorbet|glace|fondant|crème\s+br[uû]l[eé]e|profiterole|panna\s+cotta|op[eé]ra|éclair|mille[\s-]feuille|crêpe\s+sucrée|baba\b|paris[\s-]brest)\b/i,
    course: 'dessert',
  },
  {
    pattern: /\b(caf[eé]|th[eé]|jus|limonade|eau\s+(gazeuse|plate|pétillante)?|lait|boisson|alcool|vin|bi[eè]re|champagne|cidre|cocktail|smoothie|infusion)\b/i,
    course: 'boisson',
  },
  {
    pattern: /\b(vian(de)?|poulet|boeuf|porc|agneau|canard|veau|côte\s+de|filet\s+(de)?|magret|poisson|saumon|cabillaud|thon|sole|loup|dorade|merlu|pâtes|risotto|burger|pizza|steak|bavette|entrecôte|gigot|rôti|cuisse)\b/i,
    course: 'plat',
  },
];

function detectCourse(name: string): DishCourse {
  for (const { pattern, course } of COURSE_RULES) {
    if (pattern.test(name)) return course;
  }
  return 'plat';
}

// ─── Single dish analysis ─────────────────────────────────────────────────────

export function analyzeDish(name: string): DishResult {
  const reasons: string[] = [];
  const questions: string[] = [];
  let maxRisk: DishRisk = 'safe';

  const hasSafeModifier = SAFE_MODIFIERS.some((rx) => rx.test(name));

  for (const rule of RISK_RULES) {
    if (rule.pattern.test(name)) {
      let ruleRisk = rule.risk;
      // Downgrade danger → caution when a cooking modifier is present
      if (ruleRisk === 'danger' && hasSafeModifier) ruleRisk = 'caution';

      reasons.push(rule.reason);
      if (rule.question && !questions.includes(rule.question)) {
        questions.push(rule.question);
      }

      if (ruleRisk === 'danger') {
        maxRisk = 'danger';
      } else if (ruleRisk === 'caution' && maxRisk !== 'danger') {
        maxRisk = 'caution';
      }
    }
  }

  return { name, risk: maxRisk, reasons, questions, course: detectCourse(name) };
}

// ─── Extract dish names from raw OCR text ────────────────────────────────────

export function extractDishes(rawText: string): string[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && l.length < 90);

  const dishes: string[] = [];

  for (const line of lines) {
    // Skip pure price / number lines
    if (/^[\d€.,\s\-–—]+$/.test(line)) continue;
    // Skip lines starting with a price
    if (/^\d+[.,]\d+/.test(line)) continue;
    // Skip short ALL-CAPS section headers (ENTRÉES, PLATS, etc.)
    if (/^[A-ZÀÂÉÈÊËÎÏÔÛÙÜÇ\s\-–—]{3,30}$/.test(line) && !/[a-z]/.test(line)) continue;
    // Skip restaurant meta lines
    if (
      /service\s+compris|boisson\s+comprise|formule|nos?\s+sélections|table\s+n°|allergènes?\s+sur|tva\s+incluse/i.test(
        line,
      )
    )
      continue;

    // Strip trailing price from dish line ("Tartare de boeuf .... 18 €" → "Tartare de boeuf")
    const clean = line
      .replace(/[\s.…_]{2,}\d+[.,]?\d*\s*€?$/g, '')
      .replace(/\s*\d+[.,]\d+\s*€?\s*$/, '')
      .replace(/\s*€\s*\d+[.,]?\d*\s*$/, '')
      .replace(/\s*\/\s*\d+[.,]\d+.*$/, '') // variants like "/ 12.00"
      .trim();

    if (clean.length > 3 && clean.length < 80) {
      dishes.push(clean);
    }
  }

  return [...new Set(dishes)];
}

// ─── Full menu analysis ───────────────────────────────────────────────────────

/**
 * OCR each image, extract dish names, analyze each dish.
 *
 * Accepts file URIs (preferred — keeps base64 out of React state to avoid
 * OOM on older devices). The base64 payload for each image is read from
 * disk one at a time, sent to OCR, and released before the next iteration
 * so peak memory stays at ~1 image worth of base64 regardless of count.
 *
 * Returns MenuAnalysis with dishes sorted by risk (danger first).
 */
export async function analyzeMenu(imageUris: string[]): Promise<MenuAnalysis> {
  // Lazy import: lib/restaurant.ts is imported by jest unit tests that have
  // no native module shim. Loading expo-file-system at the top would crash
  // the test suite even though analyzeMenu itself is never invoked there.
  const FileSystem = await import('expo-file-system/legacy');

  const allTexts: string[] = [];
  let hasApiKey = true;

  for (const uri of imageUris) {
    let base64: string | null = null;
    try {
      base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const text = await processOCRImage(base64);
      allTexts.push(text);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith('NO_API_KEY')) {
        hasApiKey = false;
        break;
      }
      // Other errors (NO_TEXT_DETECTED, network, file read) — skip silently
    } finally {
      // Drop the local reference so the ~1-5 MB base64 string is eligible
      // for GC before we read the next image.
      base64 = null;
    }
  }

  if (!hasApiKey) {
    return {
      dishes: [],
      safeCount: 0,
      cautionCount: 0,
      dangerCount: 0,
      rawText: '',
      error: 'NO_API_KEY',
    };
  }

  const rawText = allTexts.join('\n');

  if (!rawText.trim()) {
    return {
      dishes: [],
      safeCount: 0,
      cautionCount: 0,
      dangerCount: 0,
      rawText: '',
      error: 'NO_TEXT',
    };
  }

  const dishNames = extractDishes(rawText);
  const dishes = dishNames.map(analyzeDish);

  // Sort: danger → caution → safe
  const riskOrder: Record<DishRisk, number> = { danger: 0, caution: 1, safe: 2 };
  dishes.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);

  return {
    dishes,
    safeCount: dishes.filter((d) => d.risk === 'safe').length,
    cautionCount: dishes.filter((d) => d.risk === 'caution').length,
    dangerCount: dishes.filter((d) => d.risk === 'danger').length,
    rawText,
  };
}
