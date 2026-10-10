import Link from "next/link";
import { Badge } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import {
  ORDER_PAYMENT_METHOD_LABEL,
  ORDER_PAYMENT_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  type AdminOrderSummary,
  type OrderPaymentMethod,
  type OrderPaymentStatus,
  type OrderStatus,
} from "@/lib/account";

type Props = {
  orders: AdminOrderSummary[];
  className?: string;
  detailHrefBase?: string;
};

/**
 * Admin order list. Denser than the customer-facing history table
 * and includes the customer name, contact phone and delivery zone
 * so the operator can identify the order at a glance without
 * opening every detail page.
 */
export function AdminOrdersTable({
  orders,
  detailHrefBase = "/admin/orders",
  className,
}: Props) {
  if (orders.length === 0) {
    return (
      <div className={className}>
        <p className="text-sm text-ink-muted">No orders match the current filters.</p>
      </div>
    );
  }
  return (
    <div className={className}>
      <div className="hidden overflow-x-auto border border-line bg-paper md:block">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-eyebrow uppercase text-ink-muted">
              <th className="px-4 py-3 font-normal">Order</th>
              <th className="px-4 py-3 font-normal">Placed</th>
              <th className="px-4 py-3 font-normal">Customer</th>
              <th className="px-4 py-3 font-normal">Phone</th>
              <th className="px-4 py-3 font-normal">Zone</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Payment</th>
              <th className="px-4 py-3 text-right font-normal">Total</th>
              <th className="px-4 py-3 text-right font-normal">
                <span className="sr-only">View</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <AdminOrderRow
                key={order.id}
                order={order}
                detailHrefBase={detailHrefBase}
              />
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-3 md:hidden" aria-label="Orders">
        {orders.map((order) => (
          <li key={order.id} className="border border-line bg-paper p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-ink">#{order.number}</p>
              <span className="tabular-nums text-sm text-ink">
                {formatPrice(order.total.amount, order.total.currency)}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {order.placedAt.slice(0, 10)} ·{" "}
              {ORDER_PAYMENT_METHOD_LABEL[order.paymentMethod]}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <Badge tone={orderStatusTone(order.status)}>
                {ORDER_STATUS_LABEL[order.status]}
              </Badge>
              <Link
                href={`${detailHrefBase}/${encodeURIComponent(order.id)}`}
                className="text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink"
              >
                Open
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdminOrderRow({
  order,
  detailHrefBase,
}: {
  order: AdminOrderSummary;
  detailHrefBase: string;
}) {
  return (
    <tr className="border-b border-line text-ink last:border-b-0">
      <td className="px-4 py-3 font-medium">#{order.number}</td>
      <td className="px-4 py-3 text-ink-muted">{order.placedAt.slice(0, 10)}</td>
      <td className="px-4 py-3 text-ink-muted">
        {order.customerName || "—"}
      </td>
      <td className="px-4 py-3 text-ink-muted">
        {order.customerPhone || "—"}
      </td>
      <td className="px-4 py-3 text-ink-muted">
        {order.deliveryZone === "inside_dhaka"
          ? "Inside Dhaka"
          : "Outside Dhaka"}
      </td>
      <td className="px-4 py-3">
        <Badge tone={orderStatusTone(order.status)}>
          {ORDER_STATUS_LABEL[order.status]}
        </Badge>
      </td>
      <td className="px-4 py-3 text-ink-muted">
        <span className="block">
          {ORDER_PAYMENT_METHOD_LABEL[order.paymentMethod]}
        </span>
        <span className="text-xs text-ink-subtle">
          {ORDER_PAYMENT_STATUS_LABEL[order.paymentStatus]}
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatPrice(order.total.amount, order.total.currency)}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`${detailHrefBase}/${encodeURIComponent(order.id)}`}
          className="text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink"
        >
          View
        </Link>
      </td>
    </tr>
  );
}

export function orderStatusTone(
  status: OrderStatus,
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

export function paymentStatusTone(
  status: OrderPaymentStatus,
): "neutral" | "low-stock" | "sale" {
  switch (status) {
    case "paid":
      return "neutral";
    case "pending":
    case "awaiting_verification":
      return "low-stock";
    case "failed":
    case "refunded":
      return "sale";
  }
}

export function paymentMethodShort(method: OrderPaymentMethod): string {
  return method === "cod" ? "COD" : "bKash";
}
