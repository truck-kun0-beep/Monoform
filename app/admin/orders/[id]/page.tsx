import { redirect } from "next/navigation";
import Link from "next/link";
import { Button, Container, ErrorMessage, Section } from "@/components/ui";
import { AdminShell, AdminOrderDetailView } from "@/components/admin";
import { getOrderForAdmin, requireAdmin } from "@/lib/orders/server";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "Admin — Order details",
  description: "Manage a single order.",
};

type Params = Promise<{ id: string }>;

/**
 * `/admin/orders/[id]` — single-order management.
 *
 * The order is fetched through the service-role client, which
 * enforces ownership at the database level via RLS. A forged id
 * returns `not_found` so the page never leaks another
 * customer's data.
 */
export default async function AdminOrderDetailPage({
  params,
}: {
  params: Params;
}) {
  const guard = await requireAdmin();
  if (guard.kind !== "ok") {
    if (guard.kind === "not_authenticated") {
      redirect(`/login?redirect=${encodeURIComponent("/admin/orders")}`);
    }
    return renderGuard(guard.kind);
  }
  const { id } = await params;
  const result = await getOrderForAdmin(id);
  if (result.kind !== "ok") {
    return renderGuard(result.kind);
  }
  const { order, customerEmail, timeline, notifications } = result;
  return (
    <AdminShell
      current="/admin/orders"
      title={`Order #${order.number}`}
      description={`Placed ${formatPlacedAt(order.placedAt)} · ${order.itemCount} ${
        order.itemCount === 1 ? "item" : "items"
      } · ${formatPrice(order.total.amount, order.total.currency)}`}
    >
      <div>
        <Button href="/admin/orders" variant="secondary" size="sm">
          ← Back to all orders
        </Button>
      </div>
      <AdminOrderDetailView
        order={order}
        customerEmail={customerEmail}
        timeline={timeline}
        notifications={notifications}
      />
    </AdminShell>
  );
}

function renderGuard(
  kind: "not_configured" | "forbidden" | "not_authenticated" | "not_found" | "error",
) {
  if (kind === "forbidden") {
    return (
      <Section spacing="lg" tone="paper">
        <Container>
          <ErrorMessage title="You don't have access to the admin dashboard">
            Your account is not on the admin allowlist.
          </ErrorMessage>
        </Container>
      </Section>
    );
  }
  if (kind === "not_configured") {
    return (
      <Section spacing="lg" tone="paper">
        <Container>
          <ErrorMessage title="The order backend is not configured">
            The order detail view is unavailable because the service-role
            key is missing.
          </ErrorMessage>
        </Container>
      </Section>
    );
  }
  if (kind === "not_authenticated") {
    redirect(`/login?redirect=${encodeURIComponent("/admin/orders")}`);
  }
  if (kind === "not_found") {
    return (
      <Section spacing="lg" tone="paper">
        <Container>
          <ErrorMessage title="Order not found">
            The order you are looking for does not exist.{" "}
            <Link href="/admin/orders" className="link-underline text-ink">
              Back to the order list
            </Link>
            .
          </ErrorMessage>
        </Container>
      </Section>
    );
  }
  return (
    <Section spacing="lg" tone="paper">
      <Container>
        <ErrorMessage title="Could not load the order">
          An unexpected error occurred while loading the order.
        </ErrorMessage>
      </Container>
    </Section>
  );
}

function formatPlacedAt(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
