import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/auth/middleware";
import { isSafeInternalPath } from "@/lib/auth/redirects";

/**
 * Edge middleware. Two jobs:
 *
 *  1. Refresh the Supabase auth cookie on every request so server
 *     components always see the latest session.
 *  2. Block unauthenticated access to customer-only routes by
 *     redirecting to `/login` with a validated return URL.
 */
const PROTECTED_PREFIXES = [
  "/account",
  "/checkout",
  "/admin",
];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request);
  const { pathname, search } = request.nextUrl;

  const requiresAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (requiresAuth && !user) {
    const destination = `${pathname}${search}`;
    const redirect = new URL("/login", request.url);
    if (isSafeInternalPath(destination)) {
      redirect.searchParams.set("redirect", destination);
    }
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on every request except static assets, image optimisation
    // and the Next.js internals. We refresh the session everywhere
    // so server components can read the latest cookie.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
