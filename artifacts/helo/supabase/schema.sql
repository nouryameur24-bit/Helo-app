-- Hēlo Database Schema
-- Run this before seed files

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- INGREDIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS ingredients (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                     TEXT NOT NULL,
  name_inci                TEXT NOT NULL,
  synonyms                 TEXT[] DEFAULT '{}',
  category                 TEXT NOT NULL CHECK (category IN ('cosmetic', 'food', 'medication')),
  risk_level_t1            TEXT NOT NULL CHECK (risk_level_t1 IN ('danger', 'caution', 'safe', 'unknown')),
  risk_level_t2            TEXT NOT NULL CHECK (risk_level_t2 IN ('danger', 'caution', 'safe', 'unknown')),
  risk_level_t3            TEXT NOT NULL CHECK (risk_level_t3 IN ('danger', 'caution', 'safe', 'unknown')),
  risk_level_breastfeeding TEXT NOT NULL CHECK (risk_level_breastfeeding IN ('danger', 'caution', 'safe', 'unknown')),
  description_fr           TEXT NOT NULL,
  source                   TEXT NOT NULL,
  source_url               TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingredients_name_inci ON ingredients(name_inci);
CREATE INDEX IF NOT EXISTS idx_ingredients_category   ON ingredients(category);
CREATE INDEX IF NOT EXISTS idx_ingredients_synonyms   ON ingredients USING GIN(synonyms);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  brand             TEXT NOT NULL,
  category          TEXT NOT NULL CHECK (category IN ('cosmetic', 'food', 'medication')),
  barcode           TEXT UNIQUE,
  description_fr    TEXT,
  ingredient_ids    UUID[] DEFAULT '{}',
  overall_risk      TEXT NOT NULL CHECK (overall_risk IN ('danger', 'caution', 'safe', 'unknown')) DEFAULT 'unknown',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_barcode  ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_ing_ids  ON products USING GIN(ingredient_ids);

-- ============================================================
-- SCAN HISTORY (future use)
-- ============================================================
CREATE TABLE IF NOT EXISTS scan_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       TEXT NOT NULL,
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  scanned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trimester     INT CHECK (trimester IN (1, 2, 3))
);

CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON scan_history(user_id);
