/**
 * lib/validation.ts — Input sanitization for Hēlo
 *
 * Every user-supplied string MUST pass through one of these functions
 * before being sent to Supabase, an API, or rendered in the UI.
 */

/**
 * Strip HTML tags and dangerous characters from free-text fields.
 * @param input  Raw user input
 * @param maxLength  Maximum character count (default 500)
 */
export function sanitizeText(input: string, maxLength = 500): string {
  return input
    .replace(/<[^>]*>/g, '')   // strip HTML tags
    .replace(/[<>]/g, '')      // strip residual angle brackets
    .trim()
    .slice(0, maxLength);
}

/**
 * Extract only digits from a barcode string.
 * Returns the raw digit string (caller decides if length is valid).
 */
export function sanitizeBarcode(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Validate and normalise an email address.
 * Returns the lowercased email, or an empty string if invalid.
 */
export function sanitizeEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : '';
}

/**
 * Strip special/dangerous characters from a name field.
 * @param input  Raw name
 * @param maxLength  Maximum character count (default 100)
 */
export function sanitizeName(input: string, maxLength = 100): string {
  return input
    .replace(/<[^>]*>/g, '')                      // strip HTML
    .replace(/[<>{}[\]\\|=+*&^%$#@!`~]/g, '')    // strip injection chars
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate a 6-character alphanumeric partner code.
 * Strips all non-alphanumeric characters and uppercases.
 */
export function sanitizePartnerCode(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
}

/**
 * Sanitize a chatbot message (allows longer input than general text).
 */
export function sanitizeChatMessage(input: string): string {
  return sanitizeText(input, 1000);
}

/**
 * Check whether a sanitized barcode has a valid length (8 or 13 digits).
 */
export function isValidBarcode(digits: string): boolean {
  return digits.length === 8 || digits.length === 13;
}
