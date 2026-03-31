/**
 * lib/visionScan.ts — Photo product identification via Claude Vision
 *
 * Sends a base64-encoded product photo to Claude Vision API,
 * parses the JSON response, and returns a ProductData object.
 * Requires EXPO_PUBLIC_ANTHROPIC_API_KEY in env.
 */

import type { ProductData } from '@/types';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-5';
const MAX_TOKENS = 1024;

interface VisionResponse {
  product_name: string;
  brand: string;
  probable_ingredients: string[];
  confidence: 'high' | 'medium' | 'low';
}

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

export async function identifyProduct(base64Image: string): Promise<ProductData> {
  if (!API_KEY) {
    throw new Error("La clé API Anthropic n'est pas configurée.");
  }

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
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: VISION_PROMPT,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[Hēlo VisionScan] Anthropic error:', res.status, err);
    if (res.status === 401) throw new Error('Clé API invalide.');
    if (res.status === 429) throw new Error('Trop de requêtes. Réessayez dans quelques instants.');
    throw new Error("Erreur lors de l'identification visuelle. Réessayez.");
  }

  const data = await res.json();
  const rawText: string = data.content?.[0]?.text ?? '';

  let parsed: VisionResponse;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    parsed = JSON.parse(jsonMatch[0]) as VisionResponse;
  } catch {
    console.error('[Hēlo VisionScan] JSON parse error:', rawText);
    throw new Error("Impossible d'analyser la réponse de Claude. Réessayez.");
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
