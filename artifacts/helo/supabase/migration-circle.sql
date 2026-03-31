-- Mon Cercle — Migration SQL
-- Run after schema.sql

-- ============================================================
-- CIRCLES
-- ============================================================
CREATE TABLE IF NOT EXISTS circles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL DEFAULT 'Mon Cercle',
  invite_code  CHAR(8) NOT NULL UNIQUE,
  owner_id     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circles_invite_code ON circles(invite_code);
CREATE INDEX IF NOT EXISTS idx_circles_owner_id    ON circles(owner_id);

-- ============================================================
-- CIRCLE MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS circle_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id  UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(circle_id, user_id),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_members_circle_id ON circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user_id   ON circle_members(user_id);

-- ============================================================
-- CIRCLE FEED
-- ============================================================
CREATE TABLE IF NOT EXISTS circle_feed (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id      UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL,
  first_name     TEXT NOT NULL DEFAULT '',
  type           TEXT NOT NULL CHECK (type IN ('scan', 'message')),
  product_name   TEXT,
  verdict        TEXT CHECK (verdict IN ('safe', 'caution', 'danger')),
  message_text   TEXT,
  reactions      JSONB NOT NULL DEFAULT '{}',
  user_reactions JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circle_feed_circle_id  ON circle_feed(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_feed_created_at ON circle_feed(circle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_circle_feed_user_id    ON circle_feed(user_id);

-- ============================================================
-- ENABLE REALTIME
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'circle_feed'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE circle_feed;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'circle_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE circle_members;
  END IF;
END $$;

-- ============================================================
-- APP USER ID HELPER
-- Extracts the calling app user_id from the `x-app-user-id` request header.
-- Set by the application via getAuthedClient(userId) which injects the header
-- in global.headers of the Supabase JS client.
-- ============================================================
CREATE OR REPLACE FUNCTION app_user_id() RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('request.headers', true)::json->>'x-app-user-id', '');
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- SECURE JOIN LOOKUP — bypasses RLS via SECURITY DEFINER
-- Used exclusively during the join flow: a user with the correct invite code
-- can look up the circle they intend to join, even before becoming a member.
-- Returns the circle row + current member count. Never exposes member identities
-- or feeds. The invite code acts as the secret; only holders can look up a circle.
-- ============================================================
CREATE OR REPLACE FUNCTION find_circle_by_invite_code(p_invite_code TEXT)
RETURNS TABLE (
  id             UUID,
  name           TEXT,
  invite_code    CHAR(8),
  owner_id       TEXT,
  created_at     TIMESTAMPTZ,
  member_count   BIGINT
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      c.id,
      c.name,
      c.invite_code,
      c.owner_id,
      c.created_at,
      COUNT(cm.id)::BIGINT AS member_count
    FROM circles c
    LEFT JOIN circle_members cm ON cm.circle_id = c.id
    WHERE c.invite_code = p_invite_code
    GROUP BY c.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- DB-LEVEL MEMBERSHIP LIMIT TRIGGER
-- Enforces the 8-member cap at the database layer to prevent concurrent
-- join races from exceeding the limit.
-- ============================================================
CREATE OR REPLACE FUNCTION check_circle_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM circle_members
  WHERE circle_id = NEW.circle_id;

  IF v_count >= 8 THEN
    RAISE EXCEPTION 'Circle is full (8 member limit)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_circle_member_limit ON circle_members;
CREATE TRIGGER enforce_circle_member_limit
  BEFORE INSERT ON circle_members
  FOR EACH ROW EXECUTE FUNCTION check_circle_member_limit();

-- ============================================================
-- ATOMIC REACTION TOGGLE — bypasses race conditions
-- Atomically toggles a user's reaction on a feed entry.
-- Uses JSONB path operations within a single UPDATE to avoid
-- read-modify-write races under concurrent usage.
-- ============================================================
CREATE OR REPLACE FUNCTION toggle_circle_reaction(
  p_entry_id     UUID,
  p_user_id      TEXT,
  p_emoji        TEXT
) RETURNS VOID AS $$
DECLARE
  v_previous_emoji TEXT;
  v_caller_id      TEXT;
BEGIN
  v_caller_id := app_user_id();

  -- Security: only allow the calling user to update their own reaction
  IF v_caller_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Read current reaction for this user atomically within UPDATE
  SELECT user_reactions ->> p_user_id
  INTO v_previous_emoji
  FROM circle_feed
  WHERE id = p_entry_id
    AND circle_id IN (
      SELECT circle_id FROM circle_members WHERE user_id = v_caller_id
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry not found or not a member';
  END IF;

  IF v_previous_emoji = p_emoji THEN
    -- Toggle off: remove user reaction, decrement count
    UPDATE circle_feed
    SET
      user_reactions = user_reactions - p_user_id,
      reactions = CASE
        WHEN (reactions->p_emoji)::int <= 1 THEN reactions - p_emoji
        ELSE jsonb_set(reactions, ARRAY[p_emoji], to_jsonb((reactions->p_emoji)::int - 1))
      END
    WHERE id = p_entry_id;
  ELSE
    -- Toggle on (and remove previous if any)
    UPDATE circle_feed
    SET
      user_reactions = jsonb_set(
        user_reactions,
        ARRAY[p_user_id],
        to_jsonb(p_emoji)
      ),
      reactions = CASE
        WHEN v_previous_emoji IS NOT NULL AND (reactions->v_previous_emoji)::int <= 1
          THEN jsonb_set(reactions - v_previous_emoji, ARRAY[p_emoji], to_jsonb(COALESCE((reactions->p_emoji)::int, 0) + 1))
        WHEN v_previous_emoji IS NOT NULL
          THEN jsonb_set(
            jsonb_set(reactions, ARRAY[v_previous_emoji], to_jsonb((reactions->v_previous_emoji)::int - 1)),
            ARRAY[p_emoji], to_jsonb(COALESCE((reactions->p_emoji)::int, 0) + 1)
          )
        ELSE jsonb_set(reactions, ARRAY[p_emoji], to_jsonb(COALESCE((reactions->p_emoji)::int, 0) + 1))
      END
    WHERE id = p_entry_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE circles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_feed    ENABLE ROW LEVEL SECURITY;

-- ── circles ──────────────────────────────────────────────────
-- SELECT: only the owner or existing members can read a circle.
-- The join flow uses find_circle_by_invite_code() (SECURITY DEFINER)
-- to look up by invite code without requiring prior membership.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circles' AND policyname = 'circle_member_select') THEN
    CREATE POLICY circle_member_select ON circles
      FOR SELECT TO anon
      USING (
        owner_id = app_user_id()
        OR id IN (
          SELECT circle_id FROM circle_members WHERE user_id = app_user_id()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circles' AND policyname = 'circle_owner_insert') THEN
    CREATE POLICY circle_owner_insert ON circles
      FOR INSERT TO anon
      WITH CHECK (owner_id = app_user_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circles' AND policyname = 'circle_owner_delete') THEN
    CREATE POLICY circle_owner_delete ON circles
      FOR DELETE TO anon
      USING (owner_id = app_user_id());
  END IF;
END $$;

-- ── circle_members ────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circle_members' AND policyname = 'circle_members_select') THEN
    CREATE POLICY circle_members_select ON circle_members
      FOR SELECT TO anon
      USING (
        circle_id IN (
          SELECT circle_id FROM circle_members WHERE user_id = app_user_id()
        )
        OR user_id = app_user_id()
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circle_members' AND policyname = 'circle_members_insert') THEN
    CREATE POLICY circle_members_insert ON circle_members
      FOR INSERT TO anon
      WITH CHECK (user_id = app_user_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circle_members' AND policyname = 'circle_members_delete') THEN
    CREATE POLICY circle_members_delete ON circle_members
      FOR DELETE TO anon
      USING (
        user_id = app_user_id()
        OR circle_id IN (
          SELECT id FROM circles WHERE owner_id = app_user_id()
        )
      );
  END IF;
END $$;

-- ── circle_feed ───────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circle_feed' AND policyname = 'circle_feed_select') THEN
    CREATE POLICY circle_feed_select ON circle_feed
      FOR SELECT TO anon
      USING (
        circle_id IN (
          SELECT circle_id FROM circle_members WHERE user_id = app_user_id()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circle_feed' AND policyname = 'circle_feed_insert') THEN
    CREATE POLICY circle_feed_insert ON circle_feed
      FOR INSERT TO anon
      WITH CHECK (
        user_id = app_user_id()
        AND circle_id IN (
          SELECT circle_id FROM circle_members WHERE user_id = app_user_id()
        )
      );
  END IF;

  -- UPDATE on feed is handled exclusively via toggle_circle_reaction() RPC (SECURITY DEFINER).
  -- Direct UPDATE from anon clients is disallowed.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circle_feed' AND policyname = 'circle_feed_no_direct_update') THEN
    CREATE POLICY circle_feed_no_direct_update ON circle_feed
      FOR UPDATE TO anon
      USING (false);
  END IF;
END $$;
