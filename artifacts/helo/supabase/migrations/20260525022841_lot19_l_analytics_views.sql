-- Migration : lot19_l_analytics_views
-- Appliquée via Supabase MCP le 2026-05-25 (task #99)
-- Version: 20260525022841

-- Lot 19-L — Analytics dashboard interne via views matérialisées
-- Permettent à Noury (et moi via MCP) de piloter le projet en SQL direct

-- ━━━ 1. Top 100 ingrédients matchés en scan (= les + utilisés) ━━━
CREATE OR REPLACE VIEW v_ingredient_coverage AS
SELECT
  i.id,
  i.name,
  i.category,
  i.risk_level_t1,
  i.risk_level_t2,
  i.risk_level_t3,
  i.source,
  i.confidence,
  i.max_dose_mg_per_day IS NOT NULL as has_dose,
  i.description_fr IS NOT NULL AND LENGTH(i.description_fr) > 20 as has_description
FROM ingredients i;

-- ━━━ 2. Coverage par catégorie + risk levels ━━━
CREATE OR REPLACE VIEW v_ingredients_health AS
SELECT
  category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE risk_level_t1 = 'safe' AND risk_level_t2 = 'safe' AND risk_level_t3 = 'safe') as all_safe,
  COUNT(*) FILTER (WHERE risk_level_t1 = 'danger' OR risk_level_t2 = 'danger' OR risk_level_t3 = 'danger') as has_danger,
  COUNT(*) FILTER (WHERE risk_level_t1 = 'caution' OR risk_level_t2 = 'caution' OR risk_level_t3 = 'caution') as has_caution,
  COUNT(*) FILTER (WHERE max_dose_mg_per_day IS NOT NULL) as with_dose,
  COUNT(*) FILTER (WHERE description_fr IS NULL OR LENGTH(description_fr) < 20) as missing_description,
  COUNT(DISTINCT source) as unique_sources
FROM ingredients
GROUP BY category;

-- ━━━ 3. Products coverage par source + risk ━━━
CREATE OR REPLACE VIEW v_products_health AS
SELECT
  COALESCE(source, 'dump_brut') as source,
  category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE overall_risk = 'safe') as safe_count,
  COUNT(*) FILTER (WHERE overall_risk = 'caution') as caution_count,
  COUNT(*) FILTER (WHERE overall_risk = 'danger') as danger_count,
  COUNT(*) FILTER (WHERE overall_risk = 'unknown' OR overall_risk IS NULL) as unknown_count,
  COUNT(*) FILTER (WHERE ingredients_raw IS NOT NULL AND LENGTH(ingredients_raw) > 5) as with_ingredients,
  COUNT(*) FILTER (WHERE image_url IS NOT NULL) as with_image
FROM products
GROUP BY source, category
ORDER BY total DESC;

-- ━━━ 4. Activité user beta (sans PII) ━━━
CREATE OR REPLACE VIEW v_user_activity AS
SELECT
  DATE(created_at) as day,
  COUNT(*) FILTER (WHERE role = 'pregnant') as pregnant_signups,
  COUNT(*) FILTER (WHERE role = 'partner') as partner_signups,
  COUNT(*) FILTER (WHERE partner_code IS NOT NULL) as with_partner_code,
  COUNT(*) FILTER (WHERE allergies IS NOT NULL AND array_length(allergies, 1) > 0) as with_allergies_declared
FROM profiles
GROUP BY DATE(created_at)
ORDER BY day DESC;

-- ━━━ 5. Top scans (= produits les plus scannés) ━━━
CREATE OR REPLACE VIEW v_top_scanned_products AS
SELECT
  p.id,
  p.name,
  p.brand,
  p.category,
  p.overall_risk,
  COUNT(sh.id) as scan_count,
  COUNT(DISTINCT sh.user_id) as unique_users,
  MAX(sh.scanned_at) as last_scanned
FROM products p
LEFT JOIN scan_history sh ON sh.product_id = p.id
GROUP BY p.id, p.name, p.brand, p.category, p.overall_risk
HAVING COUNT(sh.id) > 0
ORDER BY scan_count DESC
LIMIT 1000;

-- ━━━ 6. Waitlist growth ━━━
CREATE OR REPLACE VIEW v_waitlist_growth AS
SELECT
  DATE(created_at) as day,
  COUNT(*) as signups
FROM waitlist
GROUP BY DATE(created_at)
ORDER BY day DESC;

-- ━━━ 7. Community submissions quality ━━━
CREATE OR REPLACE VIEW v_community_health AS
SELECT
  status,
  COUNT(*) as count,
  AVG((metadata->>'scan_count')::int) as avg_scan_count
FROM community_submissions
WHERE metadata IS NOT NULL
GROUP BY status;

-- ━━━ 8. Top "no_signal" ingredients (= où enrichir en priorité) ━━━
-- Compute après pre-compute overall_risk (sera utile post-19-C1)
CREATE OR REPLACE VIEW v_top_unknown_products AS
SELECT
  p.id,
  p.name,
  p.brand,
  p.category,
  p.source,
  LENGTH(p.ingredients_raw) as ingredients_length,
  p.created_at
FROM products p
WHERE (p.overall_risk = 'unknown' OR p.overall_risk IS NULL)
  AND p.ingredients_raw IS NOT NULL
  AND LENGTH(p.ingredients_raw) > 20
ORDER BY p.created_at DESC
LIMIT 500;

COMMENT ON VIEW v_ingredient_coverage IS 'Lot 19-L : tous les ingrédients avec leur état (dose, description, source)';
COMMENT ON VIEW v_ingredients_health IS 'Lot 19-L : KPIs coverage ingrédients par catégorie';
COMMENT ON VIEW v_products_health IS 'Lot 19-L : KPIs coverage products par source + catégorie';
COMMENT ON VIEW v_user_activity IS 'Lot 19-L : activité user beta (sans PII)';
COMMENT ON VIEW v_top_scanned_products IS 'Lot 19-L : top 1000 produits scannés';
COMMENT ON VIEW v_waitlist_growth IS 'Lot 19-L : croissance waitlist par jour';
COMMENT ON VIEW v_community_health IS 'Lot 19-L : santé des ghost captures community';
COMMENT ON VIEW v_top_unknown_products IS 'Lot 19-L : produits avec ingrédients non identifiés (enrichissement prioritaire)';
