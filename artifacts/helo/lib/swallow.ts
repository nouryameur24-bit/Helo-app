/**
 * lib/swallow.ts — Traceable non-fatal catch helper.
 *
 * Replaces `.catch(() => {})` patterns. The error does NOT crash the app, but
 * it IS reported to Sentry as a non-fatal warning event so it shows up in
 * production monitoring (Issues feed, alerts, weekly digest).
 *
 * Two usages:
 *
 *   doSomething().catch(swallow);                          // simple, no tag
 *   doSomething().catch(swallowAs('scan.photoCapture'));   // tagged context
 *
 *   try { ... } catch (err) { swallow(err); }
 *   try { ... } catch (err) { swallow(err, 'scan.menuAnalyze'); }
 *
 * Why warning-level and not error-level?
 *   - The caller has decided this is "non-fatal" (otherwise it would re-throw).
 *   - Warnings still surface in Sentry and trigger alert rules, but won't wake
 *     anyone up at 3am.
 *
 * In __DEV__, also logs to the JS console.
 */

import { Sentry } from '@/lib/sentry';

export function swallow(err: unknown, context?: string): void {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Unknown error';

  try {
    // Breadcrumb gives the trail leading up to this swallow (free, no quota).
    Sentry.addBreadcrumb({
      category: context ? `swallowed:${context}` : 'swallowed',
      level: 'warning',
      message,
    });

    // Real event so it shows up in Issues / alerts in production.
    if (err instanceof Error) {
      Sentry.captureException(err, (scope) => {
        scope.setLevel('warning');
        scope.setTag('handler', 'swallow');
        if (context) scope.setTag('swallow.context', context);
        return scope;
      });
    } else {
      Sentry.captureMessage(`[swallow${context ? `:${context}` : ''}] ${message}`, 'warning');
    }
  } catch {
    // Sentry itself failing must never throw from a swallow handler.
  }

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(`[swallow${context ? `:${context}` : ''}]`, message);
  }
}

/**
 * Returns a tagged swallow handler suitable for `.catch(swallowAs('foo'))`.
 * Equivalent to `(err) => swallow(err, 'foo')`.
 */
export function swallowAs(context: string): (err: unknown) => void {
  return (err: unknown) => swallow(err, context);
}
