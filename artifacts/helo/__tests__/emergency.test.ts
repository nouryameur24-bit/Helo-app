/**
 * __tests__/emergency.test.ts
 *
 * Tests for the deterministic emergency keyword detector used by the `chat`
 * Supabase Edge Function. The regex list is duplicated here verbatim from
 * `supabase/functions/chat/index.ts` because Jest cannot import Deno modules
 * directly. Keep the two lists in sync.
 */

declare function require(id: string): unknown;
declare const __dirname: string;
const fs = require('fs') as { readFileSync(p: string, enc: string): string };
const path = require('path') as { join(...parts: string[]): string };

const EMERGENCY_PATTERNS: RegExp[] = [
  /\b(saigne(ment)?s?|h[ée]morr?agie|perte\s+de\s+sang)\b/i,
  /\b(contraction|contractions)\b/i,
  /\b(perte\s+(des|de\s+l['e]?|du|d['e]\s*)?\s*(eaux|eau|liquide)|je\s+perds\s+(les|des|d[ue]\s+|de\s+l['e]\s*)?\s*(eaux|eau|liquide)|fissur(e|ation)\s+poche)\b/i,
  /\b(b[ée]b[ée]\s+ne\s+bouge|baisse\s+(des|de)\s+mouvement[s]?|plus\s+de\s+mouvement[s]?)\b/i,
  /\b(douleur\s+(abdominale|au\s+ventre)|mal\s+au\s+ventre\s+(intense|fort|tr[èe]s))\b/i,
  /\b(fi[èe]vre\s+(forte|[ée]lev[ée]e|haute)|39[°,.]|40[°,.])\b/i,
  /\b(vomissement[s]?\s+r[ée]p[ée]t[ée]s|je\s+vomis\s+sans\s+arr[êe]t)\b/i,
  /\b(maux?\s+de\s+t[êe]te\s+(s[ée]v[èe]re[s]?|intense[s]?|insupportable[s]?)|migraine\s+forte)\b/i,
  /\b(trouble[s]?\s+(de\s+la\s+)?vue|vision\s+floue|tache[s]?\s+noire[s]?)\b/i,
  /\b(suicid|me\s+tuer|en\s+finir|envie\s+de\s+mourir)\b/i,
];

function detectEmergency(
  messages: Array<{ role: string; content: unknown }>,
): boolean {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) return false;
  if (typeof lastUser.content !== 'string') return false;
  return EMERGENCY_PATTERNS.some((rx) => rx.test(lastUser.content as string));
}

describe('detectEmergency', () => {
  const emergencyCases = [
    'je saigne beaucoup',
    "J'ai des saignements depuis ce matin",
    "J'ai des contractions toutes les 5 minutes",
    'Je perds du liquide',
    'perte des eaux',
    'je perds les eaux',
    'Bébé ne bouge plus depuis hier',
    'baisse des mouvements du bébé',
    'douleur abdominale intense',
    "J'ai mal au ventre très fort",
    'fièvre forte 39.5',
    'vomissements répétés depuis 2 jours',
    'maux de tête sévères',
    "j'ai la vision floue",
    'envie de mourir',
  ];

  const safeCases = [
    'Je peux manger du fromage à pâte molle ?',
    'Est-ce que la crème solaire avec rétinol est dangereuse ?',
    'À partir de quand sent-on bébé bouger ?',
    'mal au dos léger',
  ];

  test.each(emergencyCases)('detecte urgence: "%s"', (msg) => {
    expect(detectEmergency([{ role: 'user', content: msg }])).toBe(true);
  });

  test.each(safeCases)('ne flag pas: "%s"', (msg) => {
    expect(detectEmergency([{ role: 'user', content: msg }])).toBe(false);
  });

  test('inspecte uniquement le DERNIER message utilisateur', () => {
    expect(
      detectEmergency([
        { role: 'user', content: 'je saigne' },
        { role: 'assistant', content: 'réponse SAMU' },
        { role: 'user', content: 'merci, ça va mieux' },
      ]),
    ).toBe(false);
  });

  test('ignore les contenus non-string (payloads vision)', () => {
    expect(
      detectEmergency([
        { role: 'user', content: [{ type: 'image', source: {} }] },
      ]),
    ).toBe(false);
  });

  test('renvoie false sans message utilisateur', () => {
    expect(detectEmergency([])).toBe(false);
    expect(
      detectEmergency([{ role: 'assistant', content: 'salut' }]),
    ).toBe(false);
  });

  test('REGRESSION: emergency interception runs BEFORE quota consume in chat/index.ts', () => {
    // Medical safety invariant: a user at daily quota limit must still receive
    // the SAMU fallback for emergency messages. This test guards against a
    // regression where the emergency check is moved after consume_api_quota.
    const src = fs.readFileSync(
      path.join(__dirname, '../supabase/functions/chat/index.ts'),
      'utf8',
    );
    const emergencyIdx = src.indexOf('detectEmergency(body.messages)');
    const quotaIdx = src.indexOf("consume_api_quota");
    expect(emergencyIdx).toBeGreaterThan(0);
    expect(quotaIdx).toBeGreaterThan(0);
    expect(emergencyIdx).toBeLessThan(quotaIdx);
  });

  test('faux positif acceptable: "petite contraction de Braxton Hicks"', () => {
    // Documenté: mieux vaut un faux positif (envoi SAMU pour rien) qu'un faux
    // négatif (urgence ratée). La regex matche "contraction" volontairement.
    expect(
      detectEmergency([
        { role: 'user', content: 'petite contraction de Braxton Hicks' },
      ]),
    ).toBe(true);
  });
});
