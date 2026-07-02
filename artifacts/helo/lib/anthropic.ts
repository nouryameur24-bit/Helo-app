/**
 * lib/anthropic.ts — Hēlo AI assistant via Supabase Edge Function
 *
 * All Anthropic API calls are proxied through the `chat` edge function so
 * that the API key never leaves the server.
 * Deploy: supabase functions deploy chat --no-verify-jwt
 * Set secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-…
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from '@/lib/logger';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RateLimitError, extractFunctionStatus } from '@/lib/errors';
import { STORAGE_KEYS } from '@/lib/storageKeys';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const CHAT_HISTORY_KEY = STORAGE_KEYS.chatHistory;
const MAX_HISTORY = 20;

// ─── History persistence ──────────────────────────────────────────────────────

export async function loadChatHistory(): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch (err) {
    logError('anthropic.loadChatHistory', err);
    return [];
  }
}

export async function saveChatHistory(messages: ChatMessage[]): Promise<void> {
  try {
    const trimmed = messages.slice(-MAX_HISTORY);
    await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (err) {
    // Non-critical — history may be lost; conversation still works
    logError('anthropic.saveChatHistory', err, { count: messages.length });
  }
}

export async function clearChatHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
  } catch (err) {
    // Non-critical — stale history will be overwritten on the next session
    logError('anthropic.clearChatHistory', err);
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

async function buildSystemPrompt(): Promise<string> {
  const trimesterRaw = await AsyncStorage.getItem(STORAGE_KEYS.lastTrimester).catch((err) => {
    logError('anthropic.buildSystemPrompt.readTrimester', err);
    return null;
  });
  const trimester = trimesterRaw ?? '?';
  const trimesterLabel =
    trimester === '1' ? '1er trimestre'
    : trimester === '2' ? '2ème trimestre'
    : trimester === '3' ? '3ème trimestre'
    : 'trimestre inconnu';

  // v4 Lot 11 — Contexte personnel : allergies + restrictions + mode allaitement.
  // Lecture safe (catch any error → ignore). Permet à Claude de personnaliser
  // ses réponses ("vous nous avez dit être allergique aux arachides…").
  let personalContext = '';
  try {
    const prefsRaw = await AsyncStorage.getItem('@helo_user_preferences');
    if (prefsRaw) {
      const prefs = JSON.parse(prefsRaw) as {
        allergies?: string[];
        dietary?: string[];
        cosmetic_sensitivities?: string[];
      };
      const lines: string[] = [];
      const a = (prefs.allergies ?? []).filter((s) => s && s.toLowerCase() !== 'aucune');
      const d = (prefs.dietary ?? []).filter((s) => s && s.toLowerCase() !== 'aucune');
      const c = (prefs.cosmetic_sensitivities ?? []).filter((s) => s && s.toLowerCase() !== 'aucune');
      if (a.length > 0) lines.push(`Allergies / intolérances déclarées : ${a.join(', ')}.`);
      if (d.length > 0) lines.push(`Restrictions alimentaires : ${d.join(', ')}.`);
      if (c.length > 0) lines.push(`Sensibilités cosmétiques : ${c.join(', ')}.`);
      if (lines.length > 0) {
        personalContext = `\n\nCONTEXTE PERSONNEL DE L'UTILISATRICE :\n- ${lines.join('\n- ')}\nTiens-en compte dans tes réponses (ex: éviter de proposer un produit contenant un allergène déclaré).`;
      }
    }
  } catch {
    // Best effort — preferences absentes ou JSON corrompu → on continue sans.
  }

  // Mode allaitement / bébé (clé partagée avec useBreastfeeding hook)
  try {
    const bfRaw = await AsyncStorage.getItem('@helo_breastfeeding');
    if (bfRaw === 'true') {
      personalContext += '\n- Phase actuelle : ALLAITEMENT (adapte tes réponses à cette phase post-natale).';
    }
  } catch { /* ignore */ }

  return `RÈGLES ABSOLUES — À RESPECTER SANS EXCEPTION :

1. Tu n'es PAS un médecin. Tu as INTERDICTION FORMELLE de poser un diagnostic médical.

2. URGENCE — Si l'utilisatrice mentionne : douleur abdominale, saignement, contractions, perte de liquide, baisse de mouvements du bébé, fièvre forte, vomissements répétés, maux de tête sévères, troubles de la vue — ta SEULE réponse possible est :

"⚠️ Ce que vous décrivez peut nécessiter une consultation urgente. Contactez immédiatement le 15 (SAMU) ou rendez-vous à la maternité la plus proche. Ne tardez pas."

3. Pour les questions produits/ingrédients : commence TOUJOURS par "Selon les données disponibles du CRAT/ANSM/EFSA…" et cite la source.

4. Termine CHAQUE réponse par : "Pour toute décision concernant votre grossesse, consultez votre médecin ou sage-femme."

5. Tu ne donnes JAMAIS de posologie, JAMAIS de dosage exact, JAMAIS d'avis sur l'arrêt ou la prise d'un traitement.

---

Tu es l'assistante santé de Hēlo, une application française dédiée aux femmes enceintes. L'utilisatrice est actuellement au ${trimesterLabel}.

RÈGLES COMPLÉMENTAIRES :
- Tu réponds UNIQUEMENT sur les sujets liés à la grossesse : alimentation, cosmétiques, médicaments, compléments alimentaires, bien-être, hygiène de vie.
- Si la question est hors sujet, réponds gentiment que tu es spécialisée dans l'accompagnement de la grossesse.
- Tu es rassurante, bienveillante, jamais alarmiste. Ton ton est chaleureux et professionnel.
- Tes réponses sont concises (4-8 phrases maximum), claires, et adaptées à une femme enceinte non spécialiste.
- Tu utilises le vouvoiement.
- Tu écris en français uniquement.

INGRÉDIENTS CLÉS À RISQUE :
- Rétinol / rétinoïdes : déconseillés tous trimestres (tératogènes)
- Isotrétinoïne (Roaccutane) : formellement contre-indiqué
- Acide salicylique à haute dose : déconseillé
- Alcool : aucune dose sûre établie
- Caféine : max 200 mg/jour (OMS)
- Ibuprofène / AINS : contre-indiqués à partir du 6ème mois${personalContext}`;
}

// ─── Medication safety pre-filter ─────────────────────────────────────────────

/**
 * High-risk medications that must NEVER receive a free-form AI answer.
 * Each entry is the canonical lowercase, accent-stripped name. The user
 * message is normalized the same way before matching with word boundaries.
 *
 * Well-documented safe medications (paracétamol, doliprane, spasfon, gaviscon,
 * smecta) are intentionally NOT in this list — Claude can answer those.
 */
const BLOCKED_MEDICATIONS = [
  'methotrexate',
  'isotretinoine',
  'roaccutane',
  'accutane',
  'warfarine',
  'coumadine',
  'lithium',
  'valproate',
  'depakine',
  'misoprostol',
  'cytotec',
  'thalidomide',
  'tretinoine',
  'finasteride',
  'propecia',
  'statine',
  'atorvastatine',
  'ibuprofene',
  'advil',
  'nurofen',
  'aspirine',
  'aspegic',
  'diclofenac',
  'voltarene',
  'ketoprofene',
  'naproxene',
] as const;

/** Strip diacritics + lowercase for accent-insensitive matching. */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Returns the matched medication name (canonical), or null. */
export function detectBlockedMedication(userMessage: string): string | null {
  const haystack = normalize(userMessage);
  for (const med of BLOCKED_MEDICATIONS) {
    // Word boundary match — avoids matching "lithiumXX" or substrings.
    const re = new RegExp(`\\b${med}\\b`, 'i');
    if (re.test(haystack)) return med;
  }
  return null;
}

// ─── v4 Lot 12 — Detection symptômes d'urgence ──────────────────────────────
//
// On NE PEUT PAS attendre Claude pour répondre à une urgence vitale. Le
// pré-filtre ci-dessous court-circuite l'API call et renvoie immédiatement
// un message d'orientation SAMU. Latence : 0ms, garantie : 100%.
//
// Patterns : keywords normalisés (sans accents, lowercase). On match
// 'sympt + qualifier' pour réduire les faux positifs (ex: "douleur" seul
// est ambigu, mais "douleur abdominale" est clairement à signaler).

const EMERGENCY_PATTERNS: RegExp[] = [
  /\b(douleur|douleurs)\s+(abdominal|ventr|pelvien|bas\s*ventre)/i,
  /\b(saignement|sang|h[ée]morragie|perte\s+de\s+sang)/i,
  /\b(contraction|contractions)\b/i,
  /\b(perte\s+de\s+(liquide|eaux)|fissure|rompue|rupture)/i,
  /\b(b[ée]b[ée]\s+(ne\s+bouge\s+plus|inactif|ne\s+r[ée]agit)|moins\s+de\s+mouvement)/i,
  /\b(fi[èe]vre\s+(forte|élev[ée]e|au-?dessus\s+de\s+38|39|40)|t[ée]mp[ée]rature\s+élev[ée]e)/i,
  /\b(vomissement|vomir).*(r[ée]p[ée]t|incessant|sans\s+arr[êe]t)/i,
  /\b(mal\s+de\s+t[êe]te\s+(s[ée]v[èe]re|violent|fort)|migraine\s+(intense|atroce))/i,
  /\b(trouble|brouillard|vision\s+floue)\s+(de\s+la\s+vue|visuel|de\s+vision)/i,
  /\b(je\s+(perds|ai\s+perdu)\s+du\s+sang)/i,
  /\b(évanouissement|évanouie|perte\s+de\s+connaissance|syncope)/i,
];

/** Détecte un symptôme nécessitant orientation SAMU. */
export function detectEmergencySymptom(userMessage: string): boolean {
  const text = userMessage.toLowerCase();
  return EMERGENCY_PATTERNS.some((re) => re.test(text));
}

/** Réponse standardisée d'orientation SAMU. */
function buildEmergencyResponse(): string {
  return `⚠️ Ce que vous décrivez peut nécessiter une consultation urgente.

📞 Contactez immédiatement le 15 (SAMU) ou rendez-vous à la maternité la plus proche.

Ne tardez pas — votre sécurité et celle de votre bébé sont prioritaires sur toute analyse en ligne.

Si vous êtes seule, demandez à un proche de vous accompagner. Préparez votre carnet de grossesse si vous l'avez sur vous.

Hēlo n'est pas un service médical d'urgence et ne peut pas se substituer à un avis professionnel immédiat.`;
}

/** Pretty-cased name for display in the safe response. */
function displayMedName(med: string): string {
  return med.charAt(0).toUpperCase() + med.slice(1);
}

function buildBlockedResponse(med: string): string {
  const name = displayMedName(med);
  return `⚠️ ${name} est un médicament qui nécessite un avis médical personnalisé pendant la grossesse.

Selon le CRAT (Centre de Référence sur les Agents Tératogènes), ce médicament peut présenter des risques selon votre trimestre et votre situation personnelle.

👉 Consultez la fiche officielle : https://www.lecrat.fr
👉 Parlez-en à votre médecin ou pharmacien avant toute prise.

Pour la douleur pendant la grossesse, le paracétamol (Doliprane, Efferalgan, Dafalgan) est généralement considéré comme compatible selon le CRAT. Mais même pour le paracétamol, respectez les doses et consultez votre médecin.

Pour toute décision concernant votre grossesse, consultez votre médecin ou sage-femme.`;
}

/** Best-effort logging to Supabase; never throws. */
async function logBlockedQuery(query: string, med: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from('blocked_medication_queries').insert({
      query_text: query,
      medication_detected: med,
      timestamp: new Date().toISOString(),
    });
    if (error) {
      logError('anthropic.logBlockedQuery.insert', error, { medication: med });
    }
  } catch (err) {
    logError('anthropic.logBlockedQuery', err, { medication: med });
  }
}

// ─── Edge function call ───────────────────────────────────────────────────────

/**
 * Timeout dur de l'appel chat. Sans ça, `supabase.functions.invoke` peut
 * pendre indéfiniment sur un réseau lent → l'UI reste bloquée sur le spinner,
 * input gelé, sans échappatoire (le garde-fou de chargement bloque
 * l'interruption). 30s couvre le pire cas Claude Haiku, au-delà on rend la
 * main à l'utilisatrice avec un message clair.
 */
const CHAT_TIMEOUT_MS = 30_000;

export async function sendMessage(
  history: ChatMessage[],
  userMessage: string,
): Promise<string> {
  // v4 Lot 12 — Emergency pre-filter (court-circuite Claude, 0ms latence)
  if (detectEmergencySymptom(userMessage)) {
    return buildEmergencyResponse();
  }

  // ── Medication safety pre-filter (runs BEFORE any AI call) ──
  const blockedMed = detectBlockedMedication(userMessage);
  if (blockedMed) {
    // Fire-and-forget logging — never blocks the user response
    void logBlockedQuery(userMessage, blockedMed);
    return buildBlockedResponse(blockedMed);
  }

  if (!isSupabaseConfigured) {
    return "Le service de chat n'est pas encore configuré. Veuillez contacter le support Hēlo.";
  }

  const systemPrompt = await buildSystemPrompt();

  const messages = [
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  try {
    // Course entre l'appel réseau et un timeout dur : le premier qui répond
    // gagne. Sur timeout, on throw → cat ci-dessous → message d'orientation.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('chat_timeout')), CHAT_TIMEOUT_MS);
    });
    let data: unknown;
    let error: unknown;
    try {
      ({ data, error } = (await Promise.race([
        supabase.functions.invoke('chat', {
          body: { messages, system: systemPrompt },
        }),
        timeoutPromise,
      ])) as { data: unknown; error: unknown });
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (error) {
      const status = await extractFunctionStatus(error);
      if (status === 429) {
        throw new RateLimitError();
      }
      if (status === 401) {
        logError('anthropic.sendMessage.unauthorized', error);
        return "Votre session a expiré. Redémarrez l'application.";
      }
      logError('anthropic.sendMessage.edgeFunction', error);
      return "Une erreur est survenue. Veuillez réessayer dans quelques instants.";
    }

    type ChatData = { content?: Array<{ text?: string }> };
    const text = (data as ChatData)?.content?.[0]?.text ?? '';
    if (!text) return "Désolée, je n'ai pas pu générer une réponse. Réessayez.";
    return text;
  } catch (e) {
    if (e instanceof RateLimitError) throw e;
    if (e instanceof Error && e.message === 'chat_timeout') {
      logError('anthropic.sendMessage.timeout', e);
      return "La réponse met trop de temps à arriver. Vérifie ta connexion et réessaie.";
    }
    logError('anthropic.sendMessage.network', e);
    return "Impossible de joindre l'assistant. Vérifiez votre connexion internet.";
  }
}
