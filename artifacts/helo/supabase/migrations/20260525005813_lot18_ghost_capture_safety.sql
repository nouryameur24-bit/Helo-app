-- ─── Lot 18-02 + 18-03 — Ghost Capture safety hardening ────────────────────────
--
-- À EXÉCUTER UNE SEULE FOIS dans l'éditeur SQL Supabase.
--
-- Contenu :
--   1. Threshold auto-verify : 3 → 5 scans (réduit le risque qu'un OCR
--      garbage soit promu "community_verified" par 3 mauvais scans)
--   2. Rate limit per-user : 1 ghost capture / barcode / 24h pour éviter
--      le spam d'un même user qui scanne 100× le même produit
--
-- Idempotent : CREATE OR REPLACE FUNCTION → safe à re-run.

BEGIN;

-- ─── Drop old function signature (RPC arg list changes) ──────────────────────
DROP FUNCTION IF EXISTS ghost_capture_upsert(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT);

-- ─── Recreate avec p_user_id en argument + check rate limit + threshold 5 ───
CREATE OR REPLACE FUNCTION ghost_capture_upsert(
  p_barcode      TEXT,
  p_product_name TEXT,
  p_category     TEXT,
  p_ocr_text     TEXT,
  p_ai_verdict   JSONB,
  p_trimester    TEXT,
  p_user_id      TEXT DEFAULT NULL  -- Lot 18-03 : pour rate limit per-user
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scan_count INTEGER;
  v_last_contributor TEXT;
  v_last_scanned TIMESTAMPTZ;
  v_recent_submission BOOLEAN := FALSE;
BEGIN
  -- ── Lot 18-03 : Rate limit per-user ────────────────────────────────────
  -- Si le même user_id a déjà contribué pour ce barcode dans les 24h,
  -- on no-op (retourne le scan_count actuel sans incrémenter).
  -- Évite qu'un user enthousiaste rescanne 50× le même produit.
  IF p_user_id IS NOT NULL THEN
    SELECT
      (metadata->>'scan_count')::INT,
      metadata->'recent_contributors'->>p_user_id
    INTO
      v_scan_count, v_last_contributor
    FROM community_submissions
    WHERE barcode = p_barcode
      AND status IN ('auto_captured', 'community_verified')
    LIMIT 1;

    IF v_last_contributor IS NOT NULL THEN
      v_last_scanned := v_last_contributor::TIMESTAMPTZ;
      IF v_last_scanned > NOW() - INTERVAL '24 hours' THEN
        -- Submitter récent → no-op, on retourne le compte courant
        RETURN COALESCE(v_scan_count, 1);
      END IF;
    END IF;
  END IF;

  -- ── Insert ou increment ──────────────────────────────────────────────────
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
                                  'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
       'recent_contributors',
         CASE WHEN p_user_id IS NOT NULL
           THEN jsonb_build_object(p_user_id, to_char(NOW() AT TIME ZONE 'UTC',
                                                     'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
           ELSE '{}'::jsonb
         END
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
                  )
               || CASE WHEN p_user_id IS NOT NULL
                       THEN jsonb_build_object(
                              'recent_contributors',
                              COALESCE(community_submissions.metadata->'recent_contributors',
                                       '{}'::jsonb)
                              || jsonb_build_object(p_user_id, to_char(NOW() AT TIME ZONE 'UTC',
                                                                       'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
                            )
                       ELSE '{}'::jsonb
                  END,
    -- ── Lot 18-02 : Threshold 3 → 5 ──────────────────────────────────────
    -- Avant : 3 mauvais OCR pouvaient promote un produit en "verified"
    --         → safety risk (faux verdict figé en DB).
    -- Maintenant : il faut 5 scans cohérents pour valider.
    -- Une étape suivante (post-beta) ajoutera un check de cohérence sur
    -- le verdict (les 5 doivent avoir le même verdict).
    status = CASE
      WHEN COALESCE((community_submissions.metadata->>'scan_count')::INT, 1) + 1 >= 5
        THEN 'community_verified'
      ELSE community_submissions.status
    END
  RETURNING COALESCE((metadata->>'scan_count')::INT, 1) INTO v_scan_count;

  RETURN v_scan_count;
END;
$$;

-- Re-grant execute to anon role
GRANT EXECUTE ON FUNCTION ghost_capture_upsert(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO anon;

COMMIT;

-- ─── Vérification post-migration ────────────────────────────────────────────
-- SELECT proname, pg_get_function_arguments(oid)
-- FROM pg_proc
-- WHERE proname = 'ghost_capture_upsert';
--
-- Doit retourner :
--   ghost_capture_upsert | p_barcode text, p_product_name text, p_category text,
--                          p_ocr_text text, p_ai_verdict jsonb, p_trimester text,
--                          p_user_id text DEFAULT NULL
