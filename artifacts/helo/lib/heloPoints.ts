/**
 * lib/heloPoints.ts — Système Hēlo Points (gamification Ghost Capture).
 *
 * Design verrouillé 25/05/2026 :
 *   Photo INCI = 25 pts (le gros), face = 8, barcode = 5, nom = 5, marque = 7
 *   Bonus +30 si TOUT rempli (all-or-nothing)
 *   Multiplicateur ×2 si 1ère contributrice du barcode
 *   Cap 300 pts/jour anti-farming
 *
 * Côté DB : tables user_points / point_transactions / rewards_catalog /
 * point_redemptions + RPC `award_points` (atomique, anti-spam) et
 * `redeem_reward` (atomique avec lock).
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// ─── Constantes (les valeurs MUST match côté serveur si on les check) ────────
export const POINTS = {
  SCAN_NEW_BARCODE: 5,
  PHOTO_FRONT: 8,
  PHOTO_INGREDIENTS: 25, // ← LE GROS
  NAME_FILLED: 5,
  BRAND_FILLED: 7,
  BONUS_COMPLETE: 30, // si TOUT rempli (all-or-nothing)
  FIRST_CONTRIBUTOR_MULTIPLIER: 2,
  DAILY_CAP: 300,
} as const;

// Étapes du Ghost Capture (pour la mini-quest UI)
export type GhostStepReason =
  | 'scan_new_barcode'
  | 'photo_front'
  | 'photo_ingredients'
  | 'name_filled'
  | 'brand_filled'
  | 'bonus_complete'
  | 'first_contributor_bonus';

export interface UserPointsBalance {
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
  tier: 'bronze' | 'silver' | 'gold' | 'mama_founder';
  streak_days: number;
  contributions_count: number;
}

export interface PointTransaction {
  id: string;
  amount: number;
  reason: string;
  product_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Reward {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cost: number;
  category: 'virtual' | 'gift_card' | 'physical' | 'emotional' | 'premium';
  image_url: string | null;
  fulfillment_type: string;
  fulfillment_data: Record<string, unknown> | null;
  stock: number | null;
}

export interface AwardResult {
  awarded: number;
  newBalance: number;
  newLifetime: number;
  capped: boolean;
  message: 'awarded_full' | 'awarded_partial' | 'daily_cap_reached' | 'already_awarded';
}

// ─── Award points (appelé après chaque étape Ghost Capture) ──────────────────

export async function awardPoints(params: {
  userId: string;
  amount: number;
  reason: GhostStepReason | string;
  productId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<AwardResult | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase.rpc('award_points', {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_reason: params.reason,
    p_product_id: params.productId ?? null,
    p_metadata: params.metadata ?? null,
  });

  if (error) {
    if (__DEV__) console.warn('[heloPoints] award_points error:', error.message);
    return null;
  }

  // RPC returns a table with 1 row
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    awarded: params.amount, // optimistic, le serveur peut capper
    newBalance: row.new_balance ?? 0,
    newLifetime: row.new_lifetime ?? 0,
    capped: Boolean(row.capped),
    message: row.message ?? 'awarded_full',
  };
}

// ─── Get balance / stats ─────────────────────────────────────────────────────

export async function getUserPoints(userId: string): Promise<UserPointsBalance | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('user_points')
    .select('balance, lifetime_earned, lifetime_spent, tier, streak_days, contributions_count')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (__DEV__) console.warn('[heloPoints] getUserPoints error:', error.message);
    return null;
  }
  if (!data) {
    // User n'a pas encore de balance (jamais contribué) → return 0 default
    return {
      balance: 0,
      lifetime_earned: 0,
      lifetime_spent: 0,
      tier: 'bronze',
      streak_days: 0,
      contributions_count: 0,
    };
  }
  return data as UserPointsBalance;
}

// ─── Get transaction history ─────────────────────────────────────────────────

export async function getPointHistory(
  userId: string,
  limit = 50,
): Promise<PointTransaction[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('point_transactions')
    .select('id, amount, reason, product_id, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (__DEV__) console.warn('[heloPoints] getPointHistory error:', error.message);
    return [];
  }
  return (data ?? []) as PointTransaction[];
}

// ─── Get rewards catalog (publique) ──────────────────────────────────────────

export async function getRewardsCatalog(): Promise<Reward[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('rewards_catalog')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    if (__DEV__) console.warn('[heloPoints] getRewardsCatalog error:', error.message);
    return [];
  }
  return (data ?? []) as Reward[];
}

// ─── Redeem reward ───────────────────────────────────────────────────────────

export interface RedeemResult {
  redemptionId: string | null;
  newBalance: number;
  rewardName: string;
  status: 'redeemed' | 'insufficient_balance' | 'out_of_stock' | 'reward_not_found';
}

export async function redeemReward(params: {
  userId: string;
  rewardSlug: string;
}): Promise<RedeemResult | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase.rpc('redeem_reward', {
    p_user_id: params.userId,
    p_reward_slug: params.rewardSlug,
  });

  if (error) {
    if (__DEV__) console.warn('[heloPoints] redeem_reward error:', error.message);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    redemptionId: row.redemption_id,
    newBalance: row.new_balance ?? 0,
    rewardName: row.reward_name ?? '',
    status: row.message as RedeemResult['status'],
  };
}

// ─── Helper : check if first contributor for a barcode ───────────────────────
// Utilisé pour appliquer le multiplicateur ×2 côté backend Ghost Capture.

export async function isFirstContributor(barcode: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { data, error } = await supabase
    .from('products')
    .select('id, source')
    .eq('barcode', barcode)
    .maybeSingle();

  if (error || !data) return true; // produit pas en DB du tout → premier contributeur
  // Si déjà en DB via OFF/OBF/curated → pas premier. Si community → check si quelqu'un a déjà contribué
  return false;
}

// ─── Helper : tier display ───────────────────────────────────────────────────

export function tierLabel(tier: UserPointsBalance['tier']): string {
  switch (tier) {
    case 'bronze': return 'Bronze';
    case 'silver': return 'Argent';
    case 'gold': return 'Or';
    case 'mama_founder': return 'Mama Founder';
  }
}

export function tierEmoji(tier: UserPointsBalance['tier']): string {
  switch (tier) {
    case 'bronze': return '🥉';
    case 'silver': return '🥈';
    case 'gold': return '🥇';
    case 'mama_founder': return '👑';
  }
}

export function tierThreshold(tier: UserPointsBalance['tier']): number {
  switch (tier) {
    case 'bronze': return 0;
    case 'silver': return 500;
    case 'gold': return 2000;
    case 'mama_founder': return 5000;
  }
}

export function nextTierThreshold(currentLifetime: number): { next: UserPointsBalance['tier']; remaining: number } | null {
  if (currentLifetime < 500) return { next: 'silver', remaining: 500 - currentLifetime };
  if (currentLifetime < 2000) return { next: 'gold', remaining: 2000 - currentLifetime };
  if (currentLifetime < 5000) return { next: 'mama_founder', remaining: 5000 - currentLifetime };
  return null; // déjà mama_founder
}

// ─── Helper : reason display ─────────────────────────────────────────────────

export function reasonLabel(reason: string): string {
  switch (reason) {
    case 'scan_new_barcode': return 'Code-barres nouveau';
    case 'photo_front': return 'Photo de la face';
    case 'photo_ingredients': return 'Photo des ingrédients';
    case 'name_filled': return 'Nom du produit';
    case 'brand_filled': return 'Marque';
    case 'bonus_complete': return '🎁 Bonus contribution complète';
    case 'first_contributor_bonus': return '✨ Première contributrice';
    case 'streak_bonus': return 'Streak quotidien';
    default:
      if (reason.startsWith('redeem_')) {
        return '🎁 Récompense échangée';
      }
      return reason;
  }
}
