import Link from "next/link";
import { AuthShell, RegisterForm } from "@/components/auth";
import { resolveRedirectTarget } from "@/lib/auth";

export const metadata = {
  title: "Create Account",
  description:
    "Create a MONOFORM account to track orders, save favourites and check out faster.",
};

type SearchParams = Promise<{ redirect?: string | string[] }>;

export default async function RegisterPage({
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
          Already have an account?{" "}
          <Link
            href={`/login?redirect=${encodeURIComponent(redirectTo)}`}
            className="link-underline text-ink"
          >
            Sign in
          </Link>
          .
        </p>
      }
    >
      <header className="mb-6">
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 text-display-md text-ink">Create account</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Save your details for a faster checkout and to access your order
          history. We will never share your email.
        </p>
      </header>
      <RegisterForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
