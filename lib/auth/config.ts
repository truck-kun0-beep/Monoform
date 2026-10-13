import { brand } from "@/config/brand";

/**
 * Supabase project configuration.
 *
 * The URL and the publishable key are intentionally read from the
 * public `NEXT_PUBLIC_*` environment variables so the browser
 * client can boot without server round-trips. The service-role
 * key is never imported into this module — privileged operations
 * always go through the server client (which keeps the secret
 * server-side).
 *
 * The current Supabase dashboard exposes the public browser key
 * as either:
 *
 *   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (canonical, new
 *     dashboard), or
 *   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy, still honoured for
 *     projects that have not migrated).
 *
 * When both are set the publishable key wins so a deployment that
 * sets both keeps using the value the operator most recently
 * confirmed.
 */
export type SupabaseEnv = {
  url: string;
  publishableKey: string;
  /** Which env variable actually supplied the key. */
  keySource: "publishable" | "anon";
};

/**
 * Patterns that identify a service-role / secret key being passed
 * through the public env. A real publishable key starts with the
 * `eyJ` JWT prefix; a service-role key in the JS client SDK starts
 * with `sb_secret_…` (newer dashboards) or with `eyJ` followed by
 * a `service_role` role claim. We never want either to leak into
 * the browser bundle, so we refuse to use a value that looks like
 * a service-role key.
 */
function looksLikeServiceRoleKey(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (v.startsWith("sb_secret_")) return true;
  if (v.startsWith("sbp_")) return true; // legacy service-role prefix
  if (v.startsWith("eyJ")) {
    // JWTs are three dot-separated base64url segments. Try to
    // decode the payload and look for a service_role role claim.
    const parts = v.split(".");
    if (parts.length === 3) {
      const payload = parts[1];
      if (!payload) return false;
      try {
        // base64url -> base64
        const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "===".slice((b64.length + 3) % 4);
        const json =
          typeof atob === "function"
            ? atob(padded)
            : Buffer.from(padded, "base64").toString("utf8");
        if (/"role"\s*:\s*"service_role"/.test(json)) return true;
      } catch {
        // not a JWT we can parse; treat as not a service-role key
      }
    }
  }
  return false;
}

/**
 * Placeholder values from `.env.example` that we treat as "not
 * configured" so the auth UI can render an honest setup-required
 * state instead of pretending to call a live project.
 */
const PLACEHOLDER_URL = "https://your-project.supabase.co";
const PLACEHOLDER_PUBLISHABLE = "publishable-key";
const PLACEHOLDER_ANON = "anon-key";

function isPlaceholderUrl(value: string): boolean {
  return value === PLACEHOLDER_URL;
}

function isPlaceholderKey(value: string): boolean {
  return value === PLACEHOLDER_PUBLISHABLE || value === PLACEHOLDER_ANON;
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishable =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishable) return null;
  if (isPlaceholderUrl(url) || isPlaceholderKey(publishable)) return null;
  if (looksLikeServiceRoleKey(publishable)) {
    // Refuse to expose a privileged key through the browser
    // client. Operators must set the publishable / anon key here,
    // not the service-role key.
    return null;
  }
  const keySource: SupabaseEnv["keySource"] =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    !isPlaceholderKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
      ? "publishable"
      : "anon";
  return { url, publishableKey: publishable, keySource };
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
