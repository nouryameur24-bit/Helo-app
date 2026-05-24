/**
 * lib/posthog.ts — Singleton PostHog client.
 *
 * Single source of truth for the PostHog instance used by:
 *   - PostHogProvider in app/_layout.tsx
 *   - lib/analytics.ts wrappers (track / identify / screen)
 *
 * Disabled automatically when EXPO_PUBLIC_POSTHOG_KEY is absent.
 */
import PostHog from 'posthog-react-native';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;

export const isPostHogConfigured = Boolean(apiKey) && Boolean(host);

export const posthog = new PostHog(apiKey || 'placeholder', {
  host: host || undefined,
  disabled: !isPostHogConfigured,
  captureNativeAppLifecycleEvents: true,
  flushAt: 20,
  flushInterval: 10000,
});
