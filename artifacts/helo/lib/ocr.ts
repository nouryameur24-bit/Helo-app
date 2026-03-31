// ─── OCR utilities for Hēlo ingredient scanning ─────────────────────────────
// Uses Google Cloud Vision API (DOCUMENT_TEXT_DETECTION)

import { Config } from '@/lib/config';

const VISION_KEY = Config.googleVisionKey;
const VISION_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`;

// ─── Main OCR call ────────────────────────────────────────────────────────────
/**
 * Sends a base64-encoded image to Google Vision API and returns raw OCR text.
 * @param base64 — raw base64 string (no data: prefix)
 */
export async function processOCRImage(base64: string): Promise<string> {
  if (!VISION_KEY) {
    throw new Error(
      'NO_API_KEY: Ajoutez EXPO_PUBLIC_GOOGLE_VISION_KEY dans vos variables d\'environnement.',
    );
  }

  const body = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
        imageContext: { languageHints: ['fr', 'en'] },
      },
    ],
  };

  const response = await fetch(VISION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Vision API ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const fullText: string = data.responses?.[0]?.fullTextAnnotation?.text ?? '';

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
    // Normalise line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Common INCI OCR errors
    .replace(/\bAOUA\b/gi, 'AQUA')
    .replace(/\bAQOA\b/gi, 'AQUA')
    .replace(/\bEAU\s*\/\s*WATER\b/gi, 'AQUA')
    // Zero for letter-O between capital letters (e.g. C0COYL → COCOYL)
    .replace(/(?<=[A-Z])0(?=[A-Z])/g, 'O')
    // Digit-1 at start of word followed by capitals (e.g. 1NGRÉDIENTS → INGRÉDIENTS)
    .replace(/\b1(?=[A-Z])/g, 'I')
    // Strip percentages and standalone numbers
    .replace(/\b\d+[.,]\d+\s*%/g, '')
    .replace(/\b\d+\s*%/g, '')
    // Remove "INGRÉDIENTS :", "INGREDIENTS:", etc. header
    .replace(/ingr[eé]dients?\s*:?\s*/gi, '')
    // Normalise comma spacing
    .replace(/\s*,\s*/g, ', ')
    // Collapse newlines into spaces (INCI list is one long line)
    .replace(/\n+/g, ' ')
    // Collapse multiple spaces
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

  // Last segment
  const last = buffer.trim();
  if (last) parts.push(last);

  return parts
    .map((p) =>
      p
        .replace(/\.$/, '')   // remove trailing period
        .replace(/\*+$/, '')  // remove asterisks (organic marks)
        .trim(),
    )
    .filter((p) => p.length > 1 && p.length < 100) // filter noise
    .filter((p) => !/^\d+$/.test(p));               // filter pure numbers
}
