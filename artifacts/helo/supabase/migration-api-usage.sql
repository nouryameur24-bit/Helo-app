-- ═══════════════════════════════════════════════════════════════════
-- Hēlo — API Usage tracking (rate limiting)
-- Apply with: supabase db push
-- ═══════════════════════════════════════════════════════════════════
--
-- Tracks per-user calls to expensive Edge Functions (chat, ocr) so we can
-- enforce daily quotas and prevent API key abuse / runaway billing.
--
-- Writes ONLY come from edge functions using the service_role key.
-- No client-side policy is granted on purpose.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS api_usage (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  endpoint    TEXT NOT NULL CHECK (endpoint IN ('chat', 'ocr')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_endpoint_date
  ON api_usage(user_id, endpoint, created_at DESC);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: only service_role bypasses RLS.
-- Edge functions use SUPABASE_SERVICE_ROLE_KEY to insert + count.

-- ============================================================
-- ATOMIC QUOTA CONSUMPTION
-- Serializes concurrent rate-limit checks per (user, endpoint) via a
-- transaction-scoped advisory lock, then counts within the same transaction
-- and inserts if under quota. Returns TRUE if quota consumed, FALSE if denied.
--
-- Without the advisory lock, concurrent burst requests from the same user
-- could all read the count BEFORE any insert lands, exceeding the cap (TOCTOU).
-- ============================================================
CREATE OR REPLACE FUNCTION consume_api_quota(
  p_user_id   TEXT,
  p_endpoint  TEXT,
  p_limit     INT
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  -- Serialize per-user-per-endpoint for the duration of this transaction.
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id || ':' || p_endpoint));

  SELECT COUNT(*) INTO v_count
  FROM api_usage
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at >= NOW() - INTERVAL '24 hours';

  IF v_count >= p_limit THEN
    RETURN FALSE;
  END IF;

  INSERT INTO api_usage(user_id, endpoint) VALUES (p_user_id, p_endpoint);
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION consume_api_quota(TEXT, TEXT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_api_quota(TEXT, TEXT, INT) TO service_role;
