import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseEnv } from "./config";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client.
 *
 * Uses Next.js's `cookies()` API and the `@supabase/ssr` adapter so
 * the session is read from the request's cookie jar and written back
 * for every mutation. Server components, route handlers and server
 * actions should all import this client.
 *
 * Returns `null` when Supabase is not configured so callers can
 * short-circuit gracefully instead of throwing.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const env = getSupabaseEnv();
  if (!env) return null;
  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options as CookieOptions);
          }
        } catch {
          // `cookies().set` is unavailable from a server component.
          // Middleware refreshes the session on every request so this
          // is safe to ignore in the server-component context.
        }
      },
    },
  });
}
