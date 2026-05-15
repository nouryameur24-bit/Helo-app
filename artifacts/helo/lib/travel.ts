/**
 * lib/travel.ts — Hēlo Mode Voyage
 *
 * Generates pregnancy travel health briefings via Claude AI.
 * Persists briefings in AsyncStorage for offline access.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';

const TRAVEL_BRIEFINGS_INDEX_KEY = '@helo_travel_briefings_index';
const MAX_BRIEFINGS = 5;

export interface TravelBriefingSection {
  title: string;
  emoji: string;
  content: string;
  tips: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface TravelBriefing {
  id: string;
  country: string;
  flag: string;
  departureDate: string;
  returnDate: string;
  trimester: number;
  generatedAt: number;
  sections: {
    water: TravelBriefingSection;
    food: TravelBriefingSection;
    mosquitoes: TravelBriefingSection;
    vaccines: TravelBriefingSection;
    sun: TravelBriefingSection;
    emergency: TravelBriefingSection;
  };
  checklist: ChecklistItem[];
}

export interface TravelBriefingMeta {
  id: string;
  country: string;
  flag: string;
  departureDate: string;
  returnDate: string;
  generatedAt: number;
  storageKey: string;
}

function getBriefingStorageKey(country: string, departureDate: string): string {
  const normalized = country.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const dateNorm = departureDate.replace(/-/g, '');
  return `@helo_travel_${normalized}_${dateNorm}`;
}

export async function loadTravelBriefingsIndex(): Promise<TravelBriefingMeta[]> {
  try {
    const raw = await AsyncStorage.getItem(TRAVEL_BRIEFINGS_INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TravelBriefingMeta[];
  } catch (err) {
    logError('travel.loadIndex', err);
    return [];
  }
}

export async function loadTravelBriefing(storageKey: string): Promise<TravelBriefing | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as TravelBriefing;
  } catch (err) {
    logError('travel.loadBriefing', err, { storageKey });
    return null;
  }
}

async function saveTravelBriefing(briefing: TravelBriefing, storageKey: string): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(briefing));

    const index = await loadTravelBriefingsIndex();
    const filtered = index.filter((m) => m.storageKey !== storageKey);
    const meta: TravelBriefingMeta = {
      id: briefing.id,
      country: briefing.country,
      flag: briefing.flag,
      departureDate: briefing.departureDate,
      returnDate: briefing.returnDate,
      generatedAt: briefing.generatedAt,
      storageKey,
    };
    const updated = [meta, ...filtered].slice(0, MAX_BRIEFINGS);

    if (filtered.length >= MAX_BRIEFINGS) {
      const removed = [meta, ...filtered].slice(MAX_BRIEFINGS);
      for (const old of removed) {
        await AsyncStorage.removeItem(old.storageKey).catch((err) => {
          logError('travel.evictOldBriefing', err, { storageKey: old.storageKey });
        });
      }
    }

    await AsyncStorage.setItem(TRAVEL_BRIEFINGS_INDEX_KEY, JSON.stringify(updated));
  } catch (err) {
    // AsyncStorage write failure — briefing may not appear until app restarts
    logError('travel.saveBriefing', err, { storageKey });
  }
}

export async function deleteTravelBriefing(storageKey: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey);
    const index = await loadTravelBriefingsIndex();
    const updated = index.filter((m) => m.storageKey !== storageKey);
    await AsyncStorage.setItem(TRAVEL_BRIEFINGS_INDEX_KEY, JSON.stringify(updated));
  } catch (err) {
    // AsyncStorage failure — item may reappear after restart; user can delete again
    logError('travel.deleteBriefing', err, { storageKey });
  }
}

const VALID_RISK_LEVELS = new Set(['low', 'medium', 'high']);

function normalizeSection(raw: unknown): TravelBriefingSection {
  if (!raw || typeof raw !== 'object') throw new Error('PARSE_ERROR');
  const s = raw as Record<string, unknown>;
  if (typeof s.content !== 'string') throw new Error('PARSE_ERROR');
  const riskLevel = VALID_RISK_LEVELS.has(s.riskLevel as string)
    ? (s.riskLevel as 'low' | 'medium' | 'high')
    : 'low';
  const tips = Array.isArray(s.tips)
    ? (s.tips as unknown[]).filter((t): t is string => typeof t === 'string')
    : [];
  return {
    title: typeof s.title === 'string' ? s.title : '',
    emoji: typeof s.emoji === 'string' ? s.emoji : '',
    content: s.content,
    tips,
    riskLevel,
  };
}

function validateBriefingShape(parsed: unknown): void {
  if (!parsed || typeof parsed !== 'object') throw new Error('PARSE_ERROR');
  const p = parsed as Record<string, unknown>;
  if (!p.sections || typeof p.sections !== 'object') throw new Error('PARSE_ERROR');
  const secs = p.sections as Record<string, unknown>;
  const required = ['water', 'food', 'mosquitoes', 'vaccines', 'sun', 'emergency'] as const;
  for (const key of required) {
    if (!secs[key] || typeof secs[key] !== 'object') throw new Error('PARSE_ERROR');
  }
}

// Section keys, French titles and emojis are filled in client-side after parsing
// to keep the prompt minimal — the LLM only returns content/tips/riskLevel per section.
const SECTION_META: Record<
  'water' | 'food' | 'mosquitoes' | 'vaccines' | 'sun' | 'emergency',
  { title: string; emoji: string }
> = {
  water:      { title: 'Eau & Hydratation',     emoji: '💧' },
  food:       { title: 'Alimentation',          emoji: '🍽️' },
  mosquitoes: { title: 'Moustiques & Parasites', emoji: '🦟' },
  vaccines:   { title: 'Vaccins & Médicaments',  emoji: '💉' },
  sun:        { title: 'Soleil & Chaleur',       emoji: '☀️' },
  emergency:  { title: 'Urgences & Santé',       emoji: '🏥' },
};

function buildPrompt(country: string, departureDate: string, returnDate: string, trimesterLabel: string): string {
  // Compact prompt: ~10 lines instead of ~65, faster to process by Claude Haiku.
  return `Sage-femme/médecin du voyage. Briefing santé pour femme enceinte (${trimesterLabel}) en ${country} du ${departureDate} au ${returnDate}.

Réponds UNIQUEMENT avec ce JSON (sans markdown) :
{"flag":"<emoji drapeau>","sections":{"water":{"content":"...","tips":["..","..",".."], "riskLevel":"low|medium|high"},"food":{...},"mosquitoes":{...},"vaccines":{...},"sun":{...},"emergency":{...}},"checklist":["item1",...,"item10"]}

Sections : water (eau), food (alimentation), mosquitoes (paludisme/dengue/zika), vaccines (vaccins+médocs grossesse), sun (soleil/chaleur), emergency (santé locale, numéros, assurance).
Chaque section : 1 paragraphe court + 3 tips actionnables + riskLevel. Checklist : 10 items à emporter. Adapte au ${trimesterLabel} et au pays.`;
}

const EDGE_TIMEOUT_MS = 25_000;
const MAX_ATTEMPTS = 2;

interface ChatData { content?: Array<{ text?: string }> }

async function invokeChatWithTimeout(prompt: string): Promise<string> {
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const invokePromise = supabase.functions.invoke('chat', {
        body: { messages: [{ role: 'user', content: prompt }] },
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), EDGE_TIMEOUT_MS),
      );
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);
      if (error) throw error;
      const text = (data as ChatData)?.content?.[0]?.text ?? '';
      if (!text) throw new Error('EMPTY_RESPONSE');
      return text;
    } catch (err) {
      lastErr = err;
      if (__DEV__) console.warn(`[Hēlo Travel] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err);
      if (attempt < MAX_ATTEMPTS) {
        // Backoff before retry: 800ms then 1.6s
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }
  }
  if (__DEV__) console.error('[Hēlo Travel] all attempts failed:', lastErr);
  throw new Error('API_ERROR_EDGE');
}

export async function generateTravelBriefing(
  country: string,
  flag: string,
  departureDate: string,
  returnDate: string,
): Promise<TravelBriefing> {
  const trimesterRaw = await AsyncStorage.getItem('@helo_last_trimester').catch((err) => {
    logError('travel.generateBriefing.readTrimester', err);
    return null;
  });
  const trimesterNum = parseInt(trimesterRaw ?? '2', 10);
  const trimesterLabel =
    trimesterNum === 1 ? '1er trimestre'
    : trimesterNum === 2 ? '2ème trimestre'
    : '3ème trimestre';

  if (!isSupabaseConfigured) {
    throw new Error('API_KEY_MISSING');
  }

  const prompt = buildPrompt(country, departureDate, returnDate, trimesterLabel);

  const rawText = await invokeChatWithTimeout(prompt);

  let parsed: {
    flag?: string;
    sections: {
      water: Omit<TravelBriefingSection, 'title' | 'emoji'> & { title: string; emoji: string };
      food: Omit<TravelBriefingSection, 'title' | 'emoji'> & { title: string; emoji: string };
      mosquitoes: Omit<TravelBriefingSection, 'title' | 'emoji'> & { title: string; emoji: string };
      vaccines: Omit<TravelBriefingSection, 'title' | 'emoji'> & { title: string; emoji: string };
      sun: Omit<TravelBriefingSection, 'title' | 'emoji'> & { title: string; emoji: string };
      emergency: Omit<TravelBriefingSection, 'title' | 'emoji'> & { title: string; emoji: string };
    };
    checklist: string[];
  };

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    logError('travel.generateBriefing.parse', err, { rawText: rawText.slice(0, 500) });
    throw new Error('PARSE_ERROR');
  }

  validateBriefingShape(parsed);

  // Inject French titles/emojis client-side (the compact prompt no longer asks for them).
  const sectionWithMeta = (key: keyof typeof SECTION_META) => ({
    ...(parsed.sections[key] as Record<string, unknown>),
    title: SECTION_META[key].title,
    emoji: SECTION_META[key].emoji,
  });

  const id = `travel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const briefing: TravelBriefing = {
    id,
    country,
    flag: parsed.flag ?? flag,
    departureDate,
    returnDate,
    trimester: trimesterNum,
    generatedAt: Date.now(),
    sections: {
      water: normalizeSection(sectionWithMeta('water')),
      food: normalizeSection(sectionWithMeta('food')),
      mosquitoes: normalizeSection(sectionWithMeta('mosquitoes')),
      vaccines: normalizeSection(sectionWithMeta('vaccines')),
      sun: normalizeSection(sectionWithMeta('sun')),
      emergency: normalizeSection(sectionWithMeta('emergency')),
    },
    checklist: (parsed.checklist ?? []).map((label: string, i: number) => ({
      id: `check_${i}`,
      label: typeof label === 'string' ? label : String(label),
      checked: false,
    })),
  };

  const storageKey = getBriefingStorageKey(country, departureDate);
  await saveTravelBriefing(briefing, storageKey);

  return briefing;
}
