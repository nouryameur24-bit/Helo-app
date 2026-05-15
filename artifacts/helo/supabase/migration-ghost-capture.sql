-- Migration: ghost capture support on community_submissions
-- Run after migration-community-submissions.sql
--
-- This migration extends community_submissions to support the Ghost Capture flow:
--   1. Adds `metadata` JSONB column for OCR text + AI verdict + scan_count
--   2. Relaxes status CHECK to allow 'auto_captured' and 'community_verified'
--   3. Relaxes NOT NULL on user_id and product_photo_url for anonymous captures
--   4. Adds a partial UNIQUE index on barcode for ghost rows (prevents duplicates)
--   5. Adds RPC ghost_capture_upsert() for ATOMIC scan_count increment
--      (avoids the read-then-write race condition in client code)
--   6. Adds anon RLS policies for SELECT/INSERT/UPDATE on ghost rows

-- ============================================================
-- 1. Schema relaxation (idempotent)
-- ============================================================
ALTER TABLE community_submissions
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE community_submissions
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE community_submissions
  ALTER COLUMN product_photo_url DROP NOT NULL;

-- Replace strict status CHECK
ALTER TABLE community_submissions
  DROP CONSTRAINT IF EXISTS community_submissions_status_check;
ALTER TABLE community_submissions
  ADD CONSTRAINT community_submissions_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'auto_captured', 'community_verified'));

-- Replace strict category CHECK (allow free-form categories from ocr-review)
ALTER TABLE community_submissions
  DROP CONSTRAINT IF EXISTS community_submissions_category_check;

-- ============================================================
-- 2. Unique barcode for ghost rows (prevents duplicates from concurrent first scans)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_submissions_ghost_barcode_unique
  ON community_submissions(barcode)
  WHERE status IN ('auto_captured', 'community_verified');

-- ============================================================
-- 3. Atomic upsert RPC — eliminates the client-side race condition
-- ============================================================
-- Increments scan_count atomically using JSONB ops, auto-promotes to
-- community_verified at >= 3 scans. Returns the new scan_count.
CREATE OR REPLACE FUNCTION ghost_capture_upsert(
  p_barcode      TEXT,
  p_product_name TEXT,
  p_category     TEXT,
  p_ocr_text     TEXT,
  p_ai_verdict   JSONB,
  p_trimester    TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scan_count INTEGER;
  v_new_status TEXT;
BEGIN
  INSERT INTO community_submissions
    (user_id, barcode, name, brand, category, product_photo_url,
     ingredients_photo_url, status, metadata)
  VALUES
    (NULL, p_barcode, p_product_name, '', p_category, NULL,
     NULL, 'auto_captured',
     jsonb_build_object(
       'ingredients_raw', p_ocr_text,
       'ai_verdict',      p_ai_verdict,
       'trimester',       p_trimester,
       'scan_count',      1,
       'first_captured',  to_char(NOW() AT TIME ZONE 'UTC',
                                  'YYYY-MM-DD"T"HH24:MI:SS"Z"')
     )
    )
  ON CONFLICT (barcode) WHERE status IN ('auto_captured', 'community_verified')
  DO UPDATE SET
    metadata = community_submissions.metadata
               || jsonb_build_object(
                    'scan_count',
                    COALESCE((community_submissions.metadata->>'scan_count')::INT, 1) + 1,
                    'last_scanned',
                    to_char(NOW() AT TIME ZONE 'UTC',
                            'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                  ),
    status = CASE
      WHEN COALESCE((community_submissions.metadata->>'scan_count')::INT, 1) + 1 >= 3
        THEN 'community_verified'
      ELSE community_submissions.status
    END
  RETURNING COALESCE((metadata->>'scan_count')::INT, 1) INTO v_scan_count;

  RETURN v_scan_count;
END;
$$;

-- Grant execute to anon role (Hēlo uses anon key)
GRANT EXECUTE ON FUNCTION ghost_capture_upsert(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon;

-- ============================================================
-- 4. RLS policies for ghost capture rows
-- ============================================================
-- Allow anon to SELECT ghost-captured rows (used by checkCommunitySubmissions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'community_submissions'
      AND policyname = 'community_submissions anon read ghost'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "community_submissions anon read ghost"
        ON community_submissions
        FOR SELECT
        TO anon
        USING (status IN ('auto_captured', 'community_verified'))
    $policy$;
  END IF;
END $$;
