-- ────────────────────────────────────────────────────────────────────────────
-- RLS HARDENING — suppression des policies fourre-tout `qual=true` (audit #3+)
--
-- 🔴 FAILLE CONFIRMÉE EN PROD (02/07/2026, accès Management API live) :
-- Des policies héritées `USING (true)` / `WITH CHECK (true)` en `cmd=ALL`
-- sur le rôle `public` coexistaient avec les policies `*_owner` correctes.
-- En RLS PostgreSQL, les policies PERMISSIVES se combinent en OR :
--     (user_id = auth.uid())  OR  true   =   true
-- → les policies owner étaient totalement neutralisées.
--
-- Preuve (clé anon publique, non authentifiée, extractible du bundle mobile) :
--   • profiles          → 49 lignes lisibles  (allergies, trimestre, due date,
--                          medical_conditions = données de santé RGPD)
--   • scan_history      → 5 lignes lisibles   (historique produits scannés)
--   • ingredients       → INSERT/UPDATE public → EMPOISONNEMENT possible des
--                          verdicts safety (passer un ingrédient danger→safe
--                          pour TOUTES les utilisatrices)
--   • product_alternatives / profiles / shopping_list / partner_links / pacts
--     → écriture publique ouverte.
--
-- Ce fix DROP les policies permissives et s'appuie sur les policies owner déjà
-- présentes (vérifiées live). Là où il manquait un filet (product_alternatives
-- lecture, community update, delete profil, pacts, partner update), on crée la
-- policy de remplacement minimale.
--
-- SÛRETÉ :
--   • Le mobile crée une session anonyme (signInAnonymously) → auth.uid() défini
--     → les policies owner fonctionnent pour les vraies utilisatrices.
--   • Le backend api-server utilise la service_role_key → BYPASS RLS complet
--     → aucune écriture serveur (scan, cache, recalls, points) n'est impactée.
--   • products/ingredients gardent leur SELECT public (catalogue = donnée
--     publique, sans PII) ; seule l'ÉCRITURE publique est retirée.
--
-- Idempotent : DROP POLICY IF EXISTS + CREATE POLICY (re-jouable sans erreur…
--   sauf CREATE si déjà présent — on DROP IF EXISTS juste avant chaque CREATE).
-- ────────────────────────────────────────────────────────────────────────────

-- ─── profiles (données de santé) ────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_all" ON public.profiles;
-- select/insert/update owner existent déjà. Il manquait DELETE (utilisé par le
-- "supprimer mon compte" GDPR) → on l'ajoute, borné à l'owner.
DROP POLICY IF EXISTS "profiles_delete_owner" ON public.profiles;
CREATE POLICY "profiles_delete_owner" ON public.profiles
  FOR DELETE USING (id = auth.uid());

-- ─── scan_history (historique de scans) ─────────────────────────────────────
DROP POLICY IF EXISTS "scans_all" ON public.scan_history;
DROP POLICY IF EXISTS "Scan history par user" ON public.scan_history;
-- select/insert/update/delete owner (user_id = auth.uid()::text) existent déjà.

-- ─── shopping_list ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "shopping_all" ON public.shopping_list;
DROP POLICY IF EXISTS "Shopping list par user" ON public.shopping_list;
-- CRUD owner existent déjà.

-- ─── partner_links ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "partners_all" ON public.partner_links;
-- select/insert/delete participant existent. On ajoute UPDATE participant
-- (statut du lien) au cas où, borné aux deux participants.
DROP POLICY IF EXISTS "partner_links_update_participant" ON public.partner_links;
CREATE POLICY "partner_links_update_participant" ON public.partner_links
  FOR UPDATE USING (
    pregnant_user_id = auth.uid() OR partner_user_id = auth.uid()
  );

-- ─── ingredients (SAFETY — anti-empoisonnement) ─────────────────────────────
-- On RETIRE l'écriture publique (le backend écrit via service_role). On GARDE
-- la lecture publique (le mobile télécharge le dictionnaire).
DROP POLICY IF EXISTS "Allow insert ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Allow update ingredients" ON public.ingredients;

-- ─── product_alternatives (catalogue, lu par le mobile) ─────────────────────
DROP POLICY IF EXISTS "alternatives_all" ON public.product_alternatives;
DROP POLICY IF EXISTS "product_alternatives_select_public" ON public.product_alternatives;
CREATE POLICY "product_alternatives_select_public" ON public.product_alternatives
  FOR SELECT USING (true); -- pas de PII, écriture réservée au service_role

-- ─── community_submissions ──────────────────────────────────────────────────
-- On retire le ALL public. On garde : anon read ghost, select approved,
-- insert authenticated. On ajoute UPDATE authenticated pour le fallback
-- client-side de ghostCaptureSave (incrément scan_count) quand le RPC
-- SECURITY DEFINER n'est pas dispo. Les submissions communautaires sont
-- partagées par design (pas owner-based).
DROP POLICY IF EXISTS "submissions_all" ON public.community_submissions;
DROP POLICY IF EXISTS "community_submissions_update_authenticated" ON public.community_submissions;
CREATE POLICY "community_submissions_update_authenticated" ON public.community_submissions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ─── pacts / pact_witnesses (feature flag OFF, 0 ligne — durci proprement) ──
DROP POLICY IF EXISTS "pacts_all" ON public.pacts;
DROP POLICY IF EXISTS "pacts_select_owner" ON public.pacts;
DROP POLICY IF EXISTS "pacts_insert_owner" ON public.pacts;
DROP POLICY IF EXISTS "pacts_update_owner" ON public.pacts;
DROP POLICY IF EXISTS "pacts_delete_owner" ON public.pacts;
CREATE POLICY "pacts_select_owner" ON public.pacts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "pacts_insert_owner" ON public.pacts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "pacts_update_owner" ON public.pacts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "pacts_delete_owner" ON public.pacts FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "pact_witnesses_all" ON public.pact_witnesses;
DROP POLICY IF EXISTS "pact_witnesses_select_participant" ON public.pact_witnesses;
DROP POLICY IF EXISTS "pact_witnesses_insert_participant" ON public.pact_witnesses;
DROP POLICY IF EXISTS "pact_witnesses_delete_participant" ON public.pact_witnesses;
-- Visible/gérable par le témoin lui-même OU par l'owner du pacte associé.
CREATE POLICY "pact_witnesses_select_participant" ON public.pact_witnesses
  FOR SELECT USING (
    witness_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.pacts p WHERE p.id = pact_id AND p.user_id = auth.uid())
  );
CREATE POLICY "pact_witnesses_insert_participant" ON public.pact_witnesses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.pacts p WHERE p.id = pact_id AND p.user_id = auth.uid())
  );
CREATE POLICY "pact_witnesses_delete_participant" ON public.pact_witnesses
  FOR DELETE USING (
    witness_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.pacts p WHERE p.id = pact_id AND p.user_id = auth.uid())
  );

-- ─── Durcissement bonus : search_path pinné sur les SECURITY DEFINER ─────────
-- Advisor : une fonction SECURITY DEFINER sans search_path fixe est vulnérable
-- au hijack via une table/fonction plantée dans un schéma que l'appelant
-- contrôle. On épingle public, pg_temp.
ALTER FUNCTION public.award_points(uuid, integer, text, uuid, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.consume_api_quota(text, text, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.ensure_profile_for_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.find_users_to_notify_recall(text[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.merge_analysis_cache(text, text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.redeem_reward(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.upsert_product_keep_cache(text, text, text, text, text, text) SET search_path = public, pg_temp;
