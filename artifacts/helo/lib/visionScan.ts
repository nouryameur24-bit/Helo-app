/**
 * lib/visionScan.ts — Photo product identification via Claude Vision
 *
 * Sends a base64-encoded product photo to the Supabase `chat` Edge Function,
 * which proxies to Claude. No API key is exposed to the client.
 */

import type { ProductData } from '@/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { RateLimitError, extractFunctionStatus } from '@/lib/errors';

interface VisionResponse {
  product_name: string;
  brand: string;
  probable_ingredients: string[];
  confidence: 'high' | 'medium' | 'low';
}

type ChatData = { content?: Array<{ text?: string }> };

const VISION_PROMPT = `Tu es un expert en cosmétiques et alimentation. Analyse cette photo du produit et identifie-le.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans explication. Format exact :
{
  "product_name": "Nom complet du produit",
  "brand": "Marque du produit",
  "probable_ingredients": ["ingrédient1", "ingrédient2", "ingrédient3"],
  "confidence": "high" | "medium" | "low"
}

Règles :
- Identifie le produit visible sur la photo (cosmétique, aliment, médicament, etc.)
- Liste les ingrédients probables pour ce type de produit (au moins 5, max 20)
- Si tu ne reconnais pas le produit, indique "Produit non identifié" comme nom
- confidence = "high" si tu es sûr, "medium" si probable, "low" si incertain
- Réponds en français pour product_name et brand`;

async function invokeChatVision(base64Image: string, prompt: string): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error("Le service d'analyse n'est pas configuré.");
  }

  const messages = [
    {
      role: 'user' as const,
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: base64Image,
          },
        },
        { type: 'text', text: prompt },
      ],
    },
  ];

  const { data, error } = await supabase.functions.invoke('chat', {
    body: { messages },
  });

  if (error) {
    const status = await extractFunctionStatus(error);
    if (status === 429) throw new RateLimitError();
    if (__DEV__) console.error('[Hēlo VisionScan] Edge function error:', error);
    throw new Error("Erreur lors de l'identification visuelle. Réessayez.");
  }

  const text = (data as ChatData)?.content?.[0]?.text ?? '';
  if (!text) throw new Error("Réponse vide du service. Réessayez.");
  return text;
}

export async function identifyProduct(base64Image: string): Promise<ProductData> {
  const rawText = await invokeChatVision(base64Image, VISION_PROMPT);

  let parsed: VisionResponse;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    parsed = JSON.parse(jsonMatch[0]) as VisionResponse;
  } catch (err) {
    logError('visionScan.identifyProduct.parse', err, { rawText: rawText.slice(0, 500) });
    throw new Error("Impossible d'analyser la réponse. Réessayez.");
  }

  if (!parsed.product_name || parsed.product_name === 'Produit non identifié') {
    throw new Error("Produit non reconnu sur la photo. Essayez avec une meilleure mise au point ou un autre angle.");
  }

  const product: ProductData = {
    name: parsed.product_name,
    brand: parsed.brand || undefined,
    ingredientsList: parsed.probable_ingredients ?? [],
    ingredientsRaw: (parsed.probable_ingredients ?? []).join(', '),
    source: 'manual',
    isPhotoIdentified: true,
  };

  return product;
}

// ─── Shelf Scan ────────────────────────────────────────────────────────────────

export interface ShelfDetectedProduct {
  name: string;
  brand: string;
  category: string;
}

const SHELF_VISION_PROMPT = `Tu es un expert en cosmétiques et produits ménagers. Analyse cette photo d'étagère et identifie TOUS les produits visibles.

Réponds UNIQUEMENT avec un tableau JSON valide, sans markdown, sans explication. Format exact :
[
  {
    "name": "Nom complet du produit",
    "brand": "Marque du produit",
    "category": "cosmétique" | "alimentaire" | "ménager" | "médicament" | "autre"
  }
]

Règles :
- Liste tous les produits visibles sur l'étagère (flacons, tubes, boîtes, bouteilles, etc.)
- Si tu vois un produit mais ne le reconnais pas précisément, donne le type de produit et la marque si visible
- Minimum 1 produit, maximum 30 produits
- Réponds en français pour les noms et marques
- Si aucun produit n'est identifiable, retourne un tableau vide []`;

export async function scanShelf(base64Image: string): Promise<ShelfDetectedProduct[]> {
  const rawText = await invokeChatVision(base64Image, SHELF_VISION_PROMPT);

  let parsed: ShelfDetectedProduct[];
  try {
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    parsed = JSON.parse(jsonMatch[0]) as ShelfDetectedProduct[];
    if (!Array.isArray(parsed)) throw new Error('Not an array');
  } catch (err) {
    logError('visionScan.scanShelf.parse', err, { rawText: rawText.slice(0, 500) });
    throw new Error("Impossible d'analyser la réponse. Réessayez.");
  }

  return parsed.filter(
    (p) => p && typeof p.name === 'string' && p.name.trim().length > 0,
  );
}
