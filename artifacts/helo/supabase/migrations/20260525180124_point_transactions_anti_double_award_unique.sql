-- Migration : point_transactions_anti_double_award_unique
-- Appliquée via Supabase MCP le 2026-05-25 (audit task #109)
-- Version: 20260525180124

-- FIX 7 : Anti-double-award race condition
-- Avant : RPC award_points faisait SELECT COUNT(*) puis INSERT (2 requêtes, race possible)
-- Après : contrainte unique partial index sur (user_id, product_id, reason) où product_id NOT NULL
-- Le SELECT COUNT(*) du RPC reste en garde-fou + cette contrainte garantit l'atomicité

-- product_id NULL = système ne deduplique pas (streak_bonus etc.)
-- product_id NOT NULL = exactement 1 award par (user, produit, raison)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_point_transactions_user_product_reason
  ON point_transactions(user_id, product_id, reason)
  WHERE product_id IS NOT NULL;

SELECT 'OK: unique partial index on point_transactions (anti-double-award)' AS status;
