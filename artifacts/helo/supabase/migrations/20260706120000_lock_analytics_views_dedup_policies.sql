-- ────────────────────────────────────────────────────────────────────────────
-- Check-up Supabase (06/07/2026) — verrouillage vues analytics + dédup policies
--
-- Advisor sécurité : 12 vues `v_*` étaient SECURITY DEFINER + lisibles par anon
-- → exposaient des métriques business (coûts API, tokens, croissance) ET des
-- données user (v_points_leaderboard : user_id, balance, rank). Aucune n'est
-- consommée par l'app (dashboard-only via service_role). On révoque anon/
-- authenticated + security_invoker=on. Preuve post-fix : anon → HTTP 401.
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE v text;
BEGIN
  FOR v IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind='v' AND c.relname LIKE 'v\_%'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated;', v);
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on);', v);
  END LOOP;
END $$;

-- Dédoublonnage des policies permissives redondantes (advisor
-- multiple_permissive_policies) — garde une seule SELECT-public par table.
DROP POLICY IF EXISTS "Products lisibles par tous" ON public.products;
DROP POLICY IF EXISTS "products_read" ON public.products;
DROP POLICY IF EXISTS "Ingredients lisibles par tous" ON public.ingredients;
DROP POLICY IF EXISTS "ingredients_read" ON public.ingredients;
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.waitlist;
