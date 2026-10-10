/**
 * Server-side entry point for the auth module.
 *
 * Use this from server components, route handlers and server
 * actions. Client components should import from `@/lib/auth/react`
 * so they don't accidentally pull in the server-only modules.
 */
export { createSupabaseServerClient } from "./server";
export { updateSupabaseSession } from "./middleware";
export { getCurrentUser, requireUser } from "./require";
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
export type { AuthActionResult, AuthUser, CustomerProfile } from "./types";
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
