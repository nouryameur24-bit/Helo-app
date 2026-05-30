import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  logger.warn("SUPABASE_URL not set — /api/scan will fail");
}
if (!serviceRoleKey) {
  logger.warn(
    "SUPABASE_SERVICE_ROLE_KEY not set — analysis_cache writes will fail (RLS blocks anon)",
  );
}

export const isSupabaseConfigured = Boolean(url && serviceRoleKey);

// Audit final fix : `createClient("", "")` throw "supabaseUrl is required" À
// L'IMPORT → cassait les tests api-server + la CI (matcher.ts importe ce module,
// runTests importe matcher). Symétrique du fix mobile lib/supabase.ts : on passe
// un placeholder au format valide quand non configuré. `isSupabaseConfigured`
// gate déjà tous les vrais appels → aucune requête vers le placeholder.
export const supabaseAdmin: SupabaseClient = createClient(
  isSupabaseConfigured ? url! : "https://placeholder.supabase.co",
  isSupabaseConfigured ? serviceRoleKey! : "placeholder-service-role-key",
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
