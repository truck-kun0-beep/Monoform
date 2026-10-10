"use server";

import { revalidatePath } from "next/cache";
import {
  placeOrder,
  updateOrderStatus,
  updatePaymentStatus,
  retryNotification,
  type PlaceOrderInput,
  type PlaceOrderResult,
  type UpdateOrderStatusInput,
  type UpdateOrderStatusResult,
  type UpdatePaymentStatusInput,
  type UpdatePaymentStatusResult,
  type RetryNotificationResult,
} from "./service";
import type {
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderStatus,
} from "@/lib/account";
import { SUPPORTED_PAYMENT_METHODS } from "./config";
import { isValidOrderTransition, isValidPaymentTransition } from "./service";

/* ------------------------------------------------------------------ *
 * Result type for the order-placement server action. The CheckoutForm
 * renders validation / provider errors inline and shows the success
 * navigation only when `ok` is true.
 * ------------------------------------------------------------------ */

export type PlaceOrderActionResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
    }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string>;
      code?:
        | "validation_error"
        | "not_authenticated"
        | "not_configured"
        | "idempotency_conflict"
        | "product_unavailable"
        | "error";
    };

function formString(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : "";
}

function formOptional(form: FormData, key: string): string | undefined {
  const raw = form.get(key);
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function normaliseOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
}

const ALLOWED_STATUSES: ReadonlyArray<OrderStatus> = [
  "pending_confirmation",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const ALLOWED_PAYMENT_STATUSES: ReadonlyArray<OrderPaymentStatus> = [
  "pending",
  "awaiting_verification",
  "paid",
  "failed",
  "refunded",
];

function isOrderStatus(value: string): value is OrderStatus {
  return (ALLOWED_STATUSES as ReadonlyArray<string>).includes(value);
}

function isPaymentMethod(value: string): value is OrderPaymentMethod {
  return (SUPPORTED_PAYMENT_METHODS as ReadonlyArray<string>).includes(value);
}

function isPaymentStatus(value: string): value is OrderPaymentStatus {
  return (ALLOWED_PAYMENT_STATUSES as ReadonlyArray<string>).includes(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isDeliveryZone(value: string): value is "inside_dhaka" | "outside_dhaka" {
  return value === "inside_dhaka" || value === "outside_dhaka";
}

export async function placeOrderAction(
  form: FormData,
): Promise<PlaceOrderActionResult> {
  const customerName = formString(form, "customerName");
  const customerPhone = formString(form, "customerPhone");
  const customerEmail = formOptional(form, "customerEmail");
  const recipientName = formString(form, "recipientName");
  const phone = formString(form, "phone");
  const district = formString(form, "district");
  const locality = formOptional(form, "locality");
  const addressLine = formString(form, "addressLine");
  const additionalDetails = formOptional(form, "additionalDetails");
  const postalCode = formOptional(form, "postalCode");
  const deliveryZoneRaw = formString(form, "deliveryZone");
  const deliveryInstructions = formOptional(form, "deliveryInstructions");
  const paymentMethodRaw = formString(form, "paymentMethod");
  const bkashReference = formOptional(form, "bkashReference");
  const idempotencyKey =
    formString(form, "idempotencyKey") ||
    `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  // Lines are submitted as repeated `lines[<index>][productId|quantity|size|color]`
  // fields. The form has at most 100 lines (more than the cart allows).
  const lineMap = new Map<
    number,
    { productId: string; quantity: number; size?: string; color?: string }
  >();
  for (const [key, value] of form.entries()) {
    const match = /^lines\[(\d+)\]\[(\w+)\]$/.exec(key);
    if (!match) continue;
    const index = Number.parseInt(match[1] ?? "", 10);
    const field = match[2] ?? "";
    if (!Number.isFinite(index)) continue;
    const entry = lineMap.get(index) ?? {
      productId: "",
      quantity: 1,
      size: undefined,
      color: undefined,
    };
    if (field === "productId" && typeof value === "string") {
      entry.productId = value;
    } else if (field === "quantity" && typeof value === "string") {
      const n = Number.parseInt(value, 10);
      if (Number.isFinite(n)) entry.quantity = n;
    } else if (field === "size" && typeof value === "string") {
      entry.size = value;
    } else if (field === "color" && typeof value === "string") {
      entry.color = value;
    }
    lineMap.set(index, entry);
  }
  const lines = Array.from(lineMap.values())
    .filter((line) => line.productId)
    .map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      size: line.size,
      color: line.color,
    }));

  const fieldErrors: Record<string, string> = {};
  if (!customerName.trim()) fieldErrors.customerName = "Enter your full name.";
  if (!customerPhone.trim())
    fieldErrors.customerPhone = "Enter a contact phone number.";
  if (!recipientName.trim())
    fieldErrors["address.recipientName"] = "Enter the recipient's name.";
  if (!phone.trim())
    fieldErrors["address.phone"] = "Enter a contact phone for the recipient.";
  if (!district.trim())
    fieldErrors["address.district"] = "Enter the delivery district.";
  if (!addressLine.trim())
    fieldErrors["address.addressLine"] = "Enter a complete street address.";
  if (!isDeliveryZone(deliveryZoneRaw))
    fieldErrors["address.deliveryZone"] = "Choose a delivery area.";
  if (!isPaymentMethod(paymentMethodRaw))
    fieldErrors.paymentMethod = "Choose a payment method.";
  if (lines.length === 0)
    fieldErrors.lines = "Your bag is empty — add a product before checkout.";
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors,
      code: "validation_error",
    };
  }

  const input: PlaceOrderInput = {
    customerName,
    customerPhone,
    customerEmail: customerEmail ?? null,
    address: {
      recipientName,
      phone,
      district,
      locality: normaliseOptional(locality ?? null),
      addressLine,
      additionalDetails: normaliseOptional(additionalDetails ?? null),
      postalCode: normaliseOptional(postalCode ?? null),
      deliveryZone: deliveryZoneRaw as "inside_dhaka" | "outside_dhaka",
      deliveryInstructions: normaliseOptional(deliveryInstructions ?? null),
    },
    paymentMethod: paymentMethodRaw as OrderPaymentMethod,
    bkashReference: normaliseOptional(bkashReference ?? null),
    lines,
    idempotencyKey,
  };

  const result: PlaceOrderResult = await placeOrder(input);
  if (result.kind === "ok") {
    revalidatePath("/account/orders");
    revalidatePath("/admin/orders");
    return {
      ok: true,
      orderId: result.order.id,
      orderNumber: result.order.number,
    };
  }
  if (result.kind === "validation_error") {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: result.errors,
      code: "validation_error",
    };
  }
  if (result.kind === "not_authenticated") {
    return {
      ok: false,
      error: "Please sign in to place an order.",
      code: "not_authenticated",
    };
  }
  if (result.kind === "not_configured") {
    return {
      ok: false,
      error:
        "Order placement is not available because the order backend is not connected. Add the service-role key and database credentials to your environment, then run the migrations in /supabase.",
      code: "not_configured",
    };
  }
  if (result.kind === "idempotency_conflict") {
    return {
      ok: false,
      error:
        "We detected a duplicate submission with different order contents. Refresh the page and try again.",
      code: "idempotency_conflict",
    };
  }
  if (result.kind === "product_unavailable") {
    return {
      ok: false,
      error:
        "One or more products in your bag are no longer available. Please review your bag and try again.",
      code: "product_unavailable",
    };
  }
  if (result.kind === "price_changed") {
    return {
      ok: false,
      error:
        "The price of one or more products changed since you started checkout. Please review your bag and try again.",
      code: "error",
    };
  }
  return { ok: false, error: result.message, code: "error" };
}

/* ------------------------------------------------------------------ *
 * Admin status updates
 * ------------------------------------------------------------------ */

export type AdminOrderActionResult =
  | { ok: true }
  | { ok: false; error: string; code: string };

export async function updateOrderStatusAction(
  form: FormData,
): Promise<AdminOrderActionResult> {
  const orderId = formString(form, "orderId");
  const nextRaw = formString(form, "nextStatus");
  const note = formOptional(form, "note");
  if (!isUuid(orderId)) {
    return { ok: false, error: "Order not found.", code: "not_found" };
  }
  if (!isOrderStatus(nextRaw)) {
    return { ok: false, error: "Invalid status.", code: "validation_error" };
  }
  // Defensive: the service enforces the transition graph, but we
  // can pre-check a few obvious cases to surface a clean error.
  if (!isValidOrderTransition("pending_confirmation", nextRaw) &&
      !isValidOrderTransition("confirmed", nextRaw) &&
      !isValidOrderTransition("processing", nextRaw) &&
      !isValidOrderTransition("shipped", nextRaw) &&
      !isValidOrderTransition("delivered", nextRaw)) {
    return { ok: false, error: "Invalid status transition.", code: "validation_error" };
  }
  const input: UpdateOrderStatusInput = {
    orderId,
    nextStatus: nextRaw,
    note: note ?? null,
  };
  const result: UpdateOrderStatusResult = await updateOrderStatus(input);
  if (result.kind === "ok") {
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/admin/orders`);
    revalidatePath("/account/orders");
    return { ok: true };
  }
  if (result.kind === "forbidden") {
    return { ok: false, error: "You do not have access to this order.", code: "forbidden" };
  }
  if (result.kind === "not_authenticated") {
    return { ok: false, error: "Please sign in again.", code: "not_authenticated" };
  }
  if (result.kind === "not_configured") {
    return { ok: false, error: "The order backend is not configured.", code: "not_configured" };
  }
  if (result.kind === "not_found") {
    return { ok: false, error: "Order not found.", code: "not_found" };
  }
  if (result.kind === "invalid_transition") {
    return {
      ok: false,
      error: `Cannot change the order status from ${result.from} to ${result.to}.`,
      code: "invalid_transition",
    };
  }
  return { ok: false, error: result.message, code: "error" };
}

export async function updatePaymentStatusAction(
  form: FormData,
): Promise<AdminOrderActionResult> {
  const orderId = formString(form, "orderId");
  const nextRaw = formString(form, "nextStatus");
  const note = formOptional(form, "note");
  if (!isUuid(orderId)) {
    return { ok: false, error: "Order not found.", code: "not_found" };
  }
  if (!isPaymentStatus(nextRaw)) {
    return { ok: false, error: "Invalid payment status.", code: "validation_error" };
  }
  if (!isValidPaymentTransition("cod", nextRaw) && !isValidPaymentTransition("bkash", nextRaw)) {
    return { ok: false, error: "Invalid payment status transition.", code: "validation_error" };
  }
  const input: UpdatePaymentStatusInput = {
    orderId,
    nextStatus: nextRaw,
    note: note ?? null,
  };
  const result: UpdatePaymentStatusResult = await updatePaymentStatus(input);
  if (result.kind === "ok") {
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/admin/orders`);
    revalidatePath("/account/orders");
    return { ok: true };
  }
  if (result.kind === "forbidden") {
    return { ok: false, error: "You do not have access to this order.", code: "forbidden" };
  }
  if (result.kind === "not_authenticated") {
    return { ok: false, error: "Please sign in again.", code: "not_authenticated" };
  }
  if (result.kind === "not_configured") {
    return { ok: false, error: "The order backend is not configured.", code: "not_configured" };
  }
  if (result.kind === "not_found") {
    return { ok: false, error: "Order not found.", code: "not_found" };
  }
  return { ok: false, error: result.message, code: "error" };
}

export async function retryNotificationAction(
  form: FormData,
): Promise<AdminOrderActionResult> {
  const notificationId = formString(form, "notificationId");
  const orderId = formString(form, "orderId");
  if (!isUuid(notificationId) || !isUuid(orderId)) {
    return { ok: false, error: "Notification not found.", code: "not_found" };
  }
  const result: RetryNotificationResult = await retryNotification(notificationId);
  if (result.kind === "ok") {
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/admin/orders`);
    return { ok: true };
  }
  if (result.kind === "forbidden") {
    return { ok: false, error: "You do not have access to this order.", code: "forbidden" };
  }
  if (result.kind === "not_authenticated") {
    return { ok: false, error: "Please sign in again.", code: "not_authenticated" };
  }
  if (result.kind === "not_configured") {
    return { ok: false, error: "The order backend is not configured.", code: "not_configured" };
  }
  if (result.kind === "not_found") {
    return { ok: false, error: "Notification not found.", code: "not_found" };
  }
  if (result.kind === "not_retryable") {
    return { ok: false, error: "This notification has already been delivered.", code: "not_retryable" };
  }
  return { ok: false, error: result.message, code: "error" };
}
