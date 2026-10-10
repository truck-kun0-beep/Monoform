import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import {
  ORDER_PAYMENT_METHOD_LABEL,
  ORDER_PAYMENT_STATUS_LABEL,
  type OrderTrackingResult,
} from "@/lib/account";
import { OrderStatusBadge, OrderPaymentStatusBadge } from "./OrderStatusBadge";
import { OrderStatusTimeline } from "./OrderStatusTimeline";

type Props = {
  result: OrderTrackingResult;
  className?: string;
};

/**
 * Render the limited public tracking view. The result intentionally
 * omits the customer's email, full address, payment reference and
 * any other private metadata. Only the district and the delivery
 * zone are surfaced so the customer can confirm the destination
 * without leaking the full street address.
 */
export function TrackOrderResult({ result, className }: Props) {
  return (
    <article
      className={className}
      aria-label={`Order ${result.number}`}
    >
      <header className="flex flex-col gap-3 border border-line bg-paper p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-eyebrow uppercase text-ink-muted">Order</p>
            <p className="mt-1 text-display-sm text-ink">#{result.number}</p>
          </div>
          <OrderStatusBadge status={result.status} />
        </div>
        <dl className="mt-2 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <Field label="Placed" value={formatDateTime(result.placedAt)} />
          <Field
            label="Items"
            value={`${result.itemCount} ${result.itemCount === 1 ? "item" : "items"}`}
          />
          <Field
            label="Total"
            value={formatPrice(result.total.amount, result.total.currency)}
          />
        </dl>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <OrderStatusTimeline
            status={result.status}
            timeline={result.timeline}
          />
          <DeliverySummary result={result} />
        </div>
        <PaymentSummary result={result} />
      </div>

      <p className="mt-6 text-sm text-ink-muted">
        Need more details?{" "}
        <Link
          href="/account/orders"
          className="link-underline text-ink"
        >
          Sign in to your account
        </Link>{" "}
        to view the full order, including items and address snapshot.
      </p>
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-eyebrow uppercase text-ink-subtle">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

function DeliverySummary({ result }: { result: OrderTrackingResult }) {
  return (
    <section aria-label="Delivery destination">
      <div className="border border-line bg-paper p-6">
        <h2 className="text-eyebrow uppercase text-ink-muted">
          Delivery destination
        </h2>
        <p className="mt-2 text-sm text-ink">
          {result.deliveryDistrict}
          {" · "}
          {result.deliveryZone === "inside_dhaka"
            ? "Inside Dhaka"
            : "Outside Dhaka"}
        </p>
        {result.courier ? (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-eyebrow uppercase text-ink-subtle">Courier</p>
            <p className="mt-1 text-sm text-ink">{result.courier.courier}</p>
            <p className="mt-2 text-sm">
              {result.courier.trackingUrl ? (
                <a
                  href={result.courier.trackingUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="link-underline text-ink"
                >
                  Tracking reference: {result.courier.trackingNumber}
                </a>
              ) : (
                <span className="text-ink-muted">
                  Tracking reference: {result.courier.trackingNumber}
                </span>
              )}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">
            Tracking details aren't available yet. We'll share them as soon
            as your order is dispatched.
          </p>
        )}
      </div>
    </section>
  );
}

function PaymentSummary({ result }: { result: OrderTrackingResult }) {
  return (
    <section aria-label="Payment">
      <div className="border border-line bg-paper p-6">
        <h2 className="text-eyebrow uppercase text-ink-muted">Payment</h2>
        <div className="mt-3 flex flex-col gap-3 text-sm">
          <div>
            <p className="text-eyebrow uppercase text-ink-subtle">Method</p>
            <p className="mt-1 text-ink">
              {ORDER_PAYMENT_METHOD_LABEL[result.paymentMethod]}
            </p>
          </div>
          <div>
            <p className="text-eyebrow uppercase text-ink-subtle">Status</p>
            <div className="mt-1">
              <OrderPaymentStatusBadge status={result.paymentStatus} />
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              {result.paymentStatus === "paid"
                ? "Payment confirmed."
                : result.paymentStatus === "awaiting_verification"
                  ? "Awaiting verification."
                  : ORDER_PAYMENT_STATUS_LABEL[result.paymentStatus]}
            </p>
          </div>
        </div>
      </div>
    </section>
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
