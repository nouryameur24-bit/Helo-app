/**
 * analytics.ts — Wrapper PostHog.
 *
 * Proxy léger autour du client singleton `lib/posthog.ts`.
 * No-op silencieux si `EXPO_PUBLIC_POSTHOG_KEY` est absente.
 */

import { posthog, isPostHogConfigured } from './posthog';

// ─── Typed event registry ─────────────────────────────────────────────────────
export type AnalyticsEvent =
  | 'app_opened'
  | 'scan_started'
  | 'scan_completed'
  | 'scan_verdict_shown'
  | 'ghost_capture_initiated'
  | 'ghost_capture_completed'
  | 'alternative_viewed'
  | 'alternative_swap_tapped'
  | 'paywall_viewed'
  | 'paywall_purchased'
  | 'paywall_dismissed'
  | 'product_added_to_shelf'
  | 'chat_message_sent'
  | 'onboarding_step_completed'
  | 'onboarding_first_scan_celebrated'
  | 'feature_discovered'
  | 'feedback_bug_tapped'
  | 'feedback_suggestion_tapped'
  | 'feedback_rate_tapped'
  | 'ghost_capture_vision_success'
  | 'points_earned'
  | 'reward_redeemed'
  | 'points_screen_viewed'
  | 'scan_partial_metadata'
  | 'partial_metadata_ghost_capture_started';

// `JsonProps` reprend le type accepté par PostHog (récursif, supporte
// arrays et objects nested) sans dépendre des exports internes du SDK.
// Cast interne via Parameters<typeof posthog.capture>[1] pour matcher
// exactement la signature SDK et laisser les call-sites passer n'importe
// quel shape JSON-serialisable.
type CaptureProps = Parameters<typeof posthog.capture>[1];
type IdentifyProps = Parameters<typeof posthog.identify>[1];
type ScreenProps = Parameters<typeof posthog.screen>[1];

/**
 * Émet un event typé. No-op silencieux si PostHog n'est pas configuré.
 */
export async function track(
  event: AnalyticsEvent,
  props?: Record<string, unknown>,
): Promise<void> {
  try {
    if (!isPostHogConfigured) return;
    posthog.capture(event, props as CaptureProps);
  } catch {
    // Analytics ne doivent JAMAIS faire crasher l'app.
  }
}

/**
 * Associe l'utilisateur courant à un distinctId stable (ex: Supabase userId).
 */
export async function identify(
  userId: string,
  props?: Record<string, unknown>,
): Promise<void> {
  try {
    if (!isPostHogConfigured) return;
    posthog.identify(userId, props as IdentifyProps);
  } catch {
    // Silent fail.
  }
}

/**
 * Enregistre une navigation d'écran.
 */
export async function screen(
  name: string,
  props?: Record<string, unknown>,
): Promise<void> {
  try {
    if (!isPostHogConfigured) return;
    posthog.screen(name, props as ScreenProps);
  } catch {
    // Silent fail.
  }
}
