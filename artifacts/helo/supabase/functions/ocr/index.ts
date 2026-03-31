/**
 * supabase/functions/ocr/index.ts — Google Vision OCR proxy Edge Function
 *
 * Proxies requests to the Google Cloud Vision API so that the API key
 * never leaves the server. The GOOGLE_VISION_KEY must be set in
 * Supabase Vault (supabase secrets set GOOGLE_VISION_KEY=AIza...).
 *
 * Deploy: supabase functions deploy ocr --no-verify-jwt
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const VISION_API_BASE = 'https://vision.googleapis.com/v1/images:annotate';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface OcrRequestBody {
  imageBase64: string;
  features?: Array<{ type: string; maxResults?: number }>;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const visionKey = Deno.env.get('GOOGLE_VISION_KEY');
    if (!visionKey) {
      return new Response(
        JSON.stringify({ error: 'Service temporairement indisponible' }),
        { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const body = (await req.json()) as OcrRequestBody;

    const visionResponse = await fetch(`${VISION_API_BASE}?key=${visionKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: body.imageBase64 },
            features: body.features ?? [{ type: 'TEXT_DETECTION' }],
          },
        ],
      }),
    });

    const data = await visionResponse.json();

    return new Response(JSON.stringify(data), {
      status: visionResponse.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
