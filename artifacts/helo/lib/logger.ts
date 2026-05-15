/**
 * Centralized error logger.
 *
 * In development → console.warn with context.
 * In production → ready to be wired to Sentry / Crashlytics / Bugsnag.
 *
 * Usage:
 *   } catch (err) {
 *     logError('anthropic.sendMessage', err, { question });
 *   }
 */

type LogExtra = Record<string, unknown>;

function isProd(): boolean {
  // __DEV__ is injected by Metro / Expo
  return typeof __DEV__ === 'undefined' ? false : !__DEV__;
}

export function logError(context: string, err: unknown, extra?: LogExtra): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  if (!isProd()) {
    // eslint-disable-next-line no-console
    console.warn(`[${context}]`, message, extra ?? '', stack ? `\n${stack}` : '');
    return;
  }

  // Production: forward to remote logger when configured.
  // To enable Sentry, install @sentry/react-native and uncomment:
  //
  //   import * as Sentry from '@sentry/react-native';
  //   Sentry.captureException(err, { tags: { context }, extra });
  //
  // For now, keep a minimal trace so EAS logs / TestFlight crashes still capture context.
  // eslint-disable-next-line no-console
  console.warn(`[${context}] ${message}`, extra ?? '');
}

export function logWarn(context: string, message: string, extra?: LogExtra): void {
  if (!isProd()) {
    // eslint-disable-next-line no-console
    console.warn(`[${context}] ${message}`, extra ?? '');
  }
}

export function logInfo(context: string, message: string, extra?: LogExtra): void {
  if (!isProd()) {
    // eslint-disable-next-line no-console
    console.log(`[${context}] ${message}`, extra ?? '');
  }
}
