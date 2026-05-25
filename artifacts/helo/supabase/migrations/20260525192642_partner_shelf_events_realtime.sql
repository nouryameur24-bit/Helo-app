-- Migration : partner_shelf_events_realtime
-- Appliquée via Supabase MCP le 2026-05-25 (task #112)
-- Version: 20260525192642

-- Vraie table partner_shelf_events (au lieu de proxy via community_submissions)
-- Sert au Mode Partenaire : la maman scanne → notif temps réel sur le téléphone partenaire
-- + historique propre pour les insights couple

CREATE TABLE IF NOT EXISTS partner_shelf_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Couple
  pregnant_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Event
  event_type TEXT NOT NULL CHECK (event_type IN (
    'product_scanned',
    'product_added_to_shelf',
    'product_removed_from_shelf',
    'product_override_accepted',  -- "j'achète quand même"
    'ghost_capture_submitted',
    'chat_message_to_partner',
    'milestone_reached'           -- ex: semaine de grossesse
  )),
  -- Context
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  barcode TEXT,
  verdict TEXT,                    -- safe | caution | danger | unknown
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_shelf_events_couple
  ON partner_shelf_events(pregnant_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_shelf_events_partner
  ON partner_shelf_events(partner_user_id, created_at DESC)
  WHERE partner_user_id IS NOT NULL;

ALTER TABLE partner_shelf_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_events_pregnant_read"
  ON partner_shelf_events FOR SELECT
  USING (auth.uid() = pregnant_user_id);

CREATE POLICY "partner_events_partner_read"
  ON partner_shelf_events FOR SELECT
  USING (auth.uid() = partner_user_id);

CREATE POLICY "partner_events_pregnant_insert"
  ON partner_shelf_events FOR INSERT
  WITH CHECK (auth.uid() = pregnant_user_id);

-- Realtime : enable la publication pour Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE partner_shelf_events;

COMMENT ON TABLE partner_shelf_events IS 'Vraie table events partenaire (vs proxy community_submissions). Realtime activé.';

SELECT 'OK: partner_shelf_events + realtime publication' AS status;
