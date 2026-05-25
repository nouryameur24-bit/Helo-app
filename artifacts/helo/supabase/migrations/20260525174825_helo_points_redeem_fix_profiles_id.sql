-- Migration : helo_points_redeem_fix_profiles_id
-- Appliquée via Supabase MCP le 2026-05-25 (task #108 audit fix)
-- Version: 20260525174825

-- BUG FIX : profiles.id (pas user_id) — corrige redeem_reward RPC
-- Avant : UPDATE profiles SET ... WHERE user_id = p_user_id → silently failed
--   (la colonne profiles.id IS l'auth.users.id directement)
-- Après : UPDATE profiles ... WHERE id = p_user_id → fonctionne réellement

DROP FUNCTION IF EXISTS redeem_reward(UUID, TEXT);

CREATE FUNCTION redeem_reward(
  p_user_id UUID,
  p_reward_slug TEXT
) RETURNS TABLE(
  redemption_id UUID,
  new_balance INT,
  reward_name TEXT,
  message TEXT,
  fulfillment_info JSONB
) AS $$
DECLARE
  v_reward RECORD;
  v_current_balance INT;
  v_redemption_id UUID;
  v_new_balance INT;
  v_premium_days INT;
  v_new_premium_until TIMESTAMPTZ;
  v_fulfillment_info JSONB := '{}'::JSONB;
BEGIN
  SELECT id, name, cost, fulfillment_type, fulfillment_data, stock
  INTO v_reward FROM rewards_catalog
  WHERE slug = p_reward_slug AND active = true;

  IF v_reward.id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 0::INT, ''::TEXT, 'reward_not_found'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  IF v_reward.stock IS NOT NULL AND v_reward.stock <= 0 THEN
    RETURN QUERY SELECT NULL::UUID, 0::INT, v_reward.name, 'out_of_stock'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  SELECT balance INTO v_current_balance
  FROM user_points WHERE user_id = p_user_id FOR UPDATE;

  IF v_current_balance IS NULL OR v_current_balance < v_reward.cost THEN
    RETURN QUERY SELECT
      NULL::UUID, COALESCE(v_current_balance, 0), v_reward.name, 'insufficient_balance'::TEXT, NULL::JSONB;
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

  -- AUTO PREMIUM : update profiles WHERE id = p_user_id (PAS user_id, ce sont les auth users directement)
  IF v_reward.fulfillment_type = 'auto_premium' THEN
    v_premium_days := COALESCE((v_reward.fulfillment_data->>'premium_duration_days')::INT, 7);
    UPDATE profiles
    SET bonus_premium_until = GREATEST(COALESCE(bonus_premium_until, NOW()), NOW())
                              + (v_premium_days || ' days')::INTERVAL
    WHERE id = p_user_id  -- 🔧 FIX: profiles.id, pas user_id
    RETURNING bonus_premium_until INTO v_new_premium_until;
    v_fulfillment_info := jsonb_build_object(
      'premium_until', v_new_premium_until,
      'days_added', v_premium_days
    );
  END IF;

  -- BADGE MAMA FOUNDER
  IF v_reward.fulfillment_type = 'unlock_feature'
     AND (v_reward.fulfillment_data->>'unlock_key') = 'badge_founder' THEN
    UPDATE profiles
    SET is_founder = TRUE,
        founder_unlocked_at = COALESCE(founder_unlocked_at, NOW())
    WHERE id = p_user_id;  -- 🔧 FIX: profiles.id, pas user_id
    v_fulfillment_info := jsonb_build_object('badge_unlocked', 'mama_founder');
  END IF;

  INSERT INTO point_redemptions (
    user_id, reward_id, cost, status, fulfillment_data, fulfilled_at
  )
  VALUES (
    p_user_id, v_reward.id, v_reward.cost,
    CASE
      WHEN v_reward.fulfillment_type IN ('auto_premium', 'unlock_feature') THEN 'fulfilled'
      ELSE 'pending'
    END,
    v_fulfillment_info,
    CASE
      WHEN v_reward.fulfillment_type IN ('auto_premium', 'unlock_feature') THEN NOW()
      ELSE NULL
    END
  )
  RETURNING id INTO v_redemption_id;

  IF v_reward.stock IS NOT NULL THEN
    UPDATE rewards_catalog SET stock = stock - 1 WHERE id = v_reward.id;
  END IF;

  RETURN QUERY SELECT v_redemption_id, v_new_balance, v_reward.name, 'redeemed'::TEXT, v_fulfillment_info;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'OK: redeem_reward fixed to use profiles.id' AS status;
