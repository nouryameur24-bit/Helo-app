-- Migration : api_usage_cost_tracking
-- Appliquée via Supabase MCP le 2026-05-25 (task #105)
-- Version: 20260525150244

-- Upgrade api_usage pour tracking conso $ Claude API
ALTER TABLE api_usage
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS input_tokens INT,
  ADD COLUMN IF NOT EXISTS output_tokens INT,
  ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS request_id TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INT;

CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_model ON api_usage(model) WHERE model IS NOT NULL;

COMMENT ON COLUMN api_usage.model IS 'ex: claude-haiku-4-5, claude-sonnet-4-5, claude-opus-4-5';
COMMENT ON COLUMN api_usage.estimated_cost_usd IS 'Calculé côté api-server depuis usage tokens × pricing modèle';

-- View pratique pour dashboard dépenses
CREATE OR REPLACE VIEW v_api_costs_daily AS
SELECT
  created_at::date AS day,
  endpoint,
  model,
  COUNT(*) AS calls,
  SUM(COALESCE(input_tokens, 0)) AS input_tokens_total,
  SUM(COALESCE(output_tokens, 0)) AS output_tokens_total,
  ROUND(SUM(COALESCE(estimated_cost_usd, 0))::numeric, 4) AS cost_usd,
  ROUND(AVG(COALESCE(duration_ms, 0))::numeric, 0) AS avg_duration_ms
FROM api_usage
GROUP BY day, endpoint, model
ORDER BY day DESC, cost_usd DESC NULLS LAST;

COMMENT ON VIEW v_api_costs_daily IS 'Dashboard interne coûts Claude API. Complément de console.anthropic.com.';
