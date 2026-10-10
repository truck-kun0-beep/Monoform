import Link from "next/link";
import { AccountShell } from "@/components/account";
import { OrderHistoryTable, OrderNotSupported } from "@/components/order";
import { Button, Divider, ErrorMessage } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listOrders, type OrderListState } from "@/lib/account/orders";
import { messages } from "@/config/messages";

export const metadata = {
  title: "My Orders",
  description: "Your order history.",
};

/**
 * `/account/orders` — order history.
 *
 * The page is always owner-scoped: `listOrders` only returns
 * orders belonging to the authenticated customer. When the real
 * order backend is in place the same call returns real rows and
 * `OrderHistoryTable` renders them. Until then the page renders
 * an honest empty / "backend not ready" state.
 */
export default async function OrdersPage() {
  await requireUser("/account/orders");
  const result: OrderListState = await listOrders();

  if (result.kind === "not_configured") {
    return (
      <AccountShell
        current="/account/orders"
        title="My orders"
        description="Your order history will appear here once you have placed an order."
      >
        <ErrorMessage title="Account data unavailable">
          Authentication is not connected to a Supabase project yet. Add
          your credentials to <code className="font-mono">.env.local</code>
          {" "}and run the migrations in <code className="font-mono">/supabase</code>.
        </ErrorMessage>
      </AccountShell>
    );
  }

  if (result.kind === "error") {
    return (
      <AccountShell
        current="/account/orders"
        title="My orders"
        description="Your order history will appear here once you have placed an order."
      >
        <ErrorMessage title="Could not load your orders">
          {result.message}
        </ErrorMessage>
      </AccountShell>
    );
  }

  if (result.kind === "not_supported") {
    return (
      <AccountShell
        current="/account/orders"
        title="My orders"
        description="Every order you have placed will appear here. The order backend is being prepared — for now this view shows an honest empty state."
      >
        <OrderNotSupported
          title="Order history isn't available yet"
          body={
            <>
              <p>
                The order backend has not been provisioned. When the real
                order service is in place, your orders will appear here
                automatically — no UI changes are required.
              </p>
              <p className="mt-3">
                We do not display fabricated orders in the meantime. The
                public tracking page is also disabled until the backend is
                connected.
              </p>
            </>
          }
        />
        <Divider weight="hairline" className="my-6" />
        <p className="text-sm text-ink-muted">
          Looking for a recent order placed as a guest?{" "}
          <Link href="/track-order" className="link-underline text-ink">
            Track an order
          </Link>
          .
        </p>
      </AccountShell>
    );
  }

  // `ok` branch — the order backend returned real rows. The
  // page mirrors the same empty state regardless of whether the
  // customer has 0 orders or many.
  return (
    <AccountShell
      current="/account/orders"
      title="My orders"
      description="Every order you have placed will appear here, sorted by date with the most recent first."
    >
      {result.orders.length === 0 ? (
        <div className="flex flex-col gap-4 border border-line bg-paper p-6">
          <p className="text-eyebrow uppercase text-ink-muted">No orders yet</p>
          <p className="text-sm text-ink-muted">{messages.emptyOrders.body}</p>
          <div>
            <Button href="/new-arrivals" variant="secondary" size="sm">
              Browse the collection
            </Button>
          </div>
        </div>
      ) : (
        <OrderHistoryTable
          orders={result.orders}
          detailHrefBase="/account/orders"
        />
      )}

      <Divider weight="hairline" className="my-6" />

      <p className="text-sm text-ink-muted">
        Looking for a recent order placed as a guest?{" "}
        <Link href="/track-order" className="link-underline text-ink">
          Track an order
        </Link>
        .
      </p>
    </AccountShell>
  );
}
