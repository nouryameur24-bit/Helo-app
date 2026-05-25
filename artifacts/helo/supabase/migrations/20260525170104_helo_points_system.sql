-- Migration : helo_points_system
-- Appliquée via Supabase MCP le 2026-05-25 (task #107)
-- Version: 20260525170104

-- Lot 19-? — Hēlo Points : système de récompenses Ghost Capture gamifié
-- Design verrouillé 25/05/2026 :
--   Photo INCI = 25 pts (le gros), face = 8, barcode = 5, nom = 5, marque = 7
--   Bonus +30 si TOUT rempli (all-or-nothing)
--   Multiplicateur ×2 si 1ère contributrice du barcode
--   Cap 300 pts/jour anti-farming

-- ─── 1. user_points : balance + lifetime stats par user ───
CREATE TABLE IF NOT EXISTS user_points (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 0,
  lifetime_earned INT NOT NULL DEFAULT 0,
  lifetime_spent INT NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','mama_founder')),
  streak_days INT NOT NULL DEFAULT 0,
  last_scan_date DATE,
  contributions_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_points_self_read"
  ON user_points FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_points_tier ON user_points(tier);
CREATE INDEX IF NOT EXISTS idx_user_points_balance ON user_points(balance DESC);

COMMENT ON TABLE user_points IS 'Balance Hēlo Points par user. Updated via RPC award_points/redeem_reward (atomique).';
COMMENT ON COLUMN user_points.tier IS 'Bronze 0-500, Silver 500-2000, Gold 2000-5000, Mama Founder 5000+';

-- ─── 2. point_transactions : ledger transparent ───
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,                   -- positif = gain, négatif = dépense
  reason TEXT NOT NULL,                  -- 'scan_new_barcode', 'photo_ingredients', 'bonus_complete', 'first_contributor_bonus', 'redeem_premium_week'...
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  metadata JSONB,                        -- ex: {"barcode": "...", "step": "ingredients_photo", "multiplier": 2}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "point_transactions_self_read"
  ON point_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user_date
  ON point_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_reason
  ON point_transactions(reason);
CREATE INDEX IF NOT EXISTS idx_point_transactions_product
  ON point_transactions(product_id) WHERE product_id IS NOT NULL;

-- ─── 3. rewards_catalog : catalogue des récompenses ───
CREATE TABLE IF NOT EXISTS rewards_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cost INT NOT NULL CHECK (cost > 0),
  category TEXT NOT NULL CHECK (category IN ('virtual','gift_card','physical','emotional','premium')),
  image_url TEXT,
  fulfillment_type TEXT NOT NULL CHECK (fulfillment_type IN ('auto_premium','gift_card_code','physical_ship','unlock_feature','virtual_only')),
  fulfillment_data JSONB,                -- ex: {"premium_duration_days": 7}
  stock INT,                             -- null = illimité
  sort_order INT DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rewards_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rewards_catalog_public_read"
  ON rewards_catalog FOR SELECT USING (active = true);

CREATE INDEX IF NOT EXISTS idx_rewards_catalog_active_sort
  ON rewards_catalog(active, sort_order) WHERE active = true;

-- ─── 4. point_redemptions : historique des dépenses ───
CREATE TABLE IF NOT EXISTS point_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards_catalog(id),
  cost INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','fulfilled','cancelled','failed')),
  fulfillment_code TEXT,                 -- code carte cadeau si applicable
  fulfillment_data JSONB,                -- détails (email envoyé, expiry, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ
);

ALTER TABLE point_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "point_redemptions_self_read"
  ON point_redemptions FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_point_redemptions_user_date
  ON point_redemptions(user_id, created_at DESC);

-- ─── 5. RPC award_points : ajout atomique + anti-spam ───
CREATE OR REPLACE FUNCTION award_points(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_product_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS TABLE(
  new_balance INT,
  new_lifetime INT,
  capped BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_today_earned INT;
  v_daily_cap INT := 300;
  v_amount_to_award INT;
  v_was_capped BOOLEAN := false;
  v_existing_for_barcode INT;
  v_new_balance INT;
  v_new_lifetime INT;
BEGIN
  -- Anti-fraud : 1 barcode = 1 award max par user pour chaque étape (reason)
  -- (sauf 'streak_bonus' qui se déclenche quotidiennement)
  IF p_product_id IS NOT NULL AND p_reason != 'streak_bonus' THEN
    SELECT COUNT(*) INTO v_existing_for_barcode
    FROM point_transactions
    WHERE user_id = p_user_id
      AND product_id = p_product_id
      AND reason = p_reason;
    IF v_existing_for_barcode > 0 THEN
      -- Déjà récompensé pour cette action sur ce produit, no-op
      SELECT balance, lifetime_earned INTO v_new_balance, v_new_lifetime
      FROM user_points WHERE user_id = p_user_id;
      RETURN QUERY SELECT
        COALESCE(v_new_balance, 0),
        COALESCE(v_new_lifetime, 0),
        false,
        'already_awarded'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Cap journalier 300 pts (anti-farming)
  SELECT COALESCE(SUM(amount), 0) INTO v_today_earned
  FROM point_transactions
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '24 hours'
    AND amount > 0;

  IF v_today_earned + p_amount > v_daily_cap THEN
    v_amount_to_award := GREATEST(0, v_daily_cap - v_today_earned);
    v_was_capped := true;
    IF v_amount_to_award = 0 THEN
      SELECT balance, lifetime_earned INTO v_new_balance, v_new_lifetime
      FROM user_points WHERE user_id = p_user_id;
      RETURN QUERY SELECT
        COALESCE(v_new_balance, 0),
        COALESCE(v_new_lifetime, 0),
        true,
        'daily_cap_reached'::TEXT;
      RETURN;
    END IF;
  ELSE
    v_amount_to_award := p_amount;
  END IF;

  -- Upsert user_points
  INSERT INTO user_points (user_id, balance, lifetime_earned, contributions_count, last_scan_date)
  VALUES (p_user_id, v_amount_to_award, v_amount_to_award,
          CASE WHEN p_reason LIKE 'scan%' OR p_reason LIKE 'photo%' OR p_reason = 'bonus_complete' THEN 1 ELSE 0 END,
          CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_points.balance + v_amount_to_award,
    lifetime_earned = user_points.lifetime_earned + v_amount_to_award,
    contributions_count = user_points.contributions_count +
      CASE WHEN p_reason LIKE 'scan%' OR p_reason LIKE 'photo%' OR p_reason = 'bonus_complete' THEN 1 ELSE 0 END,
    last_scan_date = CURRENT_DATE,
    updated_at = NOW(),
    -- Tier upgrade auto
    tier = CASE
      WHEN user_points.lifetime_earned + v_amount_to_award >= 5000 THEN 'mama_founder'
      WHEN user_points.lifetime_earned + v_amount_to_award >= 2000 THEN 'gold'
      WHEN user_points.lifetime_earned + v_amount_to_award >= 500 THEN 'silver'
      ELSE 'bronze'
    END
  RETURNING balance, lifetime_earned INTO v_new_balance, v_new_lifetime;

  -- Insert ledger
  INSERT INTO point_transactions (user_id, amount, reason, product_id, metadata)
  VALUES (p_user_id, v_amount_to_award, p_reason, p_product_id, p_metadata);

  RETURN QUERY SELECT v_new_balance, v_new_lifetime, v_was_capped,
    CASE WHEN v_was_capped THEN 'awarded_partial'::TEXT ELSE 'awarded_full'::TEXT END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 6. RPC redeem_reward : dépense atomique ───
-- NOTE: cette version est superseded par 20260525171727_helo_points_fulfillment_v2.sql
-- (auto-fulfillment Premium + Badge Founder). Conservé ici pour historique.
CREATE OR REPLACE FUNCTION redeem_reward(
  p_user_id UUID,
  p_reward_slug TEXT
) RETURNS TABLE(
  redemption_id UUID,
  new_balance INT,
  reward_name TEXT,
  message TEXT
) AS $$
DECLARE
  v_reward RECORD;
  v_current_balance INT;
  v_redemption_id UUID;
  v_new_balance INT;
BEGIN
  SELECT id, name, cost, fulfillment_type, fulfillment_data, stock
  INTO v_reward FROM rewards_catalog
  WHERE slug = p_reward_slug AND active = true;

  IF v_reward.id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 0::INT, ''::TEXT, 'reward_not_found'::TEXT;
    RETURN;
  END IF;

  IF v_reward.stock IS NOT NULL AND v_reward.stock <= 0 THEN
    RETURN QUERY SELECT NULL::UUID, 0::INT, v_reward.name, 'out_of_stock'::TEXT;
    RETURN;
  END IF;

  SELECT balance INTO v_current_balance
  FROM user_points WHERE user_id = p_user_id FOR UPDATE;

  IF v_current_balance IS NULL OR v_current_balance < v_reward.cost THEN
    RETURN QUERY SELECT
      NULL::UUID, COALESCE(v_current_balance, 0), v_reward.name, 'insufficient_balance'::TEXT;
    RETURN;
  END IF;

  UPDATE user_points
  SET balance = balance - v_reward.cost,
      lifetime_spent = lifetime_spent + v_reward.cost,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO point_transactions (user_id, amount, reason, metadata)
  VALUES (p_user_id, -v_reward.cost, 'redeem_' || p_reward_slug,
          jsonb_build_object('reward_id', v_reward.id, 'reward_name', v_reward.name));

  INSERT INTO point_redemptions (user_id, reward_id, cost, status)
  VALUES (p_user_id, v_reward.id, v_reward.cost, 'pending')
  RETURNING id INTO v_redemption_id;

  IF v_reward.stock IS NOT NULL THEN
    UPDATE rewards_catalog SET stock = stock - 1 WHERE id = v_reward.id;
  END IF;

  RETURN QUERY SELECT v_redemption_id, v_new_balance, v_reward.name, 'redeemed'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 7. Seed du catalogue Phase 1 (récompenses virtuelles gratuites) ───
-- NOTE: catalogue rééquilibré dans 20260525171727_helo_points_fulfillment_v2.sql
INSERT INTO rewards_catalog (slug, name, description, cost, category, fulfillment_type, fulfillment_data, sort_order, image_url) VALUES
  ('theme_rose', 'Theme Rose Exclusif',
   'Personnalise ton app avec un thème rose poudré exclusif.',
   50, 'virtual', 'unlock_feature', '{"unlock_key":"theme_rose"}'::JSONB, 10, NULL),
  ('theme_lavender', 'Theme Lavande',
   'Tons doux et apaisants. Réservé aux contributrices.',
   50, 'virtual', 'unlock_feature', '{"unlock_key":"theme_lavender"}'::JSONB, 11, NULL),
  ('sticker_founder', 'Sticker Mama Founder + Badge',
   'Badge spécial visible sur ton profil — tu fais partie des 100 premières mamas.',
   100, 'virtual', 'unlock_feature', '{"unlock_key":"badge_founder"}'::JSONB, 20, NULL),
  ('chat_boost_20', '+20 messages Sage-Femme IA',
   '20 messages supplémentaires avec la sage-femme IA, valable 7 jours.',
   150, 'virtual', 'unlock_feature', '{"unlock_key":"chat_extra","quota":20,"ttl_days":7}'::JSONB, 30, NULL),
  ('premium_1week', '1 semaine Premium offerte',
   'Débloque toutes les features Premium pendant 7 jours gratuits.',
   300, 'premium', 'auto_premium', '{"premium_duration_days":7}'::JSONB, 40, NULL),
  ('premium_1month', '1 mois Premium offert',
   'Premium gratuit pendant 30 jours. Tu économises 6€.',
   800, 'premium', 'auto_premium', '{"premium_duration_days":30}'::JSONB, 50, NULL),
  ('premium_6months', '6 mois Premium offerts',
   'Premium gratuit pendant 6 mois. Tu économises 30€.',
   2500, 'premium', 'auto_premium', '{"premium_duration_days":180}'::JSONB, 60, NULL),
  ('premium_1year', '1 an Premium offert',
   'Premium gratuit pendant 1 an. Tu économises 60€.',
   5000, 'premium', 'auto_premium', '{"premium_duration_days":365}'::JSONB, 70, NULL)
ON CONFLICT (slug) DO NOTHING;

-- ─── 8. Vue dashboard pour debug / metrics ───
CREATE OR REPLACE VIEW v_points_leaderboard AS
SELECT
  up.user_id,
  up.balance,
  up.lifetime_earned,
  up.lifetime_spent,
  up.tier,
  up.contributions_count,
  up.streak_days,
  ROW_NUMBER() OVER (ORDER BY up.lifetime_earned DESC) AS rank
FROM user_points up
ORDER BY up.lifetime_earned DESC;

COMMENT ON VIEW v_points_leaderboard IS 'Leaderboard interne pour debug + future feature publique top contributeurs.';

-- Verification
SELECT 'OK schema + 8 rewards seeded' AS status,
  (SELECT COUNT(*) FROM rewards_catalog WHERE active) AS rewards_count;
