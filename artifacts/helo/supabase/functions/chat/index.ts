/**
 * supabase/functions/chat/index.ts — Claude AI proxy Edge Function
 *
 * Proxies requests to the Anthropic Messages API so that the API key never
 * leaves the server. Requires a valid Supabase JWT (Anonymous Auth or signed-in).
 *
 * Secrets required (supabase secrets set):
 *   - ANTHROPIC_API_KEY=sk-ant-...
 *   - SUPABASE_SERVICE_ROLE_KEY=eyJ...   (used for JWT verification + usage logging)
 *
 * Deploy: supabase functions deploy chat   (NO --no-verify-jwt)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;
const DAILY_LIMIT = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: unknown }>;
  system?: string;
  max_tokens?: number;
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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // ── Required secrets ──────────────────────────────────────────────
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!apiKey || !supabaseUrl || !serviceKey) {
      console.error('[chat] missing required env');
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
    let body: ChatRequestBody;
    try {
      body = (await req.json()) as ChatRequestBody;
    } catch {
      return badRequest('JSON invalide');
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 30) {
      return badRequest('Nombre de messages invalide (1-30)');
    }
    for (const m of body.messages) {
      if (m.role !== 'user' && m.role !== 'assistant') {
        return badRequest('Rôle invalide');
      }
      // content may be a string OR an array (Claude vision: text + image blocks).
      if (typeof m.content === 'string') {
        if (m.content.length > 4000) return badRequest('Message trop long');
      } else if (Array.isArray(m.content)) {
        // Vision payload — cap total serialized size to ~8MB (base64 image included).
        const serialized = JSON.stringify(m.content);
        if (serialized.length > 8 * 1024 * 1024) {
          return badRequest('Contenu trop volumineux (max 8 Mo)');
        }
      } else {
        return badRequest('Contenu de message invalide');
      }
    }
    if (body.system && body.system.length > 8000) {
      return badRequest('System prompt trop long');
    }
    const maxTokens = Math.min(body.max_tokens ?? MAX_TOKENS, 2048);

    // ── 3. Rate limit (atomic check + consume) ───────────────────────
    // The RPC uses a transaction-scoped advisory lock so concurrent bursts
    // from the same user cannot bypass the cap (no TOCTOU race).
    const { data: allowed, error: rpcErr } = await sb.rpc('consume_api_quota', {
      p_user_id: user.id,
      p_endpoint: 'chat',
      p_limit: DAILY_LIMIT,
    });
    if (rpcErr) {
      console.error('[chat] consume_api_quota error:', rpcErr);
      return serverError();
    }
    if (allowed !== true) return tooMany();

    // ── 4. Proxy to Anthropic ────────────────────────────────────────
    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: body.system,
        messages: body.messages,
      }),
    });

    const data = await anthropicResponse.json();

    return new Response(JSON.stringify(data), {
      status: anthropicResponse.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[chat] unhandled error:', err);
    return serverError();
  }
});
