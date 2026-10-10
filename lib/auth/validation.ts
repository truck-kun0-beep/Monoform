/**
 * Shared validation helpers for the auth forms. Pure functions that
 * are easy to unit test and shared by the server actions and the
 * client forms.
 */

export const PASSWORD_MIN_LENGTH = 8;

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter your email address.";
  if (trimmed.length > 320) return "Email address is too long.";
  if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address.";
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return "Choose a password.";
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!/\d/.test(value)) {
    return "Password must include at least one number.";
  }
  return null;
}

export function validateName(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `Enter your ${label.toLowerCase()}.`;
  if (trimmed.length > 80) return `${label} is too long.`;
  return null;
}

export function validatePasswordMatch(a: string, b: string): string | null {
  if (a !== b) return "Passwords do not match.";
  return null;
}

/* ------------------------------------------------------------------ *
 * Bangladeshi phone numbers
 * ------------------------------------------------------------------ *
 *
 * Bangladesh mobile numbers follow the local format
 * `01[3-9]XXXXXXXX` (11 digits) or the international format
 * `+8801[3-9]XXXXXXXX` (13–14 digits including the `+`).
 *
 * The helpers below accept the common valid representations the
 * application sees in practice:
 *
 *  - `+8801XXXXXXXXX`
 *  - `8801XXXXXXXXX`
 *  - `01XXXXXXXXX`
 *  - `1XXXXXXXXX`  (without the leading `0`)
 *
 * `normaliseBdPhone` returns a stable `01XXXXXXXXX` representation
 * suitable for storage and comparison. `validateBdPhone` returns
 * either `null` (valid) or a user-facing error string.
 *
 * The helpers never invent SMS / verification functionality — they
 * just shape the value for the database. The verification workflow
 * itself is the responsibility of a future prompt.
 */

const BD_OPERATOR_PREFIX = /^(?:\+?880|0)?1[3-9]\d{8}$/;

/** Strip whitespace, dashes and parentheses from a raw phone value. */
export function sanitisePhoneInput(value: string): string {
  return value.replace(/[\s\-()+]/g, "");
}

/**
 * Normalise a Bangladeshi phone number to the canonical local
 * `01XXXXXXXXX` form. Returns `null` when the value is not a
 * recognisable Bangladeshi mobile number.
 */
export function normaliseBdPhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const compact = sanitisePhoneInput(trimmed);
  if (!BD_OPERATOR_PREFIX.test(compact)) return null;
  // Drop the optional `+880` / `880` country code, then prepend `0`
  // only when the local part no longer starts with the local trunk
  // prefix (the regex accepts the already-local form `01XXXXXXXXX`).
  const withoutCountry = compact.replace(/^(?:\+?880)/, "");
  return withoutCountry.startsWith("0") ? withoutCountry : `0${withoutCountry}`;
}

/**
 * Validate a phone number for the Bangladesh storefront. Returns a
 * user-facing error string or `null` when the value is acceptable.
 * An empty value is considered optional — use `validateRequiredBdPhone`
 * to forbid blanks.
 */
export function validateBdPhone(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) return null;
  if (normaliseBdPhone(trimmed) === null) {
    return "Enter a valid Bangladeshi phone number (e.g. 01XXXXXXXXX or +8801XXXXXXXXX).";
  }
  return null;
}

export function validateRequiredBdPhone(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) {
    return "Enter a phone number so we can contact you about this order.";
  }
  return validateBdPhone(trimmed);
}

/**
 * Map a Supabase / network error message to a user-facing string.
 * Avoids exposing provider internals or stack traces.
 */
export function sanitiseAuthError(message: string | undefined): string {
  if (!message) return "Something went wrong. Please try again.";
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please verify your email address before signing in.";
  }
  if (lower.includes("user already registered")) {
    return "An account with that email already exists.";
  }
  if (lower.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (lower.includes("network")) {
    return "We couldn't reach the authentication service. Check your connection and try again.";
  }
  if (lower.includes("expired") && lower.includes("otp")) {
    return "This recovery link has expired. Request a new one.";
  }
  if (lower.includes("same as") || lower.includes("different from")) {
    return "Your new password must be different from your previous password.";
  }
  return "We couldn't complete that request. Please try again.";
}
