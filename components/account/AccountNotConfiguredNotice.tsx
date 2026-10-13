import Link from "next/link";

/**
 * Rendered by the account pages when Supabase is not configured.
 * The notice is honest: the integration is not wired to a real
 * project, so we tell the customer instead of pretending that
 * the dashboard works.
 */
export function AccountNotConfiguredNotice() {
  return (
    <div
      role="status"
      className="border border-warning/40 bg-paper-warm px-4 py-3 text-sm text-ink"
    >
      <p className="text-eyebrow uppercase text-warning">Setup required</p>
      <p className="mt-2 text-ink-muted">
        Account data is not connected to a Supabase project yet. Add
        <code className="mx-1 border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px]">
          NEXT_PUBLIC_SUPABASE_URL
        </code>
        and
        <code className="mx-1 border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px]">
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        </code>{" "}
        (or the legacy{" "}
        <code className="mx-1 border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px]">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </code>
        )
        to your environment, then run the migrations in{" "}
        <code className="mx-1 border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px]">
          /supabase/migrations
        </code>
        . See{" "}
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
