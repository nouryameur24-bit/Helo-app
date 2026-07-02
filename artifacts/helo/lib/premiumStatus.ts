/**
 * lib/premiumStatus.ts — Statut Premium effectif SANS hook ni réseau.
 *
 * Audit #3 fix : useScan (gate du mode hors-ligne) et useOffline (download de
 * la DB ingrédients locale) lisaient PREMIUM_KEY brut = uniquement le cache
 * RevenueCat. Une maman ayant redeem du Premium via Hēlo Points
 * (profiles.bonus_premium_until) se voyait refuser le mode hors-ligne — même
 * classe de bug que l'audit #2 fix #7 (search/prescription), deux sites
 * restants.
 *
 * Ce helper fusionne les DEUX sources depuis AsyncStorage uniquement :
 *   - STORAGE_KEYS.isPremium        (cache RevenueCat, écrit par lib/purchases)
 *   - STORAGE_KEYS.bonusPremiumUntil (cache du bonus, écrit par usePremium à
 *     chaque fetch Supabase réussi — write-through)
 *
 * Zéro réseau → utilisable dans le chemin OFFLINE (c'est le point : le check
 * du bonus doit marcher sans connexion, sinon le fix ne sert à rien).
 * Source de vérité UI : le hook usePremium (qui réconcilie avec RC + Supabase).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/lib/storageKeys';

export async function getEffectivePremium(): Promise<boolean> {
  try {
    const [rc, bonusRaw] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.isPremium),
      AsyncStorage.getItem(STORAGE_KEYS.bonusPremiumUntil),
    ]);
    if (rc === 'true') return true;
    if (bonusRaw) {
      const until = new Date(bonusRaw);
      return Number.isFinite(until.getTime()) && until > new Date();
    }
    return false;
  } catch {
    // Lecture AsyncStorage KO → défaut non-premium (jamais d'accès offert par erreur).
    return false;
  }
}
