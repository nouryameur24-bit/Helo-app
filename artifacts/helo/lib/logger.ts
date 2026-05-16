/**
 * Centralized error logger.
 *
 * In development → console.warn with context.
 * In production → forwarded to Sentry (when EXPO_PUBLIC_SENTRY_DSN is set).
 *
 * Usage:
 *   } catch (err) {
 *     logError('anthropic.sendMessage', err, { question });
 *   }
 */

import { Sentry } from '@/lib/sentry';

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

  // Production — forward to Sentry. If Sentry was not initialized (no DSN),
  // captureException is a no-op, so nothing breaks.
  Sentry.captureException(err instanceof Error ? err : new Error(message), {
    tags: { context },
    extra,
  });
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
