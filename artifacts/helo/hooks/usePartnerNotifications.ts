/**
 * hooks/usePartnerNotifications.ts — Notifications locales pour le mode
 * partenaire en temps réel.
 *
 * v4 Lot 13. Combine `usePartnerRealtime` (Lot 11) avec `expo-notifications`
 * pour déclencher une notification système immédiate quand le partenaire
 * scanne un produit pour l'enceinte.
 *
 * Limitation : ce hook ne fait que des notifications LOCALES — elles ne
 * fonctionnent que si l'app est ouverte ou en background (pas si elle est
 * tuée par l'OS). Pour du vrai push notifications cross-device (app fermée),
 * il faudrait :
 *   1. Enregistrer un push token Expo via Notifications.getExpoPushTokenAsync()
 *   2. Stocker le token dans une table `partner_push_tokens` Supabase
 *   3. Une Edge Function Supabase qui écoute sur INSERT community_submissions
 *      et envoie via Expo Push API au token de l'autre partenaire
 *
 * À faire dans une session dédiée — pour cette V1, les notifications locales
 * couvrent le cas d'usage le plus courant (utilisatrices avec l'app ouverte).
 */
import { useCallback, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';

import { usePartnerRealtime, type PartnerScanEvent } from '@/hooks/usePartnerRealtime';

// Configuration : à appeler une seule fois au boot de l'app (idéalement dans
// _layout.tsx). On le met ici pour que le hook soit autonome — si déjà appelé
// ailleurs, c'est un no-op idempotent.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    severity: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

interface UsePartnerNotificationsOptions {
  /** ID Supabase du partenaire qu'on écoute. */
  partnerUserId: string | null;
  /** Prénom du partenaire (ex: "Thomas") pour personnaliser la notif. */
  partnerFirstName?: string;
  /** Désactive l'écoute. */
  enabled?: boolean;
}

export function usePartnerNotifications({
  partnerUserId,
  partnerFirstName,
  enabled = true,
}: UsePartnerNotificationsOptions) {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  // Demande la permission au mount. Si déjà accordée, le call est silencieux.
  // On NE FORCE PAS l'utilisateur — si elle refuse, le hook continue à
  // marcher pour le Realtime (toast in-app) mais pas pour les notifs système.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const current = await Notifications.getPermissionsAsync();
        if (current.granted) {
          if (!cancelled) setPermissionGranted(true);
          return;
        }
        if (current.canAskAgain) {
          const ask = await Notifications.requestPermissionsAsync();
          if (!cancelled) setPermissionGranted(ask.granted);
        } else {
          if (!cancelled) setPermissionGranted(false);
        }
      } catch {
        if (!cancelled) setPermissionGranted(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Callback qui déclenche la notif locale à chaque event partenaire.
  const onPartnerScan = useCallback(
    (event: PartnerScanEvent) => {
      if (!permissionGranted) return; // permission absente → skip notif

      const senderName = partnerFirstName?.trim() || 'Votre partenaire';
      const productLabel = [event.product_brand, event.product_name]
        .filter(Boolean)
        .join(' — ') || 'un produit';

      // Notif immédiate (trigger: null). Pas de scheduled — c'est en temps réel.
      Notifications.scheduleNotificationAsync({
        content: {
          title: `💛 ${senderName} a scanné pour toi`,
          body: productLabel,
          data: {
            type: 'partner_scan',
            barcode: event.product_barcode ?? null,
            scanned_at: event.scanned_at,
          },
          sound: 'default',
        },
        trigger: null,
      }).catch(() => {
        // Best effort — pas de crash si la notif ne part pas
      });
    },
    [permissionGranted, partnerFirstName],
  );

  const { lastEvent, connected } = usePartnerRealtime({
    partnerUserId,
    onPartnerScan,
    enabled,
  });

  return {
    lastEvent,
    connected,
    permissionGranted,
    /** Permet de re-demander la permission (ex: bouton settings). */
    requestPermission: async () => {
      const ask = await Notifications.requestPermissionsAsync();
      setPermissionGranted(ask.granted);
      return ask.granted;
    },
  };
}
