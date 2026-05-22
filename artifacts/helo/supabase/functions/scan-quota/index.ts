/**
 * supabase/functions/scan-quota/index.ts — Server-side scan quota enforcement
 *
 * Free tier: 5 scans / 24h. Premium users bypass entirely (handled client-side).
 *
 * Atomically checks & consumes the quota via the `consume_api_quota` RPC,
 * which uses a transaction-scoped advisory lock to prevent TOCTOU races.
 *
 * Response:
 *   200 { allowed: true,  remaining: number }
 *   429 { allowed: false, remaining: 0, error: 'Limite quotidienne atteinte' }
 *
 * The client (`lib/scanLimit.ts`) keeps an AsyncStorage cache for instant
 * paywall UX and offline mode, but the SERVER is the source of truth.
 *
 * Secrets required (supabase secrets set):
 *   - SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * Deploy: supabase functions deploy scan-quota   (NO --no-verify-jwt)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FREE_SCAN_LIMIT = 5;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      console.error('[scan-quota] missing env');
      return json({ error: 'Service temporairement indisponible' }, 503);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Authentification requise' }, 401);

    const sb = createClient(supabaseUrl, serviceKey);
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: userErr } = await sb.auth.getUser(jwt);
    if (userErr || !user) {
      return json({ error: 'Authentification requise' }, 401);
    }

    // Atomic check + consume (advisory lock inside the RPC prevents bypass
    // via concurrent burst requests from the same account).
    const { data: allowed, error: rpcErr } = await sb.rpc('consume_api_quota', {
      p_user_id: user.id,
      p_endpoint: 'scan',
      p_limit: FREE_SCAN_LIMIT,
    });
    if (rpcErr) {
      console.error('[scan-quota] consume_api_quota error:', rpcErr);
      return json({ error: 'Erreur interne du serveur' }, 500);
    }

    if (allowed !== true) {
      return json(
        { allowed: false, remaining: 0, error: 'Limite quotidienne atteinte' },
        429,
      );
    }

    // Compute remaining (separate non-blocking query — best effort).
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await sb
      .from('api_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('endpoint', 'scan')
      .gte('created_at', since);

    const used = typeof count === 'number' ? count : FREE_SCAN_LIMIT;
    const remaining = Math.max(0, FREE_SCAN_LIMIT - used);

    return json({ allowed: true, remaining }, 200);
  } catch (err) {
    console.error('[scan-quota] unhandled error:', err);
    return json({ error: 'Erreur interne du serveur' }, 500);
  }
});
