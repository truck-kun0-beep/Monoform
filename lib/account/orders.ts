import "server-only";
import {
  getOrderForCurrentUser,
  getOrderConfirmationForCurrentUser,
  listOrdersForCurrentUser,
  lookupOrderForTracking as lookupOrderForTrackingService,
  isOrderBackendConfigured,
} from "@/lib/orders/service";
import { getSupabaseEnv } from "@/lib/auth/config";
import { normaliseBdPhone } from "@/lib/auth/validation";
import type {
  OrderListState,
  OrderLookupState,
  OrderPaymentMethod,
  OrderStatus,
  OrderTrackingState,
} from "./types";

// Re-export the state types so existing imports keep working
// without changes throughout the codebase.
export type { OrderListState, OrderLookupState, OrderTrackingState };

/**
 * Customer-facing order service.
 *
 * This module is a thin wrapper around the authoritative
 * `lib/orders/service` so the existing account and confirmation
 * pages can keep their import surface (`listOrders`, `getOrder`,
 * `getOrderConfirmation`, `lookupOrderForTracking`) without
 * re-implementing the order logic.
 *
 * When the order backend is fully configured (Supabase env vars +
 * service-role key + the `0003_orders_and_admin.sql` migration),
 * the same functions return real data; when it is not, they
 * return honest `not_configured` / `not_found` states so the UI
 * never displays fabricated information.
 */

const ALLOWED_STATUSES: ReadonlyArray<OrderStatus> = [
  "pending_confirmation",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const ALLOWED_PAYMENT_METHODS: ReadonlyArray<OrderPaymentMethod> = [
  "cod",
  "bkash",
];

/* ------------------------------------------------------------------ *
 * Authenticated reads
 * ------------------------------------------------------------------ */

export async function listOrders(): Promise<OrderListState> {
  if (!getSupabaseEnv()) return { kind: "not_configured" };
  if (!isOrderBackendConfigured()) return { kind: "not_configured" };
  const result = await listOrdersForCurrentUser();
  return result;
}

export async function getOrder(id: string): Promise<OrderLookupState> {
  if (!isLikelyUuid(id)) return { kind: "not_found" };
  if (!isOrderBackendConfigured()) {
    return getSupabaseEnv() ? { kind: "not_configured" } : { kind: "not_configured" };
  }
  const result = await getOrderForCurrentUser(id);
  return result;
}

export async function getOrderConfirmation(
  id: string,
): Promise<OrderLookupState> {
  if (!isLikelyUuid(id)) return { kind: "not_found" };
  if (!isOrderBackendConfigured()) {
    return getSupabaseEnv() ? { kind: "not_configured" } : { kind: "not_configured" };
  }
  const result = await getOrderConfirmationForCurrentUser(id);
  return result;
}

/* ------------------------------------------------------------------ *
 * Public tracking lookup
 * ------------------------------------------------------------------ */

/**
 * Field validation for the public tracking form. The order
 * number is intentionally permissive (a customer-facing id is
 * a string with letters and digits) but bounded to a sensible
 * length. The phone number is normalised through the same
 * Bangladesh rules used everywhere else in the application.
 */
export function validateTrackingInput(
  rawNumber: string,
  rawPhone: string,
): { fieldErrors: Record<string, string> } | { normalised: { number: string; phone: string } } {
  const errors: Record<string, string> = {};
  const number = rawNumber.trim();
  const phone = rawPhone.trim();

  if (number.length === 0) {
    errors.number = "Enter your order number.";
  } else if (number.length > 64) {
    errors.number = "Order number is too long.";
  } else if (!/^[A-Za-z0-9_-]+$/.test(number)) {
    errors.number = "Order number contains invalid characters.";
  }

  if (phone.length === 0) {
    errors.phone = "Enter the phone number used for this order.";
  } else if (normaliseBdPhone(phone) === null) {
    errors.phone =
      "Enter a valid Bangladeshi phone number (e.g. 01XXXXXXXXX or +8801XXXXXXXXX).";
  }

  if (Object.keys(errors).length > 0) {
    return { fieldErrors: errors };
  }
  return {
    normalised: {
      number: number.toUpperCase(),
      phone: normaliseBdPhone(phone) ?? phone,
    },
  };
}

/**
 * Look up an order using the order number + matching contact
 * phone. The result is a strict subset of `OrderDetail` and never
 * exposes the customer's email, full address, payment reference
 * or any other private metadata.
 */
export async function lookupOrderForTracking(
  rawNumber: string,
  rawPhone: string,
  meta: { bucketKey: string },
): Promise<OrderTrackingState> {
  if (!isOrderBackendConfigured()) {
    // Run validation first so the public surface is shaped
    // correctly even when the backend is not yet in place.
    const validated = validateTrackingInput(rawNumber, rawPhone);
    if ("fieldErrors" in validated) {
      return { kind: "validation_error", fieldErrors: validated.fieldErrors };
    }
    return { kind: "not_configured" };
  }
  const result = await lookupOrderForTrackingService(rawNumber, rawPhone, {
    bucketKey: meta.bucketKey,
  });
  if (result.kind === "ok") {
    return { kind: "ok", order: result.order };
  }
  if (result.kind === "not_found") return { kind: "not_found" };
  if (result.kind === "not_configured") return { kind: "not_configured" };
  if (result.kind === "rate_limited")
    return {
      kind: "rate_limited",
      retryAfterSeconds: result.retryAfterSeconds,
    };
  if (result.kind === "validation_error")
    return { kind: "validation_error", fieldErrors: result.fieldErrors };
  return { kind: "error", message: "Could not look up that order." };
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

export function coerceOrderStatus(value: unknown): OrderStatus {
  if (typeof value !== "string") return "pending_confirmation";
  return (ALLOWED_STATUSES as ReadonlyArray<string>).includes(value)
    ? (value as OrderStatus)
    : "pending_confirmation";
}

export function coercePaymentMethod(
  value: unknown,
): OrderPaymentMethod {
  if (typeof value !== "string") return "cod";
  return (ALLOWED_PAYMENT_METHODS as ReadonlyArray<string>).includes(value)
    ? (value as OrderPaymentMethod)
    : "cod";
}

function isLikelyUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
