/**
 * supabase/functions/ocr/index.ts — Google Vision OCR proxy Edge Function
 *
 * Proxies requests to the Google Cloud Vision API so that the API key never
 * leaves the server. Requires a valid Supabase JWT (Anonymous Auth or signed-in).
 *
 * Secrets required (supabase secrets set):
 *   - GOOGLE_VISION_KEY=AIza...
 *   - SUPABASE_SERVICE_ROLE_KEY=eyJ...   (used for JWT verification + usage logging)
 *
 * Deploy: supabase functions deploy ocr   (NO --no-verify-jwt)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VISION_API_BASE = 'https://vision.googleapis.com/v1/images:annotate';
const DAILY_LIMIT = 100;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB decoded

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface OcrRequestBody {
  imageBase64: string;
  features?: Array<{ type: string; maxResults?: number }>;
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

const forbidden = () => json({ error: 'Authentification requise' }, 401);
const badRequest = (msg = 'Requête invalide') => json({ error: msg }, 400);
const tooMany = () =>
  json({ error: 'Limite quotidienne atteinte. Réessayez demain.' }, 429);
const serverError = () => json({ error: 'Erreur interne du serveur' }, 500);
const unavailable = () => json({ error: 'Service temporairement indisponible' }, 503);

const ALLOWED_FEATURES = new Set([
  'TEXT_DETECTION',
  'DOCUMENT_TEXT_DETECTION',
  'LABEL_DETECTION',
  'LOGO_DETECTION',
]);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // ── Required secrets ──────────────────────────────────────────────
    const visionKey = Deno.env.get('GOOGLE_VISION_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!visionKey || !supabaseUrl || !serviceKey) {
      console.error('[ocr] missing required env');
      return unavailable();
    }

    // ── 1. Auth check ─────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return forbidden();

    const sb = createClient(supabaseUrl, serviceKey);
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: userErr } = await sb.auth.getUser(jwt);
    if (userErr || !user) return forbidden();

    // ── 2. Input validation ──────────────────────────────────────────
    let body: OcrRequestBody;
    try {
      body = (await req.json()) as OcrRequestBody;
    } catch {
      return badRequest('JSON invalide');
    }

    if (typeof body.imageBase64 !== 'string' || body.imageBase64.length === 0) {
      return badRequest('Image manquante');
    }
    // base64 is ~33% larger than the raw bytes
    if (body.imageBase64.length * 0.75 > MAX_IMAGE_BYTES) {
      return badRequest('Image trop volumineuse (max 5 Mo)');
    }

    let features = body.features ?? [{ type: 'TEXT_DETECTION' }];
    if (!Array.isArray(features) || features.length === 0 || features.length > 4) {
      return badRequest('Features invalides');
    }
    for (const f of features) {
      if (!f || typeof f.type !== 'string' || !ALLOWED_FEATURES.has(f.type)) {
        return badRequest('Type de feature non autorisé');
      }
    }

    // ── 3. Rate limit (atomic check + consume) ───────────────────────
    const { data: allowed, error: rpcErr } = await sb.rpc('consume_api_quota', {
      p_user_id: user.id,
      p_endpoint: 'ocr',
      p_limit: DAILY_LIMIT,
    });
    if (rpcErr) {
      console.error('[ocr] consume_api_quota error:', rpcErr);
      return serverError();
    }
    if (allowed !== true) return tooMany();

    // ── 4. Proxy to Google Vision ────────────────────────────────────
    const visionResponse = await fetch(`${VISION_API_BASE}?key=${visionKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: body.imageBase64 },
            features,
          },
        ],
      }),
    });

    const data = await visionResponse.json();

    return new Response(JSON.stringify(data), {
      status: visionResponse.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[ocr] unhandled error:', err);
    return serverError();
  }
});
