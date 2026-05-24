/**
 * hooks/usePartnerRealtime.ts — Subscribe aux scans live du partenaire.
 *
 * v4 Lot 11. Quand le partenaire (Thomas) scanne un produit pour son
 * enceinte (Marie), Marie reçoit un toast/notif "Thomas vient de scanner
 * Avène Tolériane 💛" en temps réel. C'est la BRIQUE MAGIQUE de la
 * feature partenaire (différenciation produit majeure).
 *
 * Implémentation : Supabase Realtime sur la table `partner_shelf_events`
 * (à créer côté Supabase si pas déjà fait — voir TODO en bas) ou
 * sur `shelf_items` filtrée par owner_id = partner_user_id.
 *
 * Pour ce scaffolding initial : on subscribe à `community_submissions`
 * filtré par metadata.partner_pregnant_user_id = ton user_id. Pattern
 * minimaliste, à raffiner quand la table partner_shelf_events sera créée.
 */
import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { logError } from '@/lib/logger';

export interface PartnerScanEvent {
  product_name: string;
  product_brand?: string;
  product_barcode?: string | null;
  scanned_at: string;
}

interface UsePartnerRealtimeOptions {
  /** ID Supabase du partenaire qu'on écoute. */
  partnerUserId: string | null;
  /** Callback déclenché à chaque nouveau scan du partenaire. */
  onPartnerScan?: (event: PartnerScanEvent) => void;
  /** Désactive l'écoute (utile en dev / quand l'app est en arrière-plan). */
  enabled?: boolean;
}

/**
 * Subscribe au channel Realtime du partenaire. Renvoie le dernier événement
 * reçu (pour rendu inline) + un état `connected` pour debug UI.
 *
 * Sécurité : la table `community_submissions` a déjà des RLS policies anon.
 * Le filtre Realtime côté serveur évite que l'app reçoive des events qui
 * ne la concernent pas (et limite la bande passante).
 */
export function usePartnerRealtime({
  partnerUserId,
  onPartnerScan,
  enabled = true,
}: UsePartnerRealtimeOptions) {
  const [lastEvent, setLastEvent] = useState<PartnerScanEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !partnerUserId || !isSupabaseConfigured) return;

    // Unique channel name par partenaire → évite cross-contamination
    const channelName = `partner-shelf-${partnerUserId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_submissions',
          filter: `user_id=eq.${partnerUserId}`,
        },
        (payload: { new?: Record<string, unknown> }) => {
          const row = payload.new;
          if (!row) return;
          const event: PartnerScanEvent = {
            product_name: String(row.name ?? 'Produit'),
            product_brand: row.brand ? String(row.brand) : undefined,
            product_barcode: row.barcode ? String(row.barcode) : null,
            scanned_at: String(row.created_at ?? new Date().toISOString()),
          };
          setLastEvent(event);
          try {
            onPartnerScan?.(event);
          } catch (err) {
            logError('partnerRealtime.callback', err);
          }
        },
      )
      .subscribe((status: string) => {
        setConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (err) {
        logError('partnerRealtime.unsubscribe', err);
      }
      channelRef.current = null;
      setConnected(false);
    };
  }, [partnerUserId, enabled, onPartnerScan]);

  return { lastEvent, connected };
}

/* ─── TODO (suite Lot 11) ────────────────────────────────────────────────────
 *
 * Pour rendre cette feature vraiment magique, il faut côté Supabase :
 *
 *   1. Créer une table dédiée `partner_shelf_events` avec :
 *      - id uuid PK
 *      - pregnant_user_id uuid REFERENCES auth.users
 *      - partner_user_id uuid REFERENCES auth.users
 *      - product_name, product_brand, product_barcode, scanned_at
 *      - verdict ('safe' | 'caution' | 'danger')
 *
 *   2. RLS : pregnant_user voit ses events ; partner_user voit les siens.
 *
 *   3. Insert auto à chaque scan du partenaire (trigger ou côté Node).
 *
 *   4. Notifications push expo-notifications quand l'app est en background
 *      → "Thomas a scanné Avène, verdict ✓".
 *
 * Pour le scaffolding actuel, on subscribe à community_submissions ce qui
 * marche partiellement (les Ghost Captures du partenaire passent par là).
 * Migration vers la vraie table à faire avec calme.
 * ────────────────────────────────────────────────────────────────────────── */
