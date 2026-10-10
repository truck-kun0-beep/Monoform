import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./server";
import { buildLoginUrl } from "./redirects";
import type { AuthUser } from "./types";

/**
 * Resolve the currently authenticated user.
 *
 * Returns `null` when the user is not signed in, or when Supabase
 * is not configured. Server components and route handlers can use
 * this to short-circuit unauthenticated requests without throwing.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}

/**
 * Server-side gate. Returns the authenticated user when the request
 * is allowed, or redirects to `/login?redirect=…` when it is not.
 *
 * Use this at the top of any server component that renders
 * customer-only data (account dashboard, order history, etc.).
 */
export async function requireUser(returnTo?: string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(buildLoginUrl(returnTo ?? null));
  }
  return user;
}
