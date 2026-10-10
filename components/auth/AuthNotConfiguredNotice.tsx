import Link from "next/link";

/**
 * Rendered on the auth pages when Supabase environment variables are
 * missing. The notice is honest: the integration is not wired to a
 * real project, so we tell the visitor instead of pretending that
 * the form works.
 */
export function AuthNotConfiguredNotice() {
  return (
    <div
      role="status"
      className="border border-warning/40 bg-paper-warm px-4 py-3 text-sm text-ink"
    >
      <p className="text-eyebrow uppercase text-warning">Setup required</p>
      <p className="mt-2 text-ink-muted">
        Authentication is not connected to a Supabase project yet. Add
        <code className="mx-1 border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px]">
          NEXT_PUBLIC_SUPABASE_URL
        </code>
        and
        <code className="mx-1 border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px]">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </code>
        to your environment, then restart the dev server. See
        {" "}
        <Link
          href="/docs/AUTH"
          className="link-underline text-ink"
        >
          the auth guide
        </Link>{" "}
        for the full setup steps.
      </p>
    </div>
  );
}
