import Link from "next/link";
import { AccountShell } from "@/components/account";
import {
  OrderDetailView,
  OrderNotSupported,
} from "@/components/order";
import { ErrorMessage } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getOrder } from "@/lib/account/orders";

export const metadata = {
  title: "Order Details",
  description: "View a single order from your order history.",
};

type Params = Promise<{ id: string }>;

/**
 * `/account/orders/[id]` — authenticated order detail.
 *
 * The lookup is owner-scoped through the order service. A forged
 * id never returns another customer's order: the service scopes
 * every read to `auth.uid()` and the page's `requireUser` guard
 * refuses unauthenticated access entirely.
 *
 * Once the order backend is wired in the same `ok` branch will
 * render the full `OrderDetailView` using the authoritative
 * historical record (items, address snapshot, payment state,
 * status timeline). Until then the page renders the honest
 * `not_supported` state so no fabricated data is shown.
 */
export default async function AccountOrderDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  await requireUser(`/account/orders/${id}`);
  const result = await getOrder(id);

  if (result.kind === "not_supported") {
    return (
      <AccountShell
        current="/account/orders"
        title={`Order #${id}`}
        description="Order details will appear here once the order backend is connected."
      >
        <OrderNotSupported
          showBackLink
          backHref="/account/orders"
          body={
            <>
              <p>
                The order detail view will display a real order once the
                order backend is in place. The data-access layer is ready
                and the security model is the same as the order list.
              </p>
              <p className="mt-3">
                For now, only the order id in the URL is shown — no record
                is fetched or displayed.
              </p>
            </>
          }
        />
      </AccountShell>
    );
  }

  if (result.kind === "not_found") {
    return (
      <AccountShell
        current="/account/orders"
        title="Order not found"
        description="We couldn't find this order in your account."
      >
        <ErrorMessage title="Order not found">
          Either the order id is incorrect, the order has been removed, or
          this order belongs to a different account. If you placed the order
          as a guest, use the{" "}
          <Link href="/track-order" className="link-underline text-ink">
            order tracking page
          </Link>
          .
        </ErrorMessage>
        <p className="mt-6 text-sm text-ink-muted">
          <Link href="/account/orders" className="link-underline text-ink">
            ← Back to orders
          </Link>
        </p>
      </AccountShell>
    );
  }

  if (result.kind === "not_configured") {
    return (
      <AccountShell
        current="/account/orders"
        title={`Order #${id}`}
        description="Order details will appear here once the order backend is connected."
      >
        <ErrorMessage title="Account data unavailable">
          Authentication is not connected to a Supabase project yet.
        </ErrorMessage>
        <p className="mt-6 text-sm text-ink-muted">
          <Link href="/account/orders" className="link-underline text-ink">
            ← Back to orders
          </Link>
        </p>
      </AccountShell>
    );
  }

  if (result.kind === "error") {
    return (
      <AccountShell
        current="/account/orders"
        title={`Order #${id}`}
        description="Order details will appear here once the order backend is connected."
      >
        <ErrorMessage title="Could not load this order">
          {result.message}
        </ErrorMessage>
        <p className="mt-6 text-sm text-ink-muted">
          <Link href="/account/orders" className="link-underline text-ink">
            ← Back to orders
          </Link>
        </p>
      </AccountShell>
    );
  }

  // `ok` branch — the order backend returned a real order. The
  // detail view renders every field from the authoritative
  // historical record returned by the order service.
  const order = result.order;
  return (
    <AccountShell
      current="/account/orders"
      title={`Order #${order.number}`}
      description={`Placed on ${formatDate(order.placedAt)}.`}
    >
      <OrderDetailView
        order={order}
        showCustomerIdentity
        backHref="/account/orders"
      />
    </AccountShell>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
