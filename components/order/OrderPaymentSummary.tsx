import {
  ORDER_PAYMENT_METHOD_LABEL,
  type OrderPaymentMethod,
  type OrderPaymentStatus,
} from "@/lib/account";
import { OrderPaymentStatusBadge } from "./OrderStatusBadge";

type Props = {
  method: OrderPaymentMethod;
  status: OrderPaymentStatus;
  /**
   * Customer-submitted bKash reference. Rendered only when the
   * status is `awaiting_verification` so the customer can see
   * what they submitted, not as proof of payment.
   */
  reference?: string | null;
  className?: string;
};

/**
 * Order payment summary. The payment method (Cash on Delivery /
 * bKash) is rendered separately from the payment status, and a
 * submitted reference is only shown while it is awaiting
 * verification. We never display "Payment Successful" based on a
 * typed reference alone — that decision is the order service's.
 */
export function OrderPaymentSummary({
  method,
  status,
  reference,
  className,
}: Props) {
  return (
    <section
      className={className}
      aria-label="Payment"
    >
      <div className="border border-line bg-paper p-6">
        <h2 className="text-eyebrow uppercase text-ink-muted">Payment</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <p className="text-eyebrow uppercase text-ink-subtle">
              Payment method
            </p>
            <p className="mt-1 text-sm text-ink">
              {ORDER_PAYMENT_METHOD_LABEL[method]}
            </p>
          </div>
          <div>
            <p className="text-eyebrow uppercase text-ink-subtle">
              Payment status
            </p>
            <div className="mt-1">
              <OrderPaymentStatusBadge status={status} />
            </div>
            <PaymentStatusNote method={method} status={status} />
          </div>
          {method === "bkash" &&
          reference &&
          status === "awaiting_verification" ? (
            <div>
              <p className="text-eyebrow uppercase text-ink-subtle">
                Submitted bKash reference
              </p>
              <p className="mt-1 text-sm text-ink">{reference}</p>
              <p className="mt-1 text-xs text-ink-muted">
                We're verifying this reference with bKash. We will only mark
                the order paid once the verification confirms the transfer.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function PaymentStatusNote({
  method,
  status,
}: {
  method: OrderPaymentMethod;
  status: OrderPaymentStatus;
}) {
  if (status === "paid") {
    return (
      <p className="mt-2 text-xs text-ink-muted">
        Confirmed by our payment provider.
      </p>
    );
  }
  if (status === "pending") {
    return (
      <p className="mt-2 text-xs text-ink-muted">
        {method === "cod"
          ? "Payment will be collected when your order is delivered."
          : "Awaiting your bKash transfer and reference."}
      </p>
    );
  }
  if (status === "awaiting_verification") {
    return (
      <p className="mt-2 text-xs text-ink-muted">
        Your reference is being checked. We will update this status as soon
        as verification completes.
      </p>
    );
  }
  if (status === "failed") {
    return (
      <p className="mt-2 text-xs text-ink-muted">
        We could not confirm the payment. Please retry or contact support.
      </p>
    );
  }
  if (status === "refunded") {
    return (
      <p className="mt-2 text-xs text-ink-muted">
        Refunded. Reach out to support if you have any questions.
      </p>
    );
  }
  return null;
}
