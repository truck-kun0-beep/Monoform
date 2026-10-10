import { Badge } from "@/components/ui";
import {
  ORDER_PAYMENT_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  type OrderPaymentStatus,
  type OrderStatus,
} from "@/lib/account";

type Props = {
  status: OrderStatus;
  className?: string;
  /**
   * When `true`, renders the human label and adds a short
   * sentence describing what the status means. When `false`,
   * renders just the pill.
   */
  verbose?: boolean;
};

/**
 * Order status pill with an accessible label. Tone is driven by
 * the status so the customer can recognise the lifecycle stage
 * at a glance without relying on colour alone — every status is
 * also rendered with its text label.
 */
export function OrderStatusBadge({ status, verbose, className }: Props) {
  const tone = pickTone(status);
  const label = ORDER_STATUS_LABEL[status];
  const description = describe(status);

  if (verbose) {
    return (
      <div className={className}>
        <Badge tone={tone}>{label}</Badge>
        {description ? (
          <p className="mt-2 text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
    );
  }

  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  );
}

/**
 * Same pill for the payment status. Payment status is rendered
 * separately from the order status so the customer can read both
 * without conflating them.
 */
export function OrderPaymentStatusBadge({
  status,
  className,
}: {
  status: OrderPaymentStatus;
  className?: string;
}) {
  return (
    <Badge tone={pickPaymentTone(status)} className={className}>
      {ORDER_PAYMENT_STATUS_LABEL[status]}
    </Badge>
  );
}

function pickTone(status: OrderStatus) {
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

function pickPaymentTone(status: OrderPaymentStatus) {
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

function describe(status: OrderStatus): string | null {
  switch (status) {
    case "pending_confirmation":
      return "We've received your order and are confirming the details before we start processing it.";
    case "confirmed":
      return "Your order has been confirmed. We'll let you know when it moves into processing.";
    case "processing":
      return "Our team is preparing your order. We'll share tracking details once it ships.";
    case "shipped":
      return "Your order is on the way. Use the tracking link to follow its progress.";
    case "delivered":
      return "Your order has been delivered. Thank you for shopping with MONOFORM.";
    case "cancelled":
      return "This order was cancelled. Reach out to support if this was unexpected.";
  }
}
