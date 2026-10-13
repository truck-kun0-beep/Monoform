/**
 * Client-safe entry point for the auth module.
 *
 * Importing from this file is safe inside a client component — it
 * only re-exports browser-side helpers and the React provider. The
 * server-only modules (`lib/auth/server`, `lib/auth/require`) must
 * be imported directly from a server component or server action.
 */
export { AuthProvider, useAuth } from "./useAuth";
export { getSupabaseBrowserClient } from "./client";
export {
  AUTH_BRAND,
  AUTH_REDIRECT_PATHS,
  getSiteUrl,
  getSupabaseEnv,
  isSupabaseConfigured,
} from "./config";
export {
  buildLoginUrl,
  isAccountPath,
  isSafeInternalPath,
  resolveRedirectTarget,
} from "./redirects";
export type {
  AuthActionResult,
  AuthActionSuccessStatus,
  AuthUser,
  CustomerProfile,
} from "./types";
export { initialAuthActionResult } from "./types";
export {
  PASSWORD_MIN_LENGTH,
  normaliseBdPhone,
  sanitiseAuthError,
  validateBdPhone,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordMatch,
  validateRequiredBdPhone,
  type ValidationResult,
} from "./validation";
export {
  signInAction,
  registerAction,
  forgotPasswordAction,
  resetPasswordAction,
  signOutAction,
} from "./actions";
