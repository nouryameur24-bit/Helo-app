-- ═══════════════════════════════════════════════════════════════════
-- Hēlo — Row Level Security Policies
-- Apply with: supabase db push or psql -f supabase/rls-policies.sql
-- ═══════════════════════════════════════════════════════════════════

-- ─── Enable RLS on all tables ────────────────────────────────────────────────
ALTER TABLE ingredients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history           ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list          ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;

-- ─── Ingredients (public read-only) ──────────────────────────────────────────
DROP POLICY IF EXISTS "ingredients_select_public" ON ingredients;
CREATE POLICY "ingredients_select_public"
  ON ingredients FOR SELECT
  USING (true);

-- No INSERT / UPDATE / DELETE via anon or authenticated — managed via migrations only

-- ─── Products (public read-only) ─────────────────────────────────────────────
DROP POLICY IF EXISTS "products_select_public" ON products;
CREATE POLICY "products_select_public"
  ON products FOR SELECT
  USING (true);

-- ─── Scan History (owner only) ───────────────────────────────────────────────
DROP POLICY IF EXISTS "scan_history_select_owner" ON scan_history;
CREATE POLICY "scan_history_select_owner"
  ON scan_history FOR SELECT
  USING (
    user_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "scan_history_insert_owner" ON scan_history;
CREATE POLICY "scan_history_insert_owner"
  ON scan_history FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "scan_history_update_owner" ON scan_history;
CREATE POLICY "scan_history_update_owner"
  ON scan_history FOR UPDATE
  USING (
    user_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "scan_history_delete_owner" ON scan_history;
CREATE POLICY "scan_history_delete_owner"
  ON scan_history FOR DELETE
  USING (
    user_id = auth.uid()::text
  );

-- ─── Shopping List (owner only) ──────────────────────────────────────────────
DROP POLICY IF EXISTS "shopping_list_select_owner" ON shopping_list;
CREATE POLICY "shopping_list_select_owner"
  ON shopping_list FOR SELECT
  USING (
    user_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "shopping_list_insert_owner" ON shopping_list;
CREATE POLICY "shopping_list_insert_owner"
  ON shopping_list FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "shopping_list_update_owner" ON shopping_list;
CREATE POLICY "shopping_list_update_owner"
  ON shopping_list FOR UPDATE
  USING (
    user_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "shopping_list_delete_owner" ON shopping_list;
CREATE POLICY "shopping_list_delete_owner"
  ON shopping_list FOR DELETE
  USING (
    user_id = auth.uid()::text
  );

-- ─── Community Submissions ───────────────────────────────────────────────────
-- Anyone can submit; only approved submissions are visible publicly;
-- only the submitter can delete their own pending submission.

DROP POLICY IF EXISTS "community_submissions_select_approved" ON community_submissions;
CREATE POLICY "community_submissions_select_approved"
  ON community_submissions FOR SELECT
  USING (status = 'approved');

DROP POLICY IF EXISTS "community_submissions_select_own" ON community_submissions;
CREATE POLICY "community_submissions_select_own"
  ON community_submissions FOR SELECT
  USING (
    user_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "community_submissions_insert_any" ON community_submissions;
CREATE POLICY "community_submissions_insert_any"
  ON community_submissions FOR INSERT
  WITH CHECK (true);

-- No UPDATE via app (moderation is server-side / admin only)
-- No DELETE via anon

-- ─── Profiles (owner only) ───────────────────────────────────────────────────
-- Profiles: owner can read/write own row. Linked partners can also read the
-- mother's profile (for trimester display) — enforced via partner_links lookup.
DROP POLICY IF EXISTS "profiles_select_owner" ON profiles;
CREATE POLICY "profiles_select_owner"
  ON profiles FOR SELECT
  USING (
    user_id = auth.uid()::text
    OR user_id IN (
      SELECT pregnant_user_id FROM partner_links
      WHERE partner_user_id = auth.uid()::text
    )
    OR user_id IN (
      SELECT partner_user_id FROM partner_links
      WHERE pregnant_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "profiles_insert_owner" ON profiles;
CREATE POLICY "profiles_insert_owner"
  ON profiles FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "profiles_update_owner" ON profiles;
CREATE POLICY "profiles_update_owner"
  ON profiles FOR UPDATE
  USING (
    user_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "profiles_delete_owner" ON profiles;
CREATE POLICY "profiles_delete_owner"
  ON profiles FOR DELETE
  USING (
    user_id = auth.uid()::text
  );

-- ─── Partner Links (both sides can read) ─────────────────────────────────────
-- Schema: partner_links(id, pregnant_user_id, partner_user_id, linked_at)

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'partner_links') THEN
    ALTER TABLE partner_links ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "partner_links_select_participant" ON partner_links;
    CREATE POLICY "partner_links_select_participant"
      ON partner_links FOR SELECT
      USING (
        pregnant_user_id = auth.uid()::text
        OR partner_user_id = auth.uid()::text
      );

    DROP POLICY IF EXISTS "partner_links_insert_participant" ON partner_links;
    CREATE POLICY "partner_links_insert_participant"
      ON partner_links FOR INSERT
      WITH CHECK (
        pregnant_user_id = auth.uid()::text
        OR partner_user_id = auth.uid()::text
      );

    DROP POLICY IF EXISTS "partner_links_delete_participant" ON partner_links;
    CREATE POLICY "partner_links_delete_participant"
      ON partner_links FOR DELETE
      USING (
        pregnant_user_id = auth.uid()::text
        OR partner_user_id = auth.uid()::text
      );
  END IF;
END $$;
