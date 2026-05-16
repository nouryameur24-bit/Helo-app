/**
 * lib/sentry.ts — Sentry crash reporting bootstrap.
 *
 * `initSentry()` is invoked once at module-load time from `app/_layout.tsx`
 * (before React renders) so that early errors are captured. When
 * `EXPO_PUBLIC_SENTRY_DSN` is unset (typical in local dev), Sentry is left
 * disabled — the app keeps working and a single warning is logged in DEV.
 *
 * Setup (one-off, locally):
 *   - Create a Sentry React Native project, copy the DSN.
 *   - Add `EXPO_PUBLIC_SENTRY_DSN=https://...` to `.env` and EAS secrets.
 *   - Optional sourcemaps wizard: `pnpm dlx @sentry/wizard@latest -i reactNative`
 */

import * as Sentry from '@sentry/react-native';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[Sentry] DSN absent, monitoring désactivé');
    }
    return;
  }

  Sentry.init({
    dsn,
    enabled: !__DEV__,
    debug: __DEV__,
    tracesSampleRate: 0.2,
  });

  initialized = true;
}

export { Sentry };
