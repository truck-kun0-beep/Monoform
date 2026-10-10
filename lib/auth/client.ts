"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./config";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client. Stored on `globalThis` so the same
 * instance is reused across React re-renders and HMR reloads; this
 * matches the official `@supabase/ssr` Next.js guide.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (cached) return cached;
  const env = getSupabaseEnv();
  if (!env) return null;
  cached = createBrowserClient(env.url, env.anonKey);
  return cached;
}
