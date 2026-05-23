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

export const supabaseAdmin: SupabaseClient = createClient(
  url ?? "",
  serviceRoleKey ?? "",
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

export const isSupabaseConfigured = Boolean(url && serviceRoleKey);
