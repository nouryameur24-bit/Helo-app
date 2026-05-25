-- Migration : profiles_auto_create_trigger
-- Appliquée via Supabase MCP le 2026-05-25 (audit task #108)
-- Version: 20260525174904

-- FIX CRITIQUE : 38/49 auth.users n'avaient pas de profile → backfill + trigger

-- ─── 1. Backfill : crée un profile pour chaque auth.user manquant ─────────────
INSERT INTO profiles (id, created_at, updated_at, role)
SELECT u.id, NOW(), NOW(), 'pregnant'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

-- ─── 2. Trigger auto-create profile on new signup ────────────────────────────
CREATE OR REPLACE FUNCTION ensure_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, created_at, updated_at, role)
  VALUES (NEW.id, NOW(), NOW(), 'pregnant')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_ensure_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_ensure_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_profile_for_user();

-- Verification
SELECT
  (SELECT COUNT(*) FROM auth.users) AS auth_users,
  (SELECT COUNT(*) FROM profiles) AS profiles,
  (SELECT COUNT(*) FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)) AS drift_remaining;
