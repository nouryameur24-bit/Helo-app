-- Migration : lot19_d1_pregnancy_food_tags
-- Appliquée via Supabase MCP le 2026-05-25 (task #77)
-- Version: 20260525023021

-- Lot 19-D1 — Tags pregnancy-specific sur products food
-- Permet warnings instant : listeria, toxoplasmose, mercure, caféine, alcool

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS pregnancy_risks JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN products.pregnancy_risks IS
  'Lot 19-D1 : tags risques grossesse pré-calculés. Schema : {listeria_risk: bool, toxo_risk: bool, mercury_risk: bool, alcohol_content: number, caffeine_mg: number, diabetes_concern: low|med|high}';

-- ━━━ Auto-tag via pattern matching sur name + ingredients_raw ━━━

-- LISTERIA RISK : fromages au lait cru, charcuterie cuite, poissons fumés/crus, huîtres
UPDATE products
SET pregnancy_risks = pregnancy_risks || jsonb_build_object('listeria_risk', true)
WHERE category = 'food'
  AND (
    LOWER(name) ~ '(lait cru|raw milk|au lait cru|leche cruda)' OR
    LOWER(name) ~ '(saumon fumé|smoked salmon|truite fumée|hareng fumé)' OR
    LOWER(name) ~ '(huître|oyster|tartare|carpaccio|sushi|sashimi|ceviche)' OR
    LOWER(name) ~ '(camembert|brie|munster|reblochon|époisses|maroilles|chaource|livarot|pont l)' OR
    LOWER(name) ~ '(jambon cru|prosciutto|jambon de parme|chorizo|saucisson sec|coppa|bresaola|fuet|salami)' OR
    LOWER(name) ~ '(rosette de lyon|saucisse sèche)' OR
    LOWER(ingredients_raw) ~ '(lait cru|raw milk|non pasteurisé|unpasteurized)'
  );

-- TOXOPLASMOSE RISK : viande crue, charcuterie crue, salades pré-emballées
UPDATE products
SET pregnancy_risks = pregnancy_risks || jsonb_build_object('toxo_risk', true)
WHERE category = 'food'
  AND (
    LOWER(name) ~ '(tartare|carpaccio|steak tartare|bresaola|jambon cru|salami|coppa|chorizo)' OR
    LOWER(name) ~ '(viande crue|raw meat|carne cruda)' OR
    LOWER(name) ~ '(salade en sachet|prêt à consommer|ready to eat salad)' OR
    LOWER(ingredients_raw) ~ '(viande crue|raw beef|raw pork)'
  );

-- MERCURY RISK : gros poissons prédateurs
UPDATE products
SET pregnancy_risks = pregnancy_risks || jsonb_build_object('mercury_risk', 'high')
WHERE category = 'food'
  AND (
    LOWER(name) ~ '(espadon|swordfish|requin|shark|marlin|thon rouge|atlantic bluefin)' OR
    LOWER(name) ~ '(lotte|brochet|barracuda)' OR
    LOWER(ingredients_raw) ~ '(espadon|swordfish|marlin)'
  );

UPDATE products
SET pregnancy_risks = pregnancy_risks || jsonb_build_object('mercury_risk', 'medium')
WHERE category = 'food'
  AND pregnancy_risks->>'mercury_risk' IS NULL
  AND (
    LOWER(name) ~ '(thon|tuna|albacore|maquereau royal)' OR
    LOWER(ingredients_raw) ~ '(thon|tuna|albacore)'
  );

-- ALCOHOL RISK : boissons alcoolisées
UPDATE products
SET pregnancy_risks = pregnancy_risks || jsonb_build_object('alcohol_risk', true)
WHERE category = 'food'
  AND (
    LOWER(name) ~ '(vin|wine|bière|beer|champagne|whisky|vodka|rhum|gin|cognac|liqueur|spirits|alcool)' OR
    LOWER(name) ~ '(rosé|cabernet|chardonnay|sauvignon|merlot|riesling|sancerre)' OR
    LOWER(ingredients_raw) ~ 'alcool: ?(?:\d+|>\d+)%'
  )
  AND NOT (
    LOWER(name) ~ '(sans alcool|alcohol.free|alcool 0|0%|alcohol-free)'
  );

-- CAFFEINE : produits riches en caféine
UPDATE products
SET pregnancy_risks = pregnancy_risks || jsonb_build_object('caffeine_mg_estimate', 80)
WHERE category = 'food'
  AND LOWER(name) ~ '(café|coffee|espresso|expresso)'
  AND pregnancy_risks->>'caffeine_mg_estimate' IS NULL;

UPDATE products
SET pregnancy_risks = pregnancy_risks || jsonb_build_object('caffeine_mg_estimate', 200)
WHERE category = 'food'
  AND (
    LOWER(name) ~ '(red bull|monster|energy drink|burn|rockstar|nrj)' OR
    LOWER(ingredients_raw) ~ '(guarana|caféine ajoutée)'
  )
  AND pregnancy_risks->>'caffeine_mg_estimate' IS NULL;

UPDATE products
SET pregnancy_risks = pregnancy_risks || jsonb_build_object('caffeine_mg_estimate', 40)
WHERE category = 'food'
  AND LOWER(name) ~ '(thé|tea|matcha)'
  AND NOT LOWER(name) ~ '(rooibos|herbal|infusion sans théine|tisane)'
  AND pregnancy_risks->>'caffeine_mg_estimate' IS NULL;

-- DIABETES CONCERN : produits très sucrés
UPDATE products
SET pregnancy_risks = pregnancy_risks || jsonb_build_object('diabetes_concern', 'high')
WHERE category = 'food'
  AND (
    LOWER(name) ~ '(soda|cola|coca|pepsi|fanta|sprite|orangina|schweppes|limonade)' OR
    LOWER(name) ~ '(bonbon|candy|haribo|chamallow|guimauve|chewing.?gum)' OR
    LOWER(name) ~ '(confiture|sirop d|miel)' AND LOWER(ingredients_raw) ~ 'sucre'
  );

-- ━━━ Index pour query rapide sur tags ━━━
CREATE INDEX IF NOT EXISTS idx_products_pregnancy_risks_gin ON products USING GIN(pregnancy_risks);

-- ━━━ View pour stats des tags pregnancy ━━━
CREATE OR REPLACE VIEW v_pregnancy_tags_stats AS
SELECT
  COUNT(*) FILTER (WHERE (pregnancy_risks->>'listeria_risk')::bool = true) as listeria_count,
  COUNT(*) FILTER (WHERE (pregnancy_risks->>'toxo_risk')::bool = true) as toxo_count,
  COUNT(*) FILTER (WHERE pregnancy_risks->>'mercury_risk' = 'high') as mercury_high_count,
  COUNT(*) FILTER (WHERE pregnancy_risks->>'mercury_risk' = 'medium') as mercury_medium_count,
  COUNT(*) FILTER (WHERE (pregnancy_risks->>'alcohol_risk')::bool = true) as alcohol_count,
  COUNT(*) FILTER (WHERE (pregnancy_risks->>'caffeine_mg_estimate')::int > 100) as high_caffeine_count,
  COUNT(*) FILTER (WHERE pregnancy_risks->>'diabetes_concern' = 'high') as high_sugar_count
FROM products
WHERE category = 'food';
