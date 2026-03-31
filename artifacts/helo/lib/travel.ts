/**
 * lib/travel.ts — Hēlo Mode Voyage
 *
 * Generates pregnancy travel health briefings via Claude AI.
 * Persists briefings in AsyncStorage for offline access.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 2048;

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
  } catch {
    return [];
  }
}

export async function loadTravelBriefing(storageKey: string): Promise<TravelBriefing | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as TravelBriefing;
  } catch {
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
        await AsyncStorage.removeItem(old.storageKey).catch(() => {});
      }
    }

    await AsyncStorage.setItem(TRAVEL_BRIEFINGS_INDEX_KEY, JSON.stringify(updated));
  } catch {}
}

export async function deleteTravelBriefing(storageKey: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey);
    const index = await loadTravelBriefingsIndex();
    const updated = index.filter((m) => m.storageKey !== storageKey);
    await AsyncStorage.setItem(TRAVEL_BRIEFINGS_INDEX_KEY, JSON.stringify(updated));
  } catch {}
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

function buildPrompt(country: string, departureDate: string, returnDate: string, trimesterLabel: string): string {
  return `Tu es une sage-femme et médecin du voyage francophone. Génère un briefing santé grossesse complet pour une femme enceinte au ${trimesterLabel} qui voyage en ${country} du ${departureDate} au ${returnDate}.

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans texte avant/après) respectant exactement ce format :

{
  "flag": "<emoji drapeau pays>",
  "sections": {
    "water": {
      "title": "Eau & Hydratation",
      "emoji": "💧",
      "content": "<paragraphe concis sur la qualité de l'eau en ${country}>",
      "tips": ["<conseil 1>", "<conseil 2>", "<conseil 3>"],
      "riskLevel": "<low|medium|high>"
    },
    "food": {
      "title": "Alimentation",
      "emoji": "🍽️",
      "content": "<paragraphe sur la sécurité alimentaire en ${country} pendant la grossesse>",
      "tips": ["<conseil 1>", "<conseil 2>", "<conseil 3>"],
      "riskLevel": "<low|medium|high>"
    },
    "mosquitoes": {
      "title": "Moustiques & Parasites",
      "emoji": "🦟",
      "content": "<paragraphe sur les risques (paludisme, dengue, zika, etc.) en ${country}>",
      "tips": ["<conseil 1>", "<conseil 2>", "<conseil 3>"],
      "riskLevel": "<low|medium|high>"
    },
    "vaccines": {
      "title": "Vaccins & Médicaments",
      "emoji": "💉",
      "content": "<paragraphe sur les vaccinations recommandées/obligatoires et médicaments compatibles grossesse>",
      "tips": ["<conseil 1>", "<conseil 2>", "<conseil 3>"],
      "riskLevel": "<low|medium|high>"
    },
    "sun": {
      "title": "Soleil & Chaleur",
      "emoji": "☀️",
      "content": "<paragraphe sur les précautions soleil et chaleur pendant la grossesse en ${country}>",
      "tips": ["<conseil 1>", "<conseil 2>", "<conseil 3>"],
      "riskLevel": "<low|medium|high>"
    },
    "emergency": {
      "title": "Urgences & Santé",
      "emoji": "🏥",
      "content": "<paragraphe sur le système de santé local, numéros d'urgence, assurance voyage grossesse>",
      "tips": ["<conseil 1>", "<conseil 2>", "<conseil 3>"],
      "riskLevel": "<low|medium|high>"
    }
  },
  "checklist": [
    "<item à emporter/préparer 1>",
    "<item 2>",
    "<item 3>",
    "<item 4>",
    "<item 5>",
    "<item 6>",
    "<item 7>",
    "<item 8>",
    "<item 9>",
    "<item 10>"
  ]
}

Adapte TOUTES les recommandations au trimestre (${trimesterLabel}) et au pays spécifique. Sois précise et pratique. Les tips doivent être des phrases courtes et actionnables.`;
}

export async function generateTravelBriefing(
  country: string,
  flag: string,
  departureDate: string,
  returnDate: string,
): Promise<TravelBriefing> {
  const trimesterRaw = await AsyncStorage.getItem('@helo_last_trimester').catch(() => null);
  const trimesterNum = parseInt(trimesterRaw ?? '2', 10);
  const trimesterLabel =
    trimesterNum === 1 ? '1er trimestre'
    : trimesterNum === 2 ? '2ème trimestre'
    : '3ème trimestre';

  if (!API_KEY) {
    throw new Error('API_KEY_MISSING');
  }

  const prompt = buildPrompt(country, departureDate, returnDate, trimesterLabel);

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
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 401) throw new Error('API_KEY_INVALID');
    if (status === 429) throw new Error('RATE_LIMIT');
    throw new Error(`API_ERROR_${status}`);
  }

  const data = await res.json();
  const rawText = data.content?.[0]?.text ?? '';

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
  } catch {
    throw new Error('PARSE_ERROR');
  }

  validateBriefingShape(parsed);

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
      water: normalizeSection(parsed.sections.water),
      food: normalizeSection(parsed.sections.food),
      mosquitoes: normalizeSection(parsed.sections.mosquitoes),
      vaccines: normalizeSection(parsed.sections.vaccines),
      sun: normalizeSection(parsed.sections.sun),
      emergency: normalizeSection(parsed.sections.emergency),
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
