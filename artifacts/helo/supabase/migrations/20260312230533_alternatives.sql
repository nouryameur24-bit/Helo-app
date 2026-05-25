-- Migration: product_alternatives
-- Run after schema.sql
-- Note: community_submissions is now managed in migration-community-submissions.sql

-- ============================================================
-- PRODUCT ALTERNATIVES
-- ============================================================
CREATE TABLE IF NOT EXISTS product_alternatives (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alternative_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category          TEXT NOT NULL CHECK (category IN ('cosmetic', 'food', 'medication')),
  price_range       TEXT NOT NULL CHECK (price_range IN ('€', '€€', '€€€')) DEFAULT '€€',
  popularity_count  INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, alternative_id)
);

CREATE INDEX IF NOT EXISTS idx_alt_product_id ON product_alternatives(product_id);
CREATE INDEX IF NOT EXISTS idx_alt_alternative_id ON product_alternatives(alternative_id);
CREATE INDEX IF NOT EXISTS idx_alt_category ON product_alternatives(category);

ALTER TABLE product_alternatives DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- SEED: illustrative alternative mappings
-- ============================================================

-- Huile Prodigieuse (caution) → Crème Soft (safe), Gel Lavant Bébé (safe), Sensibio H2O (safe)
INSERT INTO product_alternatives (product_id, alternative_id, category, price_range, popularity_count)
VALUES
(
  (SELECT id FROM products WHERE barcode = '3264680009168'),
  (SELECT id FROM products WHERE barcode = '4005808222919'),
  'cosmetic', '€', 312
),
(
  (SELECT id FROM products WHERE barcode = '3264680009168'),
  (SELECT id FROM products WHERE barcode = '3504105034046'),
  'cosmetic', '€€', 187
),
(
  (SELECT id FROM products WHERE barcode = '3264680009168'),
  (SELECT id FROM products WHERE barcode = '3401599000353'),
  'cosmetic', '€€', 245
)
ON CONFLICT (product_id, alternative_id) DO NOTHING;

-- Effaclar Gel (caution) → Crème Visage Sensitive (safe), Dove Gel Douche (safe)
INSERT INTO product_alternatives (product_id, alternative_id, category, price_range, popularity_count)
VALUES
(
  (SELECT id FROM products WHERE barcode = '3337872413446'),
  (SELECT id FROM products WHERE barcode = '3600520981306'),
  'cosmetic', '€', 156
),
(
  (SELECT id FROM products WHERE barcode = '3337872413446'),
  (SELECT id FROM products WHERE barcode = '8717163552117'),
  'cosmetic', '€', 203
)
ON CONFLICT (product_id, alternative_id) DO NOTHING;

-- Camembert au Lait Cru (danger) → Yaourt Nature (safe), Lait Pasteurisé (safe)
INSERT INTO product_alternatives (product_id, alternative_id, category, price_range, popularity_count)
VALUES
(
  (SELECT id FROM products WHERE barcode = '3228020070003'),
  (SELECT id FROM products WHERE barcode = '3033490008773'),
  'food', '€', 421
),
(
  (SELECT id FROM products WHERE barcode = '3228020070003'),
  (SELECT id FROM products WHERE barcode = '3329482001234'),
  'food', '€', 298
)
ON CONFLICT (product_id, alternative_id) DO NOTHING;

-- Saumon Fumé (caution) → Jambon Supérieur Cuit (safe), Rillettes de Porc (safe)
INSERT INTO product_alternatives (product_id, alternative_id, category, price_range, popularity_count)
VALUES
(
  (SELECT id FROM products WHERE barcode = '3057640133606'),
  (SELECT id FROM products WHERE barcode = '3297341600009'),
  'food', '€', 334
),
(
  (SELECT id FROM products WHERE barcode = '3057640133606'),
  (SELECT id FROM products WHERE barcode = '3560070976102'),
  'food', '€€', 178
)
ON CONFLICT (product_id, alternative_id) DO NOTHING;

-- Foie de Veau (danger) → Jambon Supérieur Cuit (safe), Yaourt Nature (safe), Rillettes (safe)
INSERT INTO product_alternatives (product_id, alternative_id, category, price_range, popularity_count)
VALUES
(
  (SELECT id FROM products WHERE barcode = '3302744009982'),
  (SELECT id FROM products WHERE barcode = '3297341600009'),
  'food', '€', 389
),
(
  (SELECT id FROM products WHERE barcode = '3302744009982'),
  (SELECT id FROM products WHERE barcode = '3033490008773'),
  'food', '€', 267
),
(
  (SELECT id FROM products WHERE barcode = '3302744009982'),
  (SELECT id FROM products WHERE barcode = '3560070976102'),
  'food', '€€', 145
)
ON CONFLICT (product_id, alternative_id) DO NOTHING;
