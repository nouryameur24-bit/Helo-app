/**
 * lib/swallow.ts — Traceable silent-catch helper.
 *
 * Replaces the `.catch(() => {})` pattern. Instead of disappearing into the
 * void, the error becomes a Sentry breadcrumb — breadcrumbs are FREE (they
 * don't count against the event quota) and surface inside any real crash
 * report as the trail of what happened in the seconds before.
 *
 * Usage:
 *   doSomething().catch(swallow);
 *
 * In __DEV__, also logs to the JS console so suspicious failures aren't
 * invisible during local dev.
 */

import { Sentry } from '@/lib/sentry';

export function swallow(err: unknown): void {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Unknown error';

  // Stack pointer back to the call site (one frame up from `swallow`).
  const stack =
    err instanceof Error && err.stack
      ? err.stack.split('\n').slice(1, 4).join('\n')
      : undefined;

  try {
    Sentry.addBreadcrumb({
      category: 'swallowed',
      level: 'warning',
      message,
      data: stack ? { stack } : undefined,
    });
  } catch {
    // Sentry itself failing must never throw from a swallow handler.
  }

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn('[swallow]', message);
  }
}
