/**
 * lib/ocr.ts — OCR utilities for Hēlo ingredient scanning
 *
 * Image analysis is proxied through the `ocr` edge function so that the
 * Google Vision API key never leaves the server.
 * Deploy: supabase functions deploy ocr --no-verify-jwt
 * Set secret: supabase secrets set GOOGLE_VISION_KEY=AIza…
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── Main OCR call ────────────────────────────────────────────────────────────
/**
 * Sends a base64-encoded image to the OCR edge function and returns raw text.
 * @param base64 — raw base64 string (no data: prefix)
 */
export async function processOCRImage(base64: string): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'NO_SERVICE: La fonction OCR nécessite une connexion Supabase configurée.',
    );
  }

  const { data, error } = await supabase.functions.invoke('ocr', {
    body: {
      imageBase64: base64,
      features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
    },
  });

  if (error) {
    throw new Error(`OCR edge function error: ${error.message}`);
  }

  type VisionData = {
    responses?: Array<{ fullTextAnnotation?: { text?: string } }>;
  };
  const fullText = (data as VisionData)?.responses?.[0]?.fullTextAnnotation?.text ?? '';

  if (!fullText.trim()) {
    throw new Error('NO_TEXT_DETECTED');
  }

  return fullText;
}

// ─── Text cleanup ─────────────────────────────────────────────────────────────
/**
 * Cleans raw OCR output for INCI parsing:
 * - Normalises whitespace & line endings
 * - Fixes common OCR errors on INCI names (AOUA→AQUA, 0→O between letters, etc.)
 * - Removes stray numbers, percentages, and noise
 */
export function cleanOCRText(rawText: string): string {
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\bAOUA\b/gi, 'AQUA')
    .replace(/\bAQOA\b/gi, 'AQUA')
    .replace(/\bEAU\s*\/\s*WATER\b/gi, 'AQUA')
    .replace(/(?<=[A-Z])0(?=[A-Z])/g, 'O')
    .replace(/\b1(?=[A-Z])/g, 'I')
    .replace(/\b\d+[.,]\d+\s*%/g, '')
    .replace(/\b\d+\s*%/g, '')
    .replace(/ingr[eé]dients?\s*:?\s*/gi, '')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─── INCI parser ──────────────────────────────────────────────────────────────
/**
 * Splits a cleaned INCI text into an array of ingredient names.
 * Respects parentheses so "Parfum (Linalool, Limonene)" is kept together.
 */
export function parseINCI(cleanedText: string): string[] {
  const parts: string[] = [];
  let buffer = '';
  let depth = 0;

  for (const char of cleanedText) {
    if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth = Math.max(0, depth - 1);

    if (char === ',' && depth === 0) {
      const trimmed = buffer.trim();
      if (trimmed) parts.push(trimmed);
      buffer = '';
    } else {
      buffer += char;
    }
  }

  const last = buffer.trim();
  if (last) parts.push(last);

  return parts
    .map((p) =>
      p
        .replace(/\.$/, '')
        .replace(/\*+$/, '')
        .trim(),
    )
    .filter((p) => p.length > 1 && p.length < 100)
    .filter((p) => !/^\d+$/.test(p));
}
