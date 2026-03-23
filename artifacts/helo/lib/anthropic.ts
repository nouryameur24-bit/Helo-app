/**
 * lib/anthropic.ts — Hēlo AI assistant via Claude (Anthropic)
 *
 * Calls the Anthropic Messages API directly from the app.
 * Requires EXPO_PUBLIC_ANTHROPIC_API_KEY in env.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const CHAT_HISTORY_KEY = '@helo_chat_history';
const MAX_HISTORY = 20;

// ─── History persistence ──────────────────────────────────────────────────────

export async function loadChatHistory(): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

export async function saveChatHistory(messages: ChatMessage[]): Promise<void> {
  try {
    const trimmed = messages.slice(-MAX_HISTORY);
    await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
}

export async function clearChatHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
  } catch {}
}

// ─── System prompt ────────────────────────────────────────────────────────────

async function buildSystemPrompt(): Promise<string> {
  const trimesterRaw = await AsyncStorage.getItem('@helo_last_trimester').catch(() => null);
  const trimester = trimesterRaw ?? '?';
  const trimesterLabel =
    trimester === '1' ? '1er trimestre'
    : trimester === '2' ? '2ème trimestre'
    : trimester === '3' ? '3ème trimestre'
    : 'trimestre inconnu';

  return `Tu es l'assistante santé de Hēlo, une application française dédiée aux femmes enceintes. L'utilisatrice est actuellement au ${trimesterLabel}.

RÈGLES ABSOLUES :
- Tu réponds UNIQUEMENT sur les sujets liés à la grossesse : alimentation, cosmétiques, médicaments, compléments alimentaires, bien-être, hygiène de vie.
- Si la question est hors sujet, réponds gentiment que tu es spécialisée dans l'accompagnement de la grossesse.
- Tu es rassurante, bienveillante, jamais alarmiste. Ton ton est chaleureux et professionnel.
- Tu cites tes sources quand c'est pertinent : CRAT, ANSM, OMS, ANSES, HAS.
- Tu termines TOUJOURS chaque réponse par : "Consultez votre professionnel de santé pour un avis personnalisé."
- Tu ne donnes JAMAIS de diagnostic médical.
- Tu ne dis JAMAIS "vous pouvez" ou "vous ne pouvez pas" de façon catégorique. Tu utilises "selon les données disponibles", "il est généralement recommandé", "les recommandations officielles indiquent".
- Tes réponses sont concises (4-8 phrases maximum), claires, et adaptées à une femme enceinte non spécialiste.
- Tu utilises le vouvoiement.
- Tu écris en français uniquement.

INGRÉDIENTS CLÉS À RISQUE (à citer si mentionnés) :
- Rétinol / rétinoïdes : déconseillés tous trimestres (tératogènes)
- Isotrétinoïne (Roaccutane) : formellement contre-indiqué
- Hydroquinone : déconseillée
- Acide salicylique à haute dose : déconseillé
- Listeria : viandes crues, fromages au lait cru, charcuteries non cuites, saumon fumé, poissons crus
- Toxoplasme : viande rosée/saignante, crudités mal lavées, jardinage sans gants
- Mercure : poissons prédateurs (thon, espadon, requin, marlin) à limiter
- Alcool : aucune dose sûre établie
- Caféine : max 200 mg/jour (OMS)
- Fromages à pâte molle au lait cru (camembert, brie non pasteurisé) : déconseillés
- Œufs crus ou peu cuits : risque salmonelle
- Doliprane (paracétamol) : utilisable avec précaution si nécessaire, doses minimales
- Ibuprofène / AINS : contre-indiqués à partir du 6ème mois
- Aspirine forte dose : déconseillée sauf prescription`;
}

// ─── API call ─────────────────────────────────────────────────────────────────

export async function sendMessage(
  history: ChatMessage[],
  userMessage: string,
): Promise<string> {
  if (!API_KEY) {
    return "La clé API Anthropic n'est pas configurée. Veuillez contacter le support Hēlo.";
  }

  const systemPrompt = await buildSystemPrompt();

  const apiMessages = history
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content }));

  apiMessages.push({ role: 'user', content: userMessage });

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: apiMessages,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[Hēlo Chat] Anthropic error:', res.status, err);
      if (res.status === 401) return "Clé API invalide. Veuillez vérifier la configuration.";
      if (res.status === 429) return "Trop de requêtes. Veuillez patienter quelques instants avant de réessayer.";
      return "Une erreur est survenue. Veuillez réessayer dans quelques instants.";
    }

    const data = await res.json();
    return data.content?.[0]?.text ?? "Désolée, je n'ai pas pu générer une réponse. Réessayez.";
  } catch (e) {
    console.error('[Hēlo Chat] Network error:', e);
    return "Impossible de joindre l'assistant. Vérifiez votre connexion internet.";
  }
}
