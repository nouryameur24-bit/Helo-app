-- Migration : product_recalls_push_subscriptions
-- Appliquée via Supabase MCP le 2026-05-25 (task #112, Lot 19-I1)
-- Version: 20260525192748

-- Lot 19-I1 — Push recall RappelConso temps réel
-- Quand DGCCRF publie un nouveau rappel → on push notif aux users qui ont scanné ce produit

CREATE TABLE IF NOT EXISTS product_recalls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rappel_id TEXT UNIQUE NOT NULL,
  rappel_url TEXT,
  product_name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  ean_codes TEXT[],
  lot_codes TEXT[],
  risk_description TEXT NOT NULL,
  risk_severity TEXT CHECK (risk_severity IN ('low', 'medium', 'high', 'critical')),
  action_required TEXT NOT NULL,
  recall_date DATE NOT NULL,
  end_date DATE,
  pushed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recalls_ean_gin ON product_recalls USING GIN(ean_codes);
CREATE INDEX IF NOT EXISTS idx_recalls_date ON product_recalls(recall_date DESC);
CREATE INDEX IF NOT EXISTS idx_recalls_unpushed ON product_recalls(pushed_at) WHERE pushed_at IS NULL;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  recall_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subs_self_all"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Helper RPC : find users to notify pour un recall donné
CREATE OR REPLACE FUNCTION find_users_to_notify_recall(
  p_ean_codes TEXT[]
) RETURNS TABLE(
  user_id UUID,
  expo_push_token TEXT,
  platform TEXT,
  scanned_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sh.user_id,
    ps.expo_push_token,
    ps.platform,
    COUNT(*) AS scanned_count
  FROM scan_history sh
  JOIN push_subscriptions ps ON ps.user_id = sh.user_id
  JOIN products p ON p.id = sh.product_id
  WHERE ps.enabled = TRUE
    AND ps.recall_alerts_enabled = TRUE
    AND p.barcode = ANY(p_ean_codes)
  GROUP BY sh.user_id, ps.expo_push_token, ps.platform;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON TABLE product_recalls IS 'Lot 19-I1 — Snapshot rappels DGCCRF/RappelConso. Cron quotidien backend insert + push à users impactés.';
COMMENT ON TABLE push_subscriptions IS 'Expo push tokens per user. recall_alerts_enabled = opt-out pour les anxieuses.';

SELECT 'OK: product_recalls + push_subscriptions + find_users_to_notify_recall RPC' AS status;
