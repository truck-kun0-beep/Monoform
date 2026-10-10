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
 * Result type for the auth server actions. We use a discriminated
 * union so the client can render either the validation / provider
 * error or the success message without ambiguity.
 */
export type AuthActionResult =
  | { ok: true; redirectTo?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
