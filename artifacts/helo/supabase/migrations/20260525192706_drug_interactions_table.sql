-- Migration : drug_interactions_table
-- Appliquée via Supabase MCP le 2026-05-25 (task #112, Tier A safety)
-- Version: 20260525192706

-- Tier A safety — Drug interactions table
-- Femmes enceintes prennent souvent : Vogalène (anti-vomi), Spasfon, anti-HTA, antiépileptiques
-- Au scan d'un nouveau médicament/cosmétique, on cross-check vs ce qu'elles prennent déjà
-- Pas dans Yuka. Différenciateur safety pur.

CREATE TABLE IF NOT EXISTS drug_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  substance_a TEXT NOT NULL,                  -- ex: 'metoclopramide' (Vogalène)
  substance_b TEXT NOT NULL,                  -- ex: 'tramadol'
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'major', 'contraindicated')),
  mechanism TEXT,                              -- ex: 'Increased serotonin syndrome risk'
  advice_fr TEXT NOT NULL,                     -- conseil clinique en français
  source TEXT NOT NULL,                        -- ex: 'CRAT', 'Theriaque', 'ANSM'
  source_url TEXT,
  pregnancy_severity TEXT CHECK (pregnancy_severity IN ('minor', 'moderate', 'major', 'contraindicated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_interaction_pair UNIQUE (substance_a, substance_b)
);

CREATE INDEX IF NOT EXISTS idx_drug_interactions_substance_a
  ON drug_interactions(LOWER(substance_a));
CREATE INDEX IF NOT EXISTS idx_drug_interactions_substance_b
  ON drug_interactions(LOWER(substance_b));
CREATE INDEX IF NOT EXISTS idx_drug_interactions_pregnancy
  ON drug_interactions(pregnancy_severity)
  WHERE pregnancy_severity IN ('major', 'contraindicated');

-- Helper RPC : trouve interactions pour un set de substances
CREATE OR REPLACE FUNCTION find_drug_interactions(
  p_substances TEXT[]
) RETURNS TABLE(
  substance_a TEXT,
  substance_b TEXT,
  severity TEXT,
  pregnancy_severity TEXT,
  advice_fr TEXT,
  source TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT di.substance_a, di.substance_b, di.severity,
         di.pregnancy_severity, di.advice_fr, di.source
  FROM drug_interactions di
  WHERE LOWER(di.substance_a) = ANY(SELECT LOWER(s) FROM unnest(p_substances) s)
     OR LOWER(di.substance_b) = ANY(SELECT LOWER(s) FROM unnest(p_substances) s)
  ORDER BY
    CASE di.pregnancy_severity
      WHEN 'contraindicated' THEN 1
      WHEN 'major' THEN 2
      WHEN 'moderate' THEN 3
      WHEN 'minor' THEN 4
      ELSE 5
    END;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION find_drug_interactions(TEXT[]) TO anon, authenticated;

-- Profile column pour stocker médicaments en cours (déclarés par user)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS current_medications TEXT[] DEFAULT '{}';

COMMENT ON COLUMN profiles.current_medications IS 'Liste des substances actives en cours de prise. Vérifiée au scan d''un nouveau médicament/cosmétique.';

SELECT 'OK: drug_interactions table + RPC + profiles.current_medications' AS status;
