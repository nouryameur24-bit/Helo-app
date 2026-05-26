-- Migration : rename_scraped_sources_to_neutral
-- Appliquée via Supabase MCP le 2026-05-26 (task #121)
-- Version: 20260526010000

-- Task #121 anti-traceability : rename scraped_* sources to neutral helo_*_db_v1
-- pour ne pas exposer l'origine scraping côté DB Supabase.

-- Cosmetic scraping (pharmacy + brands)
UPDATE products
SET source = 'helo_cosmetic_db_v1'
WHERE source LIKE 'scraped_pharma%'
   OR source LIKE 'scraped_brand_%'
   OR source LIKE 'scraped_doctipharma'
   OR source LIKE 'scraped_newpharma'
   OR source LIKE 'scraped_easyparapharmacie';

-- Drive/food scraping (à venir)
UPDATE products
SET source = 'helo_food_db_v1'
WHERE source LIKE 'scraped_drive_%'
   OR source LIKE 'scraped_auchan%'
   OR source LIKE 'scraped_carrefour%'
   OR source LIKE 'scraped_monoprix%';

-- Strip source_url depuis metadata (anti-traceability)
UPDATE products
SET metadata = metadata - 'source_url'
WHERE source IN ('helo_cosmetic_db_v1', 'helo_food_db_v1', 'helo_medication_db_v1')
  AND metadata ? 'source_url';

SELECT source, COUNT(*) FROM products WHERE source LIKE 'helo_%_db_v1' GROUP BY source;
