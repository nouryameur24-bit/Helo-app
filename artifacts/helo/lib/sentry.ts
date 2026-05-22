/**
 * lib/sentry.ts — Sentry crash reporting bootstrap.
 *
 * `initSentry()` is invoked once at module-load time from `app/_layout.tsx`
 * (before React renders) so that early errors are captured. Sentry is
 * disabled in __DEV__ by default to preserve the free-tier quota.
 *
 * To enable Sentry in DEV (e.g. to test the integration), set
 * `EXPO_PUBLIC_SENTRY_FORCE_ENABLE=true` in `.env.local`.
 */

import * as Sentry from '@sentry/react-native';

const FALLBACK_DSN =
  'https://c6dfead7227a5fdace9cd60adf1eba27@o4511434162110464.ingest.de.sentry.io/4511434172792912';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? FALLBACK_DSN;
  const forceEnable = process.env.EXPO_PUBLIC_SENTRY_FORCE_ENABLE === 'true';

  if (!dsn) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[Sentry] DSN absent, monitoring désactivé');
    }
    return;
  }

  Sentry.init({
    dsn,
    enabled: !__DEV__ || forceEnable,
    debug: __DEV__,
    sendDefaultPii: true,
    enableLogs: true,
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
    integrations: [
      Sentry.mobileReplayIntegration(),
      Sentry.feedbackIntegration(),
    ],
  });

  initialized = true;
}

export { Sentry };

/**
 * Send a test event to Sentry, bypassing the __DEV__ gate.
 * Used by the Profile DEV section to verify the dashboard wiring.
 * Returns true if the event was sent, false if no DSN is configured.
 */
export function sendSentryTestEvent(): boolean {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? FALLBACK_DSN;
  if (!dsn) return false;

  // Force-init (or re-init enabled) just for this test, regardless of __DEV__.
  Sentry.init({
    dsn,
    enabled: true,
    debug: __DEV__,
    sendDefaultPii: true,
  });
  initialized = true;

  const tag = new Date().toISOString();
  Sentry.captureException(
    new Error(`[Hēlo] Test event from Profile DEV — ${tag}`)
  );
  return true;
}
