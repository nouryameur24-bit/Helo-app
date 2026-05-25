-- Migration : lot19_e1b_intended_use_schema
-- Appliquée via Supabase MCP le 2026-05-25 (task #100)
-- Version: 20260525145357

-- Lot 19-E1b — Schema cohérence alternatives par sous-usage

-- 1. Add intended_use + quality_score sur PRODUCTS (source of truth)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS intended_use TEXT,
  ADD COLUMN IF NOT EXISTS quality_score INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_intended_use
  ON products(intended_use)
  WHERE intended_use IS NOT NULL;

-- 2. Add intended_use sur ALTERNATIVES (cache pour fast filter)
ALTER TABLE product_alternatives
  ADD COLUMN IF NOT EXISTS intended_use TEXT,
  ADD COLUMN IF NOT EXISTS quality_score INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_alternatives_intended_use
  ON product_alternatives(product_id, intended_use)
  WHERE intended_use IS NOT NULL;

-- 3. Comment for documentation
COMMENT ON COLUMN products.intended_use IS
  'Taxonomie fermée Lot 19-E1b : sunscreen, deodorant, body_lotion, shampoo, conditioner, mascara, lipstick, perfume, face_cream, eye_cream, hand_cream, lip_balm, body_wash, soap_bar, toothpaste, mouthwash, hair_oil, face_mask, makeup_remover, nail_polish, after_shave, foundation, blush, eyeshadow, eyeliner, fragrance, hand_sanitizer, baby_lotion, baby_shampoo, baby_oil, baby_wash, baby_food, milk_dairy, yogurt, cheese, meat, fish, charcuterie, bread, cereal, snack_sweet, snack_salty, sauce_condiment, beverage_soft, beverage_alcohol, beverage_hot, soup, ready_meal, dessert, juice, water, oil_cooking, spice_herb, baby_milk_formula, supplement, etc.';
