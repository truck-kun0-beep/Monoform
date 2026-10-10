import { redirect } from "next/navigation";
import { Badge, Button, Container, Divider, ErrorMessage, Section } from "@/components/ui";
import { AdminShell, AdminOrdersTable, orderStatusTone } from "@/components/admin";
import {
  ORDER_PAYMENT_STATUS_LABEL,
  ORDER_STATUS_LABEL,
} from "@/lib/account";
import { listOrdersForAdmin, isOrderBackendConfigured, requireAdmin } from "@/lib/orders/server";

export const metadata = {
  title: "Admin — Overview",
  description: "MONOFORM store owner dashboard.",
};

/**
 * `/admin` — admin overview.
 *
 * Renders:
 *   - the live status summary
 *   - the recent orders list
 *   - a notification status indicator
 *
 * Every read goes through the service-role client, which is the
 * only layer in the application that can read across customers.
 * The page refuses to render for non-administrators by calling
 * `requireAdmin()` before doing any work.
 */
export default async function AdminOverviewPage() {
  const guard = await requireAdmin();
  if (guard.kind !== "ok") {
    return renderGuardState(guard.kind);
  }

  if (!isOrderBackendConfigured()) {
    return renderUnconfigured(guard.userId);
  }

  const result = await listOrdersForAdmin();
  if (result.kind !== "ok") {
    return renderUnconfigured(guard.userId, result);
  }

  const { orders, counts, paymentCounts } = result;
  const recent = orders.slice(0, 5);

  return (
    <AdminShell
      current="/admin"
      title="Store overview"
      description="Operational summary derived from real order records. Every metric is sourced from the order service; nothing is fabricated."
    >
      <section className="border border-line bg-paper p-6">
        <h2 className="text-eyebrow uppercase text-ink-muted">
          Orders by status
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {(
            [
              "pending_confirmation",
              "confirmed",
              "processing",
              "shipped",
              "delivered",
              "cancelled",
            ] as const
          ).map((status) => (
            <div key={status} className="flex flex-col gap-1">
              <dt className="text-eyebrow uppercase text-ink-subtle">
                {ORDER_STATUS_LABEL[status]}
              </dt>
              <dd>
                <Badge tone={orderStatusTone(status)}>
                  {counts[status]}
                </Badge>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border border-line bg-paper p-6">
        <h2 className="text-eyebrow uppercase text-ink-muted">
          Orders by payment status
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(
            [
              "pending",
              "awaiting_verification",
              "paid",
              "failed",
              "refunded",
            ] as const
          ).map((status) => (
            <div key={status} className="flex flex-col gap-1">
              <dt className="text-eyebrow uppercase text-ink-subtle">
                {ORDER_PAYMENT_STATUS_LABEL[status]}
              </dt>
              <dd className="text-lg font-medium text-ink tabular-nums">
                {paymentCounts[status]}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-eyebrow uppercase text-ink-muted">Recent orders</h2>
          <Button href="/admin/orders" variant="secondary" size="sm">
            View all orders
          </Button>
        </div>
        {recent.length === 0 ? (
          <div className="border border-line bg-paper p-6 text-sm text-ink-muted">
            No orders have been placed yet. The dashboard will populate
            automatically as soon as a customer completes checkout.
          </div>
        ) : (
          <AdminOrdersTable orders={recent} detailHrefBase="/admin/orders" />
        )}
      </section>

      <Divider />
      <p className="text-xs text-ink-muted">
        Need to change your store-owner notification email? Update
        <code className="mx-1 border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px]">
          STORE_ORDER_NOTIFICATION_EMAIL
        </code>
        in your environment configuration.
      </p>
    </AdminShell>
  );
}

async function renderGuardState(
  kind: "not_configured" | "not_authenticated" | "forbidden",
) {
  if (kind === "not_configured") {
    return (
      <Section spacing="lg" tone="paper">
        <Container>
          <ErrorMessage title="Order backend is not configured">
            The admin dashboard is unavailable because the order backend has
            not been wired to a Supabase project. Add the service-role key
            and run the <code>0003_orders_and_admin.sql</code> migration.
          </ErrorMessage>
        </Container>
      </Section>
    );
  }
  if (kind === "not_authenticated") {
    redirect(`/login?redirect=${encodeURIComponent("/admin")}`);
  }
  return (
    <Section spacing="lg" tone="paper">
      <Container>
        <ErrorMessage title="You don't have access to the admin dashboard">
          <p>
            Your account is signed in but is not on the
            <code className="mx-1 border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px]">
              admin_allowlist
            </code>
            . The store owner can add your user id through the Supabase SQL
            editor.
          </p>
        </ErrorMessage>
      </Container>
    </Section>
  );
}

async function renderUnconfigured(
  userId: string,
  result?: { kind: string; message?: string },
) {
  return (
    <AdminShell current="/admin" title="Store overview" description="No data to display yet.">
      <ErrorMessage title="The order backend is not connected">
        {result?.message ??
          "Add SUPABASE_SERVICE_ROLE_KEY to your environment and run the 0003_orders_and_admin.sql migration. The dashboard will populate automatically once a real order is placed."}
      </ErrorMessage>
      <p className="text-xs text-ink-muted">
        Signed in as <code className="border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px]">{userId}</code>.
      </p>
    </AdminShell>
  );
}
