import Link from "next/link";
import { Button } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABEL, type OrderSummary } from "@/lib/account";

type Props = {
  orders: OrderSummary[];
};

/**
 * "Recent orders" preview rendered on the account dashboard.
 * Shows the three most recent orders with a link to the full
 * order history page. The empty state links back to the
 * catalogue so the customer is not stuck on a dead end.
 */
export function RecentOrdersCard({ orders }: Props) {
  const top = orders.slice(0, 3);
  return (
    <section className="flex flex-col gap-4 border border-line bg-paper p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-eyebrow uppercase text-ink-muted">Recent Orders</p>
          <p className="mt-1 text-sm text-ink">
            {orders.length === 0
              ? "No orders yet."
              : `${orders.length} ${orders.length === 1 ? "order" : "orders"} on file.`}
          </p>
        </div>
        <Link
          href="/account/orders"
          className="text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink"
        >
          View all
        </Link>
      </header>

      {orders.length === 0 ? (
        <div className="flex flex-col gap-3 text-sm text-ink-muted">
          <p>
            You haven't placed an order yet. The order history will appear
            here as soon as your first order is placed.
          </p>
          <div>
            <Button href="/new-arrivals" variant="secondary" size="sm">
              Browse the collection
            </Button>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 text-sm">
          {top.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-3"
            >
              <div>
                <p className="text-ink">#{order.number}</p>
                <p className="text-xs text-ink-subtle">
                  {formatDate(order.placedAt)} · {ORDER_STATUS_LABEL[order.status]}
                </p>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="tabular-nums text-ink">
                  {formatPrice(order.total.amount, order.total.currency)}
                </span>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink"
                >
                  View
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
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
