-- Migration : lot19_j3_profiles_user_preferences_sync
-- Appliquée via Supabase MCP le 2026-05-25 (task #96)
-- Version: 20260525022802

-- Lot 19-J3 — Sync backend des préférences user
-- Avant : allergies/dietary/cosmetic stockées UNIQUEMENT côté mobile (AsyncStorage)
-- → si désinstall = perte des préférences
-- Après : sync backend, cross-device, recovery désinstall

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS allergies TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cosmetic_sensitivities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS medical_conditions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferences_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.allergies IS
  'Lot 19-J3 : allergies déclarées (Lait, Oeuf, Arachide, Gluten, etc.). Sync depuis mobile AsyncStorage. Permet cross-device + recovery après désinstall.';

COMMENT ON COLUMN profiles.dietary_restrictions IS
  'Restrictions alimentaires (Végétarien, Halal, Casher, Sans gluten, etc.)';

COMMENT ON COLUMN profiles.cosmetic_sensitivities IS
  'Sensibilités cosmétiques déclarées (Parfum, Sulfates, Parabens, etc.)';

COMMENT ON COLUMN profiles.medical_conditions IS
  'Conditions médicales pertinentes (diabète gestationnel, HTA, lupus, asthme...). Influence verdict.';

-- Index pour performance match allergies au scan
CREATE INDEX IF NOT EXISTS idx_profiles_allergies_gin ON profiles USING GIN(allergies);
CREATE INDEX IF NOT EXISTS idx_profiles_dietary_gin ON profiles USING GIN(dietary_restrictions);

-- Trigger pour auto-update preferences_updated_at
CREATE OR REPLACE FUNCTION update_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.allergies IS DISTINCT FROM OLD.allergies
     OR NEW.dietary_restrictions IS DISTINCT FROM OLD.dietary_restrictions
     OR NEW.cosmetic_sensitivities IS DISTINCT FROM OLD.cosmetic_sensitivities
     OR NEW.medical_conditions IS DISTINCT FROM OLD.medical_conditions THEN
    NEW.preferences_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_preferences_timestamp ON profiles;
CREATE TRIGGER trg_profiles_preferences_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_preferences_timestamp();
