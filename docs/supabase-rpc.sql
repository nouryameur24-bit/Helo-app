-- ────────────────────────────────────────────────────────────────────────────
-- Hēlo — RPC Postgres atomiques pour Supabase
--
-- À DÉPLOYER MANUELLEMENT depuis le SQL Editor du dashboard Supabase
-- (https://supabase.com/dashboard/project/<your-project>/sql/new) puis valider
-- avec `SELECT * FROM pg_proc WHERE proname IN ('merge_analysis_cache');`.
--
-- ────────────────────────────────────────────────────────────────────────────

-- ─── 1. merge_analysis_cache ────────────────────────────────────────────────
--
-- Contexte : le handler /api/scan stocke ses verdicts dans la colonne JSONB
-- `products.analysis_cache` sous une clé `tX_vN` (ex: "t2_v4"). Le pattern
-- actuel côté Node est un read-modify-write :
--
--   1. SELECT analysis_cache FROM products WHERE barcode = ?
--   2. const newCache = { ...cache, [phaseKey]: payload }
--   3. UPDATE products SET analysis_cache = newCache WHERE barcode = ?
--
-- Race condition : si 2 scans concurrents du même barcode tombent entre (1)
-- et (3), l'un des deux écrasera l'autre. En prod, c'est typiquement le scan
-- coûteux (AI fallback ~3-5s) qui se fait écraser par le scan déterministe
-- ~50ms — on perd l'analyse premium pour rien.
--
-- Cette fonction fait le merge côté Postgres en une seule transaction
-- atomique. Aucune perte d'écriture, même sous forte concurrence.
--
-- Usage côté Node :
--   await supabaseAdmin.rpc('merge_analysis_cache', {
--     p_barcode: '3046920022620',
--     p_phase_key: 't2_v4',
--     p_payload: { status: 'autorise', glow_score: 95, ... },
--   });

CREATE OR REPLACE FUNCTION public.merge_analysis_cache(
  p_barcode TEXT,
  p_phase_key TEXT,
  p_payload JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- jsonb_set avec create_missing=true → crée la clé si absente, sinon merge.
  -- Le `||` opérateur jsonb ne suffirait pas car on veut une mise à jour de
  -- la clé spécifique sans écraser les autres phases déjà cachées.
  UPDATE public.products
  SET analysis_cache = jsonb_set(
    COALESCE(analysis_cache, '{}'::jsonb),
    ARRAY[p_phase_key],
    p_payload,
    TRUE
  )
  WHERE barcode = p_barcode;
END;
$$;

-- ─── 2. upsert_product_keep_cache ───────────────────────────────────────────
--
-- Contexte : le pipeline `scripts/src/ingredients-pipeline/insert.ts` upsert
-- les produits avec `ignoreDuplicates: true` (insert.ts:161). Conséquence :
-- si OFF corrige le `ingredients_text_fr` d'un produit qu'on a déjà en base
-- (typo corrigée, nouveau snapshot OFF, etc.), le re-parse rate l'insertion
-- silencieusement → on garde le verdict obsolète indéfiniment.
--
-- Solution : upsert qui rafraîchit name/brand/ingredients_raw/categories
-- MAIS préserve analysis_cache (sauf si la colonne `ingredients_raw` change,
-- auquel cas on l'efface puisqu'elle est devenue invalide).
--
-- Usage côté Node (à appeler depuis insert.ts pour insertProducts) :
--   await client.rpc('upsert_product_keep_cache', {
--     p_barcode, p_name, p_brand, p_ingredients_raw, p_category, p_image_url
--   });

CREATE OR REPLACE FUNCTION public.upsert_product_keep_cache(
  p_barcode TEXT,
  p_name TEXT,
  p_brand TEXT,
  p_ingredients_raw TEXT,
  p_category TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.products (barcode, name, brand, ingredients_raw, category, image_url, analysis_cache)
  VALUES (p_barcode, p_name, p_brand, p_ingredients_raw, p_category, p_image_url, '{}'::jsonb)
  ON CONFLICT (barcode) DO UPDATE
    SET name = EXCLUDED.name,
        brand = EXCLUDED.brand,
        category = COALESCE(EXCLUDED.category, products.category),
        image_url = COALESCE(EXCLUDED.image_url, products.image_url),
        -- Si ingredients_raw a vraiment changé, on efface l'analysis_cache
        -- (les verdicts précédents sont basés sur l'ancien texte).
        ingredients_raw = EXCLUDED.ingredients_raw,
        analysis_cache = CASE
          WHEN products.ingredients_raw IS DISTINCT FROM EXCLUDED.ingredients_raw
            THEN '{}'::jsonb
          ELSE products.analysis_cache
        END;
END;
$$;

-- ─── Validation rapide ──────────────────────────────────────────────────────
-- Après exécution dans le SQL editor, vérifier :
--
--   SELECT proname, pronargs FROM pg_proc
--   WHERE proname IN ('merge_analysis_cache', 'upsert_product_keep_cache');
--
-- Devrait retourner 2 lignes (3 et 6 args respectivement).

-- ─── Permissions ────────────────────────────────────────────────────────────
-- Les fonctions sont SECURITY DEFINER → s'exécutent avec les privilèges
-- du créateur (postgres role). Pas besoin de GRANT supplémentaire si le
-- code Node utilise déjà la service_role key (`SUPABASE_SERVICE_ROLE_KEY`).
-- Si l'app mobile devait les appeler directement (déconseillé), exécuter :
--   GRANT EXECUTE ON FUNCTION public.merge_analysis_cache TO authenticated;
