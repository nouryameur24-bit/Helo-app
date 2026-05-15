/**
 * lib/anthropic.ts — Hēlo AI assistant via Supabase Edge Function
 *
 * All Anthropic API calls are proxied through the `chat` edge function so
 * that the API key never leaves the server.
 * Deploy: supabase functions deploy chat --no-verify-jwt
 * Set secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-…
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
  } catch {
    // Non-critical — history may be lost; conversation still works
  }
}

export async function clearChatHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
  } catch {
    // Non-critical — stale history will be overwritten on the next session
  }
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
- Ibuprofène / AINS : contre-indiqués à partir du 6ème mois`;
}

// ─── Edge function call ───────────────────────────────────────────────────────

export async function sendMessage(
  history: ChatMessage[],
  userMessage: string,
): Promise<string> {
  if (!isSupabaseConfigured) {
    return "Le service de chat n'est pas encore configuré. Veuillez contacter le support Hēlo.";
  }

  const systemPrompt = await buildSystemPrompt();

  const messages = [
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  try {
    const { data, error } = await supabase.functions.invoke('chat', {
      body: { messages, system: systemPrompt },
    });

    if (error) {
      if (__DEV__) console.error('[Hēlo Chat] Edge function error:', error);
      return "Une erreur est survenue. Veuillez réessayer dans quelques instants.";
    }

    type ChatData = { content?: Array<{ text?: string }> };
    const text = (data as ChatData)?.content?.[0]?.text ?? '';
    if (!text) return "Désolée, je n'ai pas pu générer une réponse. Réessayez.";
    return text;
  } catch (e) {
    if (__DEV__) console.error('[Hēlo Chat] Network error:', e);
    return "Impossible de joindre l'assistant. Vérifiez votre connexion internet.";
  }
}
