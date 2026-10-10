/**
 * Domain types for the customer account area.
 *
 * The application never depends on raw Supabase response shapes
 * outside `lib/account`. The account UI imports from this module so
 * the underlying storage layer (or the seed fallback) can change
 * without touching the rest of the code.
 */

import type { Currency, Money } from "@/types";

/** Delivery zone classification used by the eventual checkout step. */
export type DeliveryZone = "inside_dhaka" | "outside_dhaka";

export const DELIVERY_ZONE_OPTIONS: ReadonlyArray<{
  value: DeliveryZone;
  label: string;
}> = [
  { value: "inside_dhaka", label: "Inside Dhaka" },
  { value: "outside_dhaka", label: "Outside Dhaka" },
];

/**
 * Customer profile as it appears in the account UI. The source of
 * truth is the `customer_profiles` table for everything except
 * `email`, which always comes from the authenticated identity
 * (`auth.users.email`) and is therefore read-only.
 */
export type CustomerProfile = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Saved delivery address. The `userId` field is the Supabase
 * `auth.users.id` of the customer the address belongs to. The
 * account UI never displays or accepts this value from the client.
 */
export type CustomerAddress = {
  id: string;
  userId: string;
  recipientName: string;
  phone: string;
  district: string;
  locality: string | null;
  addressLine: string;
  additionalDetails: string | null;
  postalCode: string | null;
  deliveryZone: DeliveryZone;
  deliveryInstructions: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Payload accepted by `addAddress` / `updateAddress`. */
export type AddressInput = {
  recipientName: string;
  phone: string;
  district: string;
  locality?: string | null;
  addressLine: string;
  additionalDetails?: string | null;
  postalCode?: string | null;
  deliveryZone: DeliveryZone;
  deliveryInstructions?: string | null;
  isDefault?: boolean;
};

/* ------------------------------------------------------------------ *
 * Order domain
 * ------------------------------------------------------------------ */

/**
 * Authoritative order status. The lifecycle maps to the prompt's
 * six stages. "pending_confirmation" is the first state a real
 * order is in; downstream states only happen through the trusted
 * order-management service.
 */
export type OrderStatus =
  | "pending_confirmation"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_confirmation: "Pending confirmation",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/**
 * Ordered list of "happy path" stages used by the timeline
 * component. `cancelled` is handled as a separate state because
 * it is not a forward step in the lifecycle.
 */
export const ORDER_TIMELINE_STAGES: ReadonlyArray<
  Exclude<OrderStatus, "cancelled">
> = [
  "pending_confirmation",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

/** Supported payment methods. */
export type OrderPaymentMethod = "cod" | "bkash";

export const ORDER_PAYMENT_METHOD_LABEL: Record<OrderPaymentMethod, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
};

/**
 * Authoritative payment status. The order service is the only
 * system allowed to advance this; a typed reference in the
 * checkout form never proves a payment has succeeded.
 */
export type OrderPaymentStatus =
  | "pending"
  | "awaiting_verification"
  | "paid"
  | "failed"
  | "refunded";

export const ORDER_PAYMENT_STATUS_LABEL: Record<OrderPaymentStatus, string> =
  {
    pending: "Pending",
    awaiting_verification: "Awaiting verification",
    paid: "Paid",
    failed: "Failed",
    refunded: "Refunded",
  };

/**
 * Address snapshot stored on the order itself. The application
 * never falls back to the customer's *current* saved address when
 * rendering a historical order — the address used at the time of
 * the order is the only legitimate source.
 */
export type OrderAddressSnapshot = {
  recipientName: string;
  phone: string;
  district: string;
  locality: string | null;
  addressLine: string;
  additionalDetails: string | null;
  postalCode: string | null;
  deliveryZone: DeliveryZone;
  deliveryInstructions: string | null;
};

/**
 * One line of the order. Product names, variants, unit prices
 * and line subtotals are persisted as part of the order so the
 * historical view does not depend on the live catalogue.
 */
export type OrderItem = {
  productId: string;
  slug: string | null;
  name: string;
  variant: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  image: { alt: string; aspectRatio?: number } | null;
};

/**
 * Courier / fulfilment metadata, only present when an order
 * actually advances into the "shipped" state and a real
 * fulfilment partner is configured. When the order service has
 * not yet integrated with a courier, the field is `null`.
 */
export type OrderCourierTracking = {
  courier: string;
  trackingNumber: string;
  trackingUrl: string | null;
  dispatchedAt: string | null;
  estimatedDeliveryAt: string | null;
};

/**
 * A single recorded transition in the order's life. Used by the
 * status timeline component. `at` is the authoritative timestamp
 * from the order-management service; we never fabricate one.
 */
export type OrderTimelineEvent = {
  status: OrderStatus;
  at: string;
  note: string | null;
};

/** One row in the customer-facing order list. */
export type OrderSummary = {
  id: string;
  /** Customer-facing order number (e.g. "MF-100245"). */
  number: string;
  placedAt: string;
  status: OrderStatus;
  paymentMethod: OrderPaymentMethod;
  total: Money;
  itemCount: number;
};

/** Admin order list row. Adds the customer identity and delivery
 *  zone so the operator can identify the order at a glance. */
export type AdminOrderSummary = OrderSummary & {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  paymentStatus: OrderPaymentStatus;
  deliveryZone: DeliveryZone;
};

/** Notification row summary for the admin order detail. */
export type OrderNotificationSummary = {
  id: string;
  status: "pending" | "sent" | "failed";
  recipient: string;
  attemptCount: number;
  lastAttemptedAt: string | null;
  lastError: string | null;
  sentAt: string | null;
};

/**
 * Full order record used by the confirmation page and the
 * authenticated order detail page. Always owner-scoped before
 * being returned to the UI.
 */
export type OrderDetail = OrderSummary & {
  currency: Currency;
  items: OrderItem[];
  subtotal: Money;
  deliveryFee: Money;
  paymentStatus: OrderPaymentStatus;
  paymentReference: string | null;
  shippingAddress: OrderAddressSnapshot;
  courier: OrderCourierTracking | null;
  timeline: OrderTimelineEvent[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
};

/**
 * The limited view returned by the public tracking lookup. It
 * intentionally omits the customer's email, the full address, the
 * payment reference and any other private metadata.
 */
export type OrderTrackingResult = {
  number: string;
  placedAt: string;
  status: OrderStatus;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  itemCount: number;
  total: Money;
  /** City / district only — never the full street address. */
  deliveryDistrict: string;
  deliveryZone: DeliveryZone;
  courier: OrderCourierTracking | null;
  timeline: OrderTimelineEvent[];
};

/* ------------------------------------------------------------------ *
 * Service result states
 * ------------------------------------------------------------------ *
 *
 * Discriminated unions returned by the customer order service.
 * The shapes are intentionally separate from the `ok` payloads so
 * each branch of the service can declare its own error context.
 */

export type OrderListState =
  | { kind: "ok"; orders: OrderSummary[] }
  | { kind: "not_supported" }
  | { kind: "not_configured" }
  | { kind: "error"; message: string };

export type OrderLookupState =
  | { kind: "ok"; order: OrderDetail }
  | { kind: "not_found" }
  | { kind: "not_supported" }
  | { kind: "not_configured" }
  | { kind: "error"; message: string };

export type OrderTrackingState =
  | { kind: "ok"; order: OrderTrackingResult }
  | { kind: "not_found" }
  | { kind: "not_supported" }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "validation_error"; fieldErrors: Record<string, string> }
  | { kind: "not_configured" }
  | { kind: "error"; message: string };
