/**
 * lib/validation/profileOnboarding.ts — Zod schemas for the onboarding form.
 *
 * Centralises every "what counts as a valid due date / first name" rule so
 * that the UI, the persistence layer, and any future API endpoint share the
 * exact same contract. Replaces ad-hoc `raw.replace(/\D/g, "")` parsing.
 */

import { z } from 'zod';

const MIN_DUE_YEAR = 2024;
const MAX_DUE_YEAR = 2027;

/**
 * A due date entered by the user, in DD/MM/YYYY format.
 *
 * Validation pipeline:
 *   1. shape regex (`^\d{2}/\d{2}/\d{4}$`)
 *   2. parsed to numbers, year clamped to [MIN_DUE_YEAR, MAX_DUE_YEAR]
 *   3. round-tripped through `new Date(y, m-1, d)` to reject impossible
 *      civil dates (31/02 → would silently roll over to 03/03 in JS)
 *
 * On success, the schema **transforms** the string into a `Date` so callers
 * never have to re-parse.
 */
export const dueDateRawSchema = z
  .string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'Format attendu : JJ/MM/AAAA' })
  .transform((raw, ctx) => {
    const [d, m, y] = raw.split('/').map(Number);
    if (y < MIN_DUE_YEAR || y > MAX_DUE_YEAR) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Année hors plage (${MIN_DUE_YEAR}–${MAX_DUE_YEAR})`,
      });
      return z.NEVER;
    }
    const date = new Date(y, m - 1, d);
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== y ||
      date.getMonth() !== m - 1 ||
      date.getDate() !== d
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Date invalide',
      });
      return z.NEVER;
    }
    return date;
  });

export const firstNameSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(2, { message: 'Le prénom doit contenir au moins 2 caractères' }));

export const onboardingProfileSchema = z.object({
  firstName: firstNameSchema,
  dueDate: dueDateRawSchema,
});

export type OnboardingProfileInput = z.input<typeof onboardingProfileSchema>;
export type OnboardingProfileParsed = z.output<typeof onboardingProfileSchema>;

/**
 * Convenience helper: parse a raw DD/MM/YYYY string and return the Date or
 * `null` on failure. Use this in components that only need the boolean
 * "is it valid?" / "render the trimester badge?" signal.
 */
export function parseDueDate(raw: string): Date | null {
  const result = dueDateRawSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/**
 * Format raw keystrokes into DD/MM/YYYY by stripping non-digits and
 * inserting slashes. Pure utility — does not validate.
 */
export function formatDueDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}
