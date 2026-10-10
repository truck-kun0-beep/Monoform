import Link from "next/link";
import { Badge } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import {
  ORDER_PAYMENT_METHOD_LABEL,
  ORDER_STATUS_LABEL,
  type OrderSummary,
} from "@/lib/account";
import { OrderStatusBadge } from "./OrderStatusBadge";

type Props = {
  orders: OrderSummary[];
  /**
   * Base path used for the "View" link. The order id is appended
   * with `encodeURIComponent` so it is safe to render in an
   * `href` even when the id contains unusual characters.
   */
  detailHrefBase?: string;
  className?: string;
};

/**
 * Customer-facing order history table. Renders each order as a
 * row with number, date, status, payment method and total. The
 * data is sourced from the order service so private information
 * stays scoped to the authenticated customer.
 */
export function OrderHistoryTable({
  orders,
  detailHrefBase = "/account/orders",
  className,
}: Props) {
  if (orders.length === 0) {
    return (
      <div className={className}>
        <p className="text-sm text-ink-muted">No orders to show.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <table className="hidden w-full border-collapse text-sm md:table">
        <caption className="sr-only">Order history</caption>
        <thead>
          <tr className="border-b border-line text-left text-eyebrow uppercase text-ink-muted">
            <th scope="col" className="py-3 pr-4 font-normal">
              Order
            </th>
            <th scope="col" className="py-3 pr-4 font-normal">
              Date
            </th>
            <th scope="col" className="py-3 pr-4 font-normal">
              Status
            </th>
            <th scope="col" className="py-3 pr-4 font-normal">
              Payment
            </th>
            <th scope="col" className="py-3 pr-4 text-right font-normal">
              Total
            </th>
            <th scope="col" className="py-3 pl-4 text-right font-normal">
              <span className="sr-only">View order</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-b border-line align-baseline text-ink"
            >
              <td className="py-4 pr-4 font-medium text-ink">#{order.number}</td>
              <td className="py-4 pr-4 text-ink-muted">
                {formatDate(order.placedAt)}
              </td>
              <td className="py-4 pr-4">
                <Badge tone={statusTone(order.status)}>
                  {ORDER_STATUS_LABEL[order.status]}
                </Badge>
              </td>
              <td className="py-4 pr-4 text-ink-muted">
                {ORDER_PAYMENT_METHOD_LABEL[order.paymentMethod]}
              </td>
              <td className="py-4 pr-4 text-right tabular-nums">
                {formatPrice(order.total.amount, order.total.currency)}
              </td>
              <td className="py-4 pl-4 text-right">
                <Link
                  href={`${detailHrefBase}/${encodeURIComponent(order.id)}`}
                  className="text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-4 md:hidden" aria-label="Order history">
        {orders.map((order) => (
          <li key={order.id} className="border border-line bg-paper p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm text-ink">#{order.number}</p>
              <span className="tabular-nums text-sm text-ink">
                {formatPrice(order.total.amount, order.total.currency)}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-subtle">
              {formatDate(order.placedAt)} ·{" "}
              {ORDER_PAYMENT_METHOD_LABEL[order.paymentMethod]}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <OrderStatusBadge status={order.status} />
              <Link
                href={`${detailHrefBase}/${encodeURIComponent(order.id)}`}
                className="text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink"
              >
                View
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function statusTone(
  status: OrderSummary["status"],
): "neutral" | "new" | "sale" | "low-stock" | "ink" {
  switch (status) {
    case "pending_confirmation":
      return "low-stock";
    case "confirmed":
    case "processing":
      return "new";
    case "shipped":
      return "ink";
    case "delivered":
      return "neutral";
    case "cancelled":
      return "sale";
  }
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
