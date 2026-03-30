-- Migration: Baby Mode (Mode Bébé 0-3 ans)
-- Run after schema.sql
-- Adds risk_level_baby column to ingredients and baby_product flag to scan_history

-- ============================================================
-- Add risk_level_baby to ingredients
-- ============================================================
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS risk_level_baby TEXT
    CHECK (risk_level_baby IN ('danger', 'caution', 'safe', 'unknown'));

-- ============================================================
-- Add baby_product flag to scan_history
-- ============================================================
ALTER TABLE scan_history
  ADD COLUMN IF NOT EXISTS baby_product BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_scan_history_baby ON scan_history(user_id, baby_product) WHERE baby_product = TRUE;
