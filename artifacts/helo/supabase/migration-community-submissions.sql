-- Migration: community submissions feature
-- Run after schema.sql
--
-- This migration:
--   1. Ensures the community_submissions table has the full schema (idempotent)
--   2. Applies RLS policies for community_submissions
--   3. Provisions the community-products storage bucket and its storage policies
--
-- NOTE: The Hēlo app uses anonymous user IDs (text UUIDs stored in AsyncStorage),
-- not Supabase Auth. All queries use the anon key without an auth session.
-- RLS policies therefore use the `anon` role rather than auth.uid().

-- ============================================================
-- COMMUNITY SUBMISSIONS (idempotent column additions)
-- ============================================================
CREATE TABLE IF NOT EXISTS community_submissions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               TEXT NOT NULL,
  barcode               TEXT NOT NULL,
  name                  TEXT NOT NULL,
  brand                 TEXT NOT NULL DEFAULT '',
  category              TEXT NOT NULL CHECK (category IN ('cosmetic', 'food', 'medication')),
  product_photo_url     TEXT NOT NULL,
  ingredients_photo_url TEXT,
  status                TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_submissions_user_id ON community_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_community_submissions_status  ON community_submissions(status);
CREATE INDEX IF NOT EXISTS idx_community_submissions_barcode ON community_submissions(barcode);

-- ============================================================
-- RLS POLICIES FOR community_submissions
-- ============================================================
-- Enable RLS
ALTER TABLE community_submissions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public (anon) can SELECT rows where status = 'approved'
--   Used by: community feed screen to display approved products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'community_submissions'
      AND policyname = 'community_submissions anon read approved'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "community_submissions anon read approved"
        ON community_submissions
        FOR SELECT
        TO anon
        USING (status = 'approved')
    $policy$;
  END IF;
END $$;

-- Policy 2: Anon can INSERT new submissions, but only with status = 'pending'
--   Used by: submit-product screen to add new community contributions
--   Enforcing status='pending' prevents any client from injecting approved rows,
--   preserving the moderation requirement (team review before appearing in public feed).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'community_submissions'
      AND policyname = 'community_submissions anon insert pending only'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "community_submissions anon insert pending only"
        ON community_submissions
        FOR INSERT
        TO anon
        WITH CHECK (status = 'pending')
    $policy$;
  END IF;
END $$;

-- Note on "read own contributions" (profile contribution count):
--   The Hēlo app uses anonymous user IDs (client-generated UUIDs, not Supabase Auth).
--   Because there is no server-side auth session, RLS cannot safely enforce ownership
--   (auth.uid() is always null for anon queries). The profile contribution count query
--   filters by user_id in the app layer (.eq('user_id', userId)) and only counts
--   approved rows, which are already publicly readable via policy 1 above.
--   No additional SELECT policy is needed — the approved-only policy covers this use case.

-- ============================================================
-- STORAGE: community-products bucket
-- ============================================================
-- Provision the bucket (idempotent via ON CONFLICT).
-- This requires the Supabase `storage` schema to be available.
-- If running in a Supabase project, this executes in the default postgres role
-- which has access to the storage schema.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-products',
  'community-products',
  true,
  10485760,  -- 10 MB limit per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Policy 1: Public read — anyone can view community product photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'community-products public read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "community-products public read"
        ON storage.objects
        FOR SELECT
        TO anon, authenticated
        USING (bucket_id = 'community-products')
    $policy$;
  END IF;
END $$;

-- Storage Policy 2: Anon upload — app users (anon key) can upload product photos
--   Files must be uploaded under a path starting with the user's own user_id.
--   Path format: {user_id}/{timestamp}_{type}.jpg
--   We validate bucket_id only (user_id scoping is enforced by the app, not SQL,
--   since there is no auth session to derive auth.uid() from).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'community-products anon upload'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "community-products anon upload"
        ON storage.objects
        FOR INSERT
        TO anon
        WITH CHECK (bucket_id = 'community-products')
    $policy$;
  END IF;
END $$;
