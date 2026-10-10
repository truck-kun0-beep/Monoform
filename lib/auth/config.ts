import { brand } from "@/config/brand";

/**
 * Supabase project configuration.
 *
 * The URL and anon key are intentionally read from the public
 * `NEXT_PUBLIC_*` environment variables so the browser client can
 * boot without server round-trips. The service-role key is never
 * imported into this module — privileged operations always go
 * through the server client (which keeps the secret server-side).
 */
export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (url === "https://your-project.supabase.co" || anonKey === "anon-key") {
    // Treat the example placeholders as "not configured" so the
    // auth UI can render an honest "not configured" state instead
    // of pretending it is live.
    return null;
  }
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}

export const AUTH_REDIRECT_PATHS = {
  // Where the user lands after a successful password reset.
  resetPassword: "/reset-password",
  // Default destination after signing in.
  signIn: "/account",
} as const;

/**
 * The site URL is used to build absolute callback URLs for Supabase
 * email flows (verification, password recovery). Falls back to the
 * localhost development URL so the build doesn't require a value
 * during static generation.
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export const AUTH_BRAND = {
  appName: brand.name,
};
