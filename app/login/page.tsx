import Link from "next/link";
import { AuthShell, LoginForm } from "@/components/auth";
import { resolveRedirectTarget } from "@/lib/auth";

export const metadata = {
  title: "Sign In",
  description:
    "Sign in to your MONOFORM account to access orders, wishlist and saved addresses.",
};

type SearchParams = Promise<{ redirect?: string | string[] }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const redirectTo = resolveRedirectTarget(params.redirect);

  return (
    <AuthShell
      footer={
        <p>
          New to MONOFORM?{" "}
          <Link
            href={`/register?redirect=${encodeURIComponent(redirectTo)}`}
            className="link-underline text-ink"
          >
            Create an account
          </Link>
          .
        </p>
      }
    >
      <header className="mb-6">
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 text-display-md text-ink">Sign in</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Welcome back. Sign in to access your orders, wishlist and saved
          addresses.
        </p>
      </header>
      <LoginForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
