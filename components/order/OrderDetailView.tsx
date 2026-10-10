import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { OrderDetail } from "@/lib/account";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderStatusTimeline } from "./OrderStatusTimeline";
import { OrderItemsList } from "./OrderItemsList";
import { OrderSummaryPanel } from "./OrderSummaryPanel";
import { OrderAddressCard } from "./OrderAddressCard";
import { OrderPaymentSummary } from "./OrderPaymentSummary";
import { OrderCourierCard } from "./OrderCourierCard";

type Props = {
  order: OrderDetail;
  /**
   * Whether to render the customer identity (name / email / phone)
   * alongside the order. The confirmation page always shows it;
   * the account order detail page can show it too, but the
   * public tracking result should not receive this component.
   */
  showCustomerIdentity?: boolean;
  /**
   * Where the "Back" link points. The confirmation page points
   * at the account order history, while the account order
   * detail page also points there.
   */
  backHref?: string;
  className?: string;
};

/**
 * Reusable full order detail view. Used by `/account/orders/[id]`
 * and `/order-confirmation/[id]`. All values are sourced from the
 * authoritative `OrderDetail` record returned by the order
 * service — historical prices, the address snapshot and the
 * product snapshot are rendered exactly as the customer placed
 * them.
 */
export function OrderDetailView({
  order,
  showCustomerIdentity = true,
  backHref = "/account/orders",
  className,
}: Props) {
  return (
    <article className={className} aria-label={`Order ${order.number}`}>
      <ConfirmationHeader
        order={order}
        showCustomerIdentity={showCustomerIdentity}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <OrderStatusTimeline
            status={order.status}
            timeline={order.timeline}
          />
          <OrderItemsList items={order.items} />
        </div>
        <div className="flex flex-col gap-6">
          <OrderSummaryPanel
            subtotal={order.subtotal}
            deliveryFee={order.deliveryFee}
            total={order.total}
          />
          <OrderPaymentSummary
            method={order.paymentMethod}
            status={order.paymentStatus}
            reference={order.paymentReference}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OrderAddressCard address={order.shippingAddress} />
        <OrderCourierCard courier={order.courier} />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <p className="text-sm text-ink-muted">
          Need help with this order?{" "}
          <Link href="/contact" className="link-underline text-ink">
            Contact support
          </Link>
          .
        </p>
        <Link
          href={backHref}
          className="text-eyebrow uppercase text-ink-muted transition-colors hover:text-ink"
        >
          ← Back to orders
        </Link>
      </div>
    </article>
  );
}

function ConfirmationHeader({
  order,
  showCustomerIdentity,
}: {
  order: OrderDetail;
  showCustomerIdentity: boolean;
}) {
  return (
    <header className="border border-line bg-paper p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-eyebrow uppercase text-ink-muted">Order</p>
          <p className="mt-1 text-display-md text-ink">#{order.number}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <Field label="Placed" value={formatDateTime(order.placedAt)} />
        <Field
          label="Items"
          value={`${order.itemCount} ${order.itemCount === 1 ? "item" : "items"}`}
        />
        <Field
          label="Total"
          value={formatPrice(order.total.amount, order.total.currency)}
        />
      </dl>
      {showCustomerIdentity ? (
        <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
          <Field label="Customer" value={order.customerName} />
          <Field label="Contact phone" value={order.customerPhone} />
          <Field label="Email" value={order.customerEmail} />
        </dl>
      ) : null}
    </header>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-eyebrow uppercase text-ink-subtle">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value || "—"}</dd>
    </div>
  );
}

function formatDateTime(iso: string): string {
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
