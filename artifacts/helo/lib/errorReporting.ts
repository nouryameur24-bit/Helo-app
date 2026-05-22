/**
 * lib/errorReporting.ts — Structured error logging for Hēlo
 *
 * V1: Stores the last 50 errors in AsyncStorage.
 *
 * Sentry integration (deferred — see docs/SECURITY.md for migration plan):
 *   import * as Sentry from '@sentry/react-native';
 *   Sentry.init({
 *     dsn: 'YOUR_SENTRY_DSN',
 *     environment: __DEV__ ? 'development' : 'production',
 *     tracesSampleRate: 0.2,
 *   });
 *   // Then replace logError body with:
 *   //   Sentry.captureException(error, { extra: { screen: context.screen } });
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/lib/storageKeys';

const ERROR_LOG_KEY = STORAGE_KEYS.errorLog;
const MAX_ERRORS = 50;

export interface ErrorReport {
  id: string;
  timestamp: string;
  screen: string;
  message: string;
  stack?: string;
  /** First 8 chars of the user ID, anonymised */
  userId?: string;
}

/**
 * Log a structured error entry.
 * Safe to call from anywhere — never throws.
 */
export async function logError(
  error: unknown,
  context: { screen: string; userId?: string },
): Promise<void> {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const anonymizedId = context.userId
      ? `${context.userId.slice(0, 8)}...`
      : undefined;

    const report: ErrorReport = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      screen: context.screen,
      message,
      stack,
      userId: anonymizedId,
    };

    if (__DEV__) {
      console.warn(`[Hēlo Error] [${context.screen}]`, message);
    }

    const raw = await AsyncStorage.getItem(ERROR_LOG_KEY).catch(() => null);
    const logs: ErrorReport[] = raw ? (JSON.parse(raw) as ErrorReport[]) : [];
    logs.push(report);
    await AsyncStorage.setItem(
      ERROR_LOG_KEY,
      JSON.stringify(logs.slice(-MAX_ERRORS)),
    );
  } catch {
    // Silent fail — the error reporter must never crash the app
  }
}

/** Retrieve stored error log (for a support / debug screen). */
export async function getErrorLog(): Promise<ErrorReport[]> {
  try {
    const raw = await AsyncStorage.getItem(ERROR_LOG_KEY);
    return raw ? (JSON.parse(raw) as ErrorReport[]) : [];
  } catch {
    return [];
  }
}

/** Clear the error log (e.g. after sending a report). */
export async function clearErrorLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ERROR_LOG_KEY);
  } catch {
    // Non-critical — error log cleared on next successful write
  }
}
