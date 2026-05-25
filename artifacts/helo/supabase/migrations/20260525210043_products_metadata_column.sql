-- Migration : products_metadata_column
-- Appliquée via Supabase MCP le 2026-05-25 (task #119)
-- Version: 20260525210043

-- Add generic metadata JSONB column for scraping/import provenance
-- (source_url, scraped_at, lot, prix, etc.)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN products.metadata IS
  'Generic metadata for scraping/import provenance : {source_url, scraped_at, cis_code, prix_euro, presentation, ...}. Différent de analysis_cache (verdict cache) et purchase_links (affiliate URLs).';

SELECT 'OK: products.metadata column added' AS status;
