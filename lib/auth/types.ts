import type { User } from "@supabase/supabase-js";

/**
 * Domain types that sit on top of Supabase's auth responses.
 *
 * The application never depends on raw Supabase response shapes
 * outside `lib/auth` so swapping providers (or switching to a
 * direct Postgres-backed auth service) is a contained refactor.
 */
export type AuthUser = User;

/**
 * Row shape for the `customer_profiles` table. The row is keyed by
 * Supabase's auth `user.id` so we never trust a name or email to
 * identify a customer.
 */
export type CustomerProfile = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Discriminator for the success arm of `AuthActionResult`.
 *
 * The status is explicit so the form components can render the
 * correct post-submit state ("signed in", "check your email",
 * "check your inbox for a reset link", "password updated") without
 * guessing from the presence of `redirectTo`. The initial state of
 * `useActionState` is `{ ok: false }` so it can never match any of
 * these.
 */
export type AuthActionSuccessStatus =
  /** Sign-in or registration returned a session. Optionally redirect. */
  | "signed_in"
  /** Registration sent a verification email; user is not yet signed in. */
  | "verification_pending"
  /** Password-reset request was accepted; response is always neutral. */
  | "request_submitted"
  /** Password was updated and the recovery session cleared. */
  | "password_updated";

/**
 * Result type for the auth server actions. We use a discriminated
 * union so the client can render either the validation / provider
 * error or the success message without ambiguity.
 */
export type AuthActionResult =
  | {
      ok: true;
      status: AuthActionSuccessStatus;
      /** Where the form should navigate after rendering the success state. */
      redirectTo?: string;
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * The neutral initial state for `useActionState` in every auth
 * form. It deliberately carries `ok: false` with an empty
 * `error` so the success branches (`ok === true`) never match
 * before the user actually submits.
 */
export const initialAuthActionResult: AuthActionResult = {
  ok: false,
  error: "",
};
