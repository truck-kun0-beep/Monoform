import Link from "next/link";
import { redirect } from "next/navigation";
import { Container, ErrorMessage, Section } from "@/components/ui";
import {
  AdminShell,
  AdminOrdersTable,
  AdminOrdersFilters,
} from "@/components/admin";
import {
  listOrdersForAdmin,
  requireAdmin,
} from "@/lib/orders/server";
import type {
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderStatus,
} from "@/lib/account";

export const metadata = {
  title: "Admin — Orders",
  description: "Manage MONOFORM orders.",
};

type SearchParams = Promise<{
  q?: string | string[];
  status?: string | string[];
  paymentMethod?: string | string[];
  paymentStatus?: string | string[];
  from?: string | string[];
  to?: string | string[];
}>;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const guard = await requireAdmin();
  if (guard.kind !== "ok") {
    if (guard.kind === "not_authenticated") {
      redirect(`/login?redirect=${encodeURIComponent("/admin/orders")}`);
    }
    return renderGuard(guard.kind);
  }
  const params = await searchParams;
  const filters = buildFilters(params);
  const result = await listOrdersForAdmin(filters);
  if (result.kind !== "ok") {
    return renderGuard(result.kind);
  }
  return (
    <AdminShell
      current="/admin/orders"
      title="Orders"
      description="Every order placed through the storefront. Use the filters to narrow the list."
    >
      <AdminOrdersFilters />
      {result.orders.length === 0 ? (
        <div className="border border-line bg-paper p-6 text-sm text-ink-muted">
          No orders match the current filters.{" "}
          <Link href="/admin/orders" className="link-underline text-ink">
            Clear filters
          </Link>
          .
        </div>
      ) : (
        <AdminOrdersTable orders={result.orders} detailHrefBase="/admin/orders" />
      )}
    </AdminShell>
  );
}

function buildFilters(params: Awaited<SearchParams>) {
  const filters: {
    status?: OrderStatus;
    paymentMethod?: OrderPaymentMethod;
    paymentStatus?: OrderPaymentStatus;
    search?: string;
    from?: string;
    to?: string;
  } = {};
  const pick = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;
  const status = pick(params.status);
  if (status && isOrderStatus(status)) filters.status = status;
  const paymentMethod = pick(params.paymentMethod);
  if (paymentMethod && isPaymentMethod(paymentMethod))
    filters.paymentMethod = paymentMethod;
  const paymentStatus = pick(params.paymentStatus);
  if (paymentStatus && isPaymentStatus(paymentStatus))
    filters.paymentStatus = paymentStatus;
  const q = pick(params.q);
  if (q && q.trim().length > 0) filters.search = q.trim();
  const from = pick(params.from);
  if (from) filters.from = new Date(from).toISOString();
  const to = pick(params.to);
  if (to) {
    const date = new Date(to);
    date.setUTCHours(23, 59, 59, 999);
    filters.to = date.toISOString();
  }
  return filters;
}

function isOrderStatus(value: string): value is OrderStatus {
  return [
    "pending_confirmation",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ].includes(value);
}

function isPaymentMethod(value: string): value is OrderPaymentMethod {
  return value === "cod" || value === "bkash";
}

function isPaymentStatus(value: string): value is OrderPaymentStatus {
  return [
    "pending",
    "awaiting_verification",
    "paid",
    "failed",
    "refunded",
  ].includes(value);
}

function renderGuard(
  kind: "not_configured" | "forbidden" | "not_authenticated" | "error",
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
            The admin dashboard is unavailable because the service-role key
            is missing. Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to your
            environment and run the <code>0003_orders_and_admin.sql</code>
            migration.
          </ErrorMessage>
        </Container>
      </Section>
    );
  }
  if (kind === "not_authenticated") {
    redirect(`/login?redirect=${encodeURIComponent("/admin/orders")}`);
  }
  return (
    <Section spacing="lg" tone="paper">
      <Container>
        <ErrorMessage title="Could not load orders">
          An unexpected error occurred while loading the order list. Please try
          again.
        </ErrorMessage>
      </Container>
    </Section>
  );
}
