/**
 * lib/ocr.ts — OCR utilities for Hēlo ingredient scanning
 *
 * Image analysis is proxied through the `ocr` edge function so that the
 * Google Vision API key never leaves the server.
 * Deploy: supabase functions deploy ocr --no-verify-jwt
 * Set secret: supabase secrets set GOOGLE_VISION_KEY=AIza…
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RateLimitError, extractFunctionStatus } from '@/lib/errors';

// ─── Main OCR call ────────────────────────────────────────────────────────────
/**
 * Sends a base64-encoded image to the OCR edge function and returns raw text.
 * @param base64 — raw base64 string (no data: prefix)
 *
 * Lot 18-05 : on retourne aussi la confidence Google Vision (moyenne sur les
 * pages) pour permettre à l'UI d'afficher un badge "OCR partiellement fiable"
 * quand confidence < 0.85. Schéma backward-compatible : la fonction renvoie
 * encore le `text` comme avant, mais propose `confidence` en bonus.
 */
export async function processOCRImage(
  base64: string,
): Promise<{ text: string; confidence?: number }> {
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
    const status = await extractFunctionStatus(error);
    if (status === 429) throw new RateLimitError();
    throw new Error(`OCR edge function error: ${error.message}`);
  }

  type VisionPage = { confidence?: number };
  type VisionData = {
    responses?: Array<{
      fullTextAnnotation?: {
        text?: string;
        pages?: VisionPage[];
      };
    }>;
  };
  const response = (data as VisionData)?.responses?.[0];
  const fullText = response?.fullTextAnnotation?.text ?? '';

  if (!fullText.trim()) {
    throw new Error('NO_TEXT_DETECTED');
  }

  // ── Lot 18-05 : extract confidence moyenne ────────────────────────────────
  // Google Vision retourne une confidence par page (souvent une seule page).
  // On moyenne pour une heuristique simple. Null si Google ne fournit pas
  // (selon versions API), l'UI tolère l'absence.
  const pages = response?.fullTextAnnotation?.pages ?? [];
  const confidences = pages
    .map((p) => p.confidence)
    .filter((c): c is number => typeof c === 'number');
  const avgConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : undefined;

  return { text: fullText, confidence: avgConfidence };
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
    // ── INCI OCR fixes ──────────────────────────────────────────────────────
    .replace(/\bAOUA\b/gi, 'AQUA')
    .replace(/\bAQOA\b/gi, 'AQUA')
    .replace(/\bEAU\s*\/\s*WATER\b/gi, 'AQUA')
    .replace(/(?<=[A-Z])0(?=[A-Z])/g, 'O')
    .replace(/\b1(?=[A-Z])/g, 'I')
    // ── Percentages & numeric noise ─────────────────────────────────────────
    .replace(/\b\d+[.,]\d+\s*%/g, '')
    .replace(/\b\d+\s*%/g, '')
    // ── Batch numbers / lot codes (5+ digit sequences, often with letters) ──
    .replace(/\b[A-Z]?\d{5,}[A-Z0-9]*\b/g, '')
    .replace(/\bLOT[:\s]*[A-Z0-9]+\b/gi, '')
    .replace(/\bBATCH[:\s]*[A-Z0-9]+\b/gi, '')
    // ── French postal codes + addresses ─────────────────────────────────────
    .replace(/\b\d{5}\s+[A-ZÉÈÊËÀÂÄÔÖÙÛÜÇ][A-Za-zÀ-ÿ\-' ]+/g, '')
    .replace(/\bBP\s*\d+\b/gi, '')
    .replace(/\b\d+\s*(rue|avenue|av\.?|bd|boulevard|impasse|place|allée|chemin|route)\s+[^,.\n]+/gi, '')
    .replace(/\bCEDEX\s*\d*\b/gi, '')
    .replace(/\bLevallois[-\s]?Perret\b/gi, '')
    // ── Customer service / corporate boilerplate ────────────────────────────
    .replace(/\bservice\s+(consommateurs?|client[èe]le|conso)\b[^.\n]*/gi, '')
    .replace(/\bN°\s*(vert|cristal|indigo|azur)[^.\n]*/gi, '')
    .replace(/\b(tél|tel|fax|email|e-mail|mail|www|http[s]?:\/\/)[^\s]*[^.\n]*/gi, '')
    .replace(/\b\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/g, '')
    .replace(/\bfabriqu[ée]\s+(en|au|aux)\s+[A-Za-zÀ-ÿ\-' ]+/gi, '')
    .replace(/\bmade\s+in\s+[A-Za-z\-' ]+/gi, '')
    .replace(/\b(à\s+conserver|conserver\s+à|à\s+utiliser|utiliser\s+avant|date\s+de\s+p[ée]remption|DLUO|DLC|PAO)\b[^.\n]*/gi, '')
    .replace(/\b\d+\s*M\b/g, '') // PAO marker like "12M"
    // ── App UI artifacts that may leak from screenshots ─────────────────────
    .replace(/\b(Écrire\s+un\s+message|Ecrire\s+un\s+message|Retour|Annuler|Valider|Suivant|Pr[ée]c[ée]dent)\b/gi, '')
    .replace(/\bproduits?\s+de\s+(salle\s+de\s+bain|cuisine|cosm[ée]tique)s?\b/gi, '')
    // ── Strip "ingredients:" label, normalise whitespace/commas ─────────────
    .replace(/ingr[eé]dients?\s*:?\s*/gi, '')
    .replace(/\s*,\s*,+\s*/g, ', ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
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
