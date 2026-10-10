/**
 * Safe internal redirect validation.
 *
 * Accepts only same-origin, in-app paths. Rejects absolute URLs
 * (including `https://…`), protocol-relative URLs, scheme-only
 * URLs (`javascript:`, `data:`, `mailto:`, etc.) and any path
 * that does not start with a single forward slash.
 */
const ALLOWED_PREFIXES = [
  "/account",
  "/checkout",
  "/orders",
  "/",
] as const;

export function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value) return false;
  if (typeof value !== "string") return false;
  if (value.length > 512) return false;
  if (value.includes("\n") || value.includes("\r")) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  // Disallow scheme-prefixed paths like `/\\example.com` or `/javascript:…`
  if (/^\/\\/.test(value)) return false;
  return true;
}

export function isAccountPath(path: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * Build a `/login` URL with a validated `redirect` query string.
 * Falls back to the default destination when the value is unsafe.
 */
export function buildLoginUrl(redirectTo: string | null | undefined): string {
  const safe = isSafeInternalPath(redirectTo) ? redirectTo : "/account";
  return `/login?redirect=${encodeURIComponent(safe)}`;
}

/**
 * Resolve the post-login destination from a request's search params.
 * Returns `/account` for missing or unsafe values.
 */
export function resolveRedirectTarget(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return isSafeInternalPath(raw) ? raw : "/account";
}
