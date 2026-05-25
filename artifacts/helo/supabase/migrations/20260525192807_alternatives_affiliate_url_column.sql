-- Migration : alternatives_affiliate_url_column
-- Appliquée via Supabase MCP le 2026-05-25 (task #112, Lot 19-G1)
-- Version: 20260525192807

-- Lot 19-G1 — Affiliate links sur alternatives
-- Aujourd'hui : 957 alternatives en place, 0 affiliate
-- Demain : Monoprix Drive / Amazon / Bébé9 / Pharma Express via affiliate_url
--         + click tracking pour mesurer conversion

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS purchase_links JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN products.purchase_links IS
  'Lot 19-G1 : URLs marchand affiliate-ready. Schema : {"amazon": "https://...", "monoprix": "https://...", "bebe9": "https://...", "pharma_express": "https://..."}. Backend api-server complète automatiquement la query string ?tag=helo-fr-21';

-- Click tracking pour analytics conversion
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  source_product_id UUID REFERENCES products(id) ON DELETE SET NULL,  -- d'où vient le clic (alternative)
  merchant TEXT NOT NULL,           -- 'amazon' | 'monoprix' | 'bebe9' | 'pharma_express'
  url TEXT NOT NULL,                 -- URL complète cliquée (avec tag affiliate)
  context TEXT,                      -- 'alternative_card' | 'product_detail' | 'recall_replacement'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_user ON affiliate_clicks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_merchant ON affiliate_clicks(merchant, created_at DESC);

ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliate_clicks_self_insert"
  ON affiliate_clicks FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- View revenue tracking
CREATE OR REPLACE VIEW v_affiliate_revenue AS
SELECT
  DATE(created_at) AS day,
  merchant,
  COUNT(*) AS clicks,
  COUNT(DISTINCT user_id) AS unique_users
FROM affiliate_clicks
GROUP BY DATE(created_at), merchant
ORDER BY day DESC, clicks DESC;

COMMENT ON VIEW v_affiliate_revenue IS 'Lot 19-G1 — Dashboard clics affiliate par jour/marchand. Conversion réelle = à corréler avec rapports merchant.';

SELECT 'OK: products.purchase_links + affiliate_clicks + v_affiliate_revenue' AS status;
