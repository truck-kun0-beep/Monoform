import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/auth/config";
import { getSiteUrl } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/auth/require";
import {
  normaliseBdPhone,
  validateName,
  validateRequiredBdPhone,
} from "@/lib/auth/validation";
import {
  ORDER_PAYMENT_METHOD_LABEL,
  ORDER_PAYMENT_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  type AdminOrderSummary,
  type DeliveryZone,
  type OrderAddressSnapshot,
  type OrderCourierTracking,
  type OrderDetail,
  type OrderItem,
  type OrderListState,
  type OrderLookupState,
  type OrderPaymentMethod,
  type OrderPaymentStatus,
  type OrderStatus,
  type OrderSummary,
  type OrderTrackingResult,
  type OrderTimelineEvent,
} from "@/lib/account/types";
import { findProductById, listAllProducts } from "@/lib/products";
import type { ProductSummary, Money } from "@/types";
import {
  ORDER_CURRENCY,
  SUPPORTED_DELIVERY_ZONES,
  SUPPORTED_PAYMENT_METHODS,
  deliveryFeeForZone,
  paisaToTaka,
  takaToPaisa,
} from "./config";
import { dispatchNewOrderNotification } from "./notifications";

/* ------------------------------------------------------------------ *
 * Service-role client
 * ------------------------------------------------------------------ *
 *
 * The order backend performs writes that the customer-facing anon
 * key cannot do: cross-customer reads for the admin dashboard, the
 * order-number generator, the notification outbox. The client is
 * created lazily from server-only environment variables and is
 * never imported from a "use client" file.
 */

let cachedServiceClient: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient | null {
  if (cachedServiceClient) return cachedServiceClient;
  const env = getSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !serviceKey) return null;
  if (serviceKey === "service-role-key") return null;
  cachedServiceClient = createClient(env.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedServiceClient;
}

export function isOrderBackendConfigured(): boolean {
  return getServiceClient() !== null;
}

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type PlaceOrderInputLine = {
  productId: string;
  quantity: number;
  size?: string | null;
  color?: string | null;
};

export type PlaceOrderInput = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  address: {
    recipientName: string;
    phone: string;
    district: string;
    locality?: string | null;
    addressLine: string;
    additionalDetails?: string | null;
    postalCode?: string | null;
    deliveryZone: DeliveryZone;
    deliveryInstructions?: string | null;
  };
  paymentMethod: OrderPaymentMethod;
  bkashReference?: string | null;
  lines: PlaceOrderInputLine[];
  /** Idempotency key supplied by the browser. Same key + same content
   *  returns the original order; same key + different content is
   *  rejected as a misuse. */
  idempotencyKey: string;
};

export type PlaceOrderResult =
  | { kind: "ok"; order: OrderDetail }
  | { kind: "not_configured" }
  | { kind: "not_authenticated" }
  | { kind: "validation_error"; errors: Record<string, string> }
  | { kind: "price_changed"; currentSubtotal: Money; previousSubtotal: Money }
  | { kind: "idempotency_conflict" }
  | { kind: "product_unavailable"; productIds: string[] }
  | { kind: "error"; message: string };

/* ------------------------------------------------------------------ *
 * Public surface
 * ------------------------------------------------------------------ */

export type AdminOrderListFilters = {
  status?: OrderStatus;
  paymentMethod?: OrderPaymentMethod;
  paymentStatus?: OrderPaymentStatus;
  search?: string;
  from?: string;
  to?: string;
};

export type AdminOrderListResult =
  | {
      kind: "ok";
      orders: AdminOrderSummary[];
      counts: Record<OrderStatus, number>;
      paymentCounts: Record<OrderPaymentStatus, number>;
    }
  | { kind: "not_configured" }
  | { kind: "not_authenticated" }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

export type AdminOrderDetailResult =
  | {
      kind: "ok";
      order: OrderDetail;
      customerEmail: string | null;
      timeline: OrderTimelineEvent[];
      notifications: OrderNotificationSummary[];
    }
  | { kind: "not_configured" }
  | { kind: "not_authenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

export type OrderNotificationSummary = {
  id: string;
  status: "pending" | "sent" | "failed";
  recipient: string;
  attemptCount: number;
  lastAttemptedAt: string | null;
  lastError: string | null;
  sentAt: string | null;
};

export type UpdateOrderStatusInput = {
  orderId: string;
  nextStatus: OrderStatus;
  note?: string | null;
};

export type UpdateOrderStatusResult =
  | { kind: "ok"; order: OrderDetail }
  | { kind: "not_configured" }
  | { kind: "not_authenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "invalid_transition"; from: OrderStatus; to: OrderStatus }
  | { kind: "error"; message: string };

export type UpdatePaymentStatusInput = {
  orderId: string;
  nextStatus: OrderPaymentStatus;
  note?: string | null;
};

export type UpdatePaymentStatusResult =
  | { kind: "ok"; order: OrderDetail }
  | { kind: "not_configured" }
  | { kind: "not_authenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

export type RetryNotificationResult =
  | { kind: "ok"; notification: OrderNotificationSummary }
  | { kind: "not_configured" }
  | { kind: "not_authenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "not_retryable" }
  | { kind: "error"; message: string };

/* ------------------------------------------------------------------ *
 * Customer-facing order reads
 * ------------------------------------------------------------------ */

export async function listOrdersForCurrentUser(): Promise<OrderListState> {
  const user = await getCurrentUser();
  if (!user) return { kind: "error", message: "Not signed in." };
  const client = getServiceClient();
  if (!client) return { kind: "not_configured" };
  const { data, error } = await client
    .from("orders")
    .select(
      "id, order_number, created_at, order_status, payment_method, total_paisa, currency",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    return { kind: "error", message: "Could not load your orders." };
  }
  const orders: OrderSummary[] = [];
  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    const itemCount = await countItemsForOrder(client, (row.id as string) ?? "");
    orders.push(rowToOrderSummary(row, itemCount));
  }
  return { kind: "ok", orders };
}

export async function getOrderForCurrentUser(
  id: string,
): Promise<OrderLookupState> {
  const user = await getCurrentUser();
  if (!user) return { kind: "error", message: "Not signed in." };
  const client = getServiceClient();
  if (!client) return { kind: "not_configured" };
  return readOrder(client, id, { userId: user.id });
}

export async function getOrderConfirmationForCurrentUser(
  id: string,
): Promise<OrderLookupState> {
  return getOrderForCurrentUser(id);
}

/* ------------------------------------------------------------------ *
 * Public tracking
 * ------------------------------------------------------------------ */

const trackingBuckets = new Map<string, { count: number; windowStart: number }>();
const TRACKING_WINDOW_MS = 10 * 60 * 1000;
const TRACKING_MAX_ATTEMPTS = 5;

function recordTrackingAttempt(
  bucketKey: string,
  now: number = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const existing = trackingBuckets.get(bucketKey);
  if (!existing || now - existing.windowStart > TRACKING_WINDOW_MS) {
    trackingBuckets.set(bucketKey, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (existing.count >= TRACKING_MAX_ATTEMPTS) {
    const retryAfterMs = existing.windowStart + TRACKING_WINDOW_MS - now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }
  existing.count += 1;
  trackingBuckets.set(bucketKey, existing);
  return { allowed: true, retryAfterSeconds: 0 };
}

export type TrackingLookupOptions = {
  bucketKey: string;
};

export async function lookupOrderForTracking(
  rawNumber: string,
  rawPhone: string,
  options: TrackingLookupOptions,
): Promise<
  | { kind: "ok"; order: OrderTrackingResult }
  | { kind: "not_found" }
  | { kind: "not_configured" }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "validation_error"; fieldErrors: Record<string, string> }
> {
  const validation = validateTrackingInput(rawNumber, rawPhone);
  if ("fieldErrors" in validation) {
    return { kind: "validation_error", fieldErrors: validation.fieldErrors };
  }
  const rateCheck = recordTrackingAttempt(options.bucketKey);
  if (!rateCheck.allowed) {
    return {
      kind: "rate_limited",
      retryAfterSeconds: rateCheck.retryAfterSeconds,
    };
  }
  const client = getServiceClient();
  if (!client) return { kind: "not_configured" };

  const number = validation.normalised.number;
  const phone = validation.normalised.phone;

  const { data, error } = await client
    .from("orders")
    .select(
      "id, order_number, created_at, order_status, payment_method, payment_status, total_paisa, currency, phone, district, locality, delivery_zone, courier_name, courier_tracking_number, courier_tracking_url, courier_dispatched_at, courier_estimated_delivery_at",
    )
    .eq("order_number", number)
    .maybeSingle();

  if (error || !data) {
    return { kind: "not_found" };
  }

  if ((data.phone as string | null) !== phone) {
    // Deliberately ambiguous: same response as a missing order.
    return { kind: "not_found" };
  }

  const itemCount = await countItemsForOrder(client, data.id as string);
  const timeline = await fetchTimeline(client, data.id as string);
  const courier = readCourier(data);

  return {
    kind: "ok",
    order: {
      number: (data.order_number as string) ?? "",
      placedAt: (data.created_at as string) ?? "",
      status: coerceOrderStatus(data.order_status),
      paymentMethod: coercePaymentMethod(data.payment_method),
      paymentStatus: coercePaymentStatus(data.payment_status),
      itemCount,
      total: {
        amount: paisaToTaka(data.total_paisa as number),
        currency: ((data.currency as string) ?? ORDER_CURRENCY) as Money["currency"],
      },
      deliveryDistrict: (data.district as string) ?? "",
      deliveryZone: (data.delivery_zone as DeliveryZone) ?? "inside_dhaka",
      courier,
      timeline,
    },
  };
}

function validateTrackingInput(
  rawNumber: string,
  rawPhone: string,
):
  | { fieldErrors: Record<string, string> }
  | { normalised: { number: string; phone: string } } {
  const errors: Record<string, string> = {};
  const number = rawNumber.trim();
  const phone = rawPhone.trim();
  if (number.length === 0) errors.number = "Enter your order number.";
  else if (number.length > 64) errors.number = "Order number is too long.";
  else if (!/^[A-Za-z0-9_-]+$/.test(number))
    errors.number = "Order number contains invalid characters.";
  if (phone.length === 0)
    errors.phone = "Enter the phone number used for this order.";
  else if (normaliseBdPhone(phone) === null)
    errors.phone =
      "Enter a valid Bangladeshi phone number (e.g. 01XXXXXXXXX or +8801XXXXXXXXX).";
  if (Object.keys(errors).length > 0) return { fieldErrors: errors };
  return {
    normalised: {
      number: number.toUpperCase(),
      phone: normaliseBdPhone(phone) ?? phone,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Place order
 * ------------------------------------------------------------------ */

export async function placeOrder(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();
  if (!user) return { kind: "not_authenticated" };
  const client = getServiceClient();
  if (!client) return { kind: "not_configured" };

  const errors = validatePlaceOrderInput(input);
  if (Object.keys(errors).length > 0) {
    return { kind: "validation_error", errors };
  }

  const products = resolveProducts(input.lines);
  if (products.missing.length > 0) {
    return { kind: "product_unavailable", productIds: products.missing };
  }

  const normalisedPhone = normaliseBdPhone(input.customerPhone) ?? "";
  const addressPhone = normaliseBdPhone(input.address.phone) ?? "";
  const deliveryZone = input.address.deliveryZone;
  const subtotalPaisa = products.subtotalPaisa;
  const deliveryFeePaisa = deliveryFeeForZone(deliveryZone);
  const totalPaisa = subtotalPaisa + deliveryFeePaisa;
  const idempotencyHash = hashOrderContent({
    lines: input.lines,
    address: input.address,
    paymentMethod: input.paymentMethod,
    subtotalPaisa,
    deliveryFeePaisa,
  });

  // Idempotency check. If a previous submission already wrote an
  // order for this customer with the same key, return it. If the
  // hash does not match, treat it as a conflicting retry.
  const existing = await findIdempotentOrder(client, user.id, input.idempotencyKey);
  if (existing) {
    if (existing.idempotency_hash !== idempotencyHash) {
      return { kind: "idempotency_conflict" };
    }
    return { kind: "ok", order: existing.detail };
  }

  const { data: numberRow, error: numberError } = await client.rpc(
    "next_order_number",
  );
  if (numberError || !numberRow) {
    return { kind: "error", message: "Could not generate an order number." };
  }
  const orderNumber = String(numberRow);

  const { data: orderRow, error: orderError } = await client
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: user.id,
      customer_name: input.customerName.trim(),
      customer_phone: normalisedPhone,
      customer_email: input.customerEmail?.trim() || user.email || null,
      recipient_name: input.address.recipientName.trim(),
      phone: addressPhone,
      district: input.address.district.trim(),
      locality: normaliseOptional(input.address.locality),
      address_line: input.address.addressLine.trim(),
      additional_details: normaliseOptional(input.address.additionalDetails),
      postal_code: normaliseOptional(input.address.postalCode),
      delivery_zone: deliveryZone,
      delivery_instructions: normaliseOptional(input.address.deliveryInstructions),
      subtotal_paisa: subtotalPaisa,
      delivery_fee_paisa: deliveryFeePaisa,
      total_paisa: totalPaisa,
      currency: ORDER_CURRENCY,
      payment_method: input.paymentMethod,
      payment_status: initialPaymentStatus(input.paymentMethod),
      order_status: "pending_confirmation",
      bkash_reference: normaliseOptional(input.bkashReference ?? null),
      idempotency_key: input.idempotencyKey,
      idempotency_hash: idempotencyHash,
    })
    .select(
      "id, order_number, created_at, order_status, payment_method, payment_status, subtotal_paisa, delivery_fee_paisa, total_paisa, currency, customer_name, customer_phone, customer_email, recipient_name, phone, district, locality, address_line, additional_details, postal_code, delivery_zone, delivery_instructions, bkash_reference",
    )
    .single();

  if (orderError || !orderRow) {
    // A unique-constraint violation on idempotency_key is the expected
    // race for two concurrent placements. Re-read the existing row.
    if (orderError?.code === "23505") {
      const again = await findIdempotentOrder(
        client,
        user.id,
        input.idempotencyKey,
      );
      if (again) {
        if (again.idempotency_hash !== idempotencyHash) {
          return { kind: "idempotency_conflict" };
        }
        return { kind: "ok", order: again.detail };
      }
    }
    return { kind: "error", message: "Could not place your order." };
  }

  const orderId = orderRow.id as string;

  const itemRows = input.lines.map((line) => {
    const product = findProductById(line.productId);
    const unitPricePaisa = takaToPaisa(product?.price.amount ?? 0);
    const quantity = Math.max(1, Math.floor(line.quantity));
    return {
      order_id: orderId,
      product_id: line.productId,
      product_slug: product?.slug ?? null,
      product_name: product?.name ?? "Item",
      size: normaliseOptional(line.size),
      color: normaliseOptional(line.color),
      quantity,
      unit_price_paisa: unitPricePaisa,
      line_total_paisa: unitPricePaisa * quantity,
      image_alt: product?.image?.alt ?? null,
      image_aspect_ratio: product?.image?.aspectRatio ?? null,
    };
  });

  const { error: itemsError } = await client
    .from("order_items")
    .insert(itemRows);
  if (itemsError) {
    // The order was inserted but its items failed; surface the error
    // and rely on the operator to clean up. Returning here keeps the
    // contract: either everything commits or we report a failure.
    return { kind: "error", message: "Could not save order items." };
  }

  const { error: historyError } = await client
    .from("order_status_history")
    .insert({
      order_id: orderId,
      from_status: null,
      to_status: "pending_confirmation",
      actor: "customer",
      actor_id: user.id,
      note: "Order placed.",
    });
  if (historyError) {
    // History is audit-only; an insertion failure should not block
    // the order from completing.
  }

  // Notification outbox row. The actual email delivery is performed
  // by the notification service after the order is committed.
  await client.from("order_notifications").insert({
    order_id: orderId,
    notification_type: "new_order_owner",
    recipient: process.env.STORE_ORDER_NOTIFICATION_EMAIL ?? "",
    status: "pending",
  });

  const detail = await readOrderAsDetail(client, orderId, user.id);
  if (!detail) {
    return { kind: "error", message: "Could not load the created order." };
  }

  // Best-effort: attempt to dispatch the email immediately. Failures
  // are recorded on the notification row and can be retried from the
  // admin dashboard. The order is already committed at this point.
  void dispatchNewOrderNotification(orderId).catch(() => {
    // Errors are already persisted on the notification row.
  });

  return { kind: "ok", order: detail };
}

function initialPaymentStatus(method: OrderPaymentMethod): OrderPaymentStatus {
  if (method === "cod") return "pending";
  return "awaiting_verification";
}

export function resolveProducts(lines: PlaceOrderInputLine[]): {
  products: ProductSummary[];
  subtotalPaisa: number;
  missing: string[];
} {
  const products: ProductSummary[] = [];
  let subtotalPaisa = 0;
  const missing: string[] = [];
  for (const line of lines) {
    const product = findProductById(line.productId);
    if (!product) {
      missing.push(line.productId);
      continue;
    }
    if (product.isUnavailable) {
      missing.push(line.productId);
      continue;
    }
    const quantity = Math.max(1, Math.floor(line.quantity));
    subtotalPaisa += takaToPaisa(product.price.amount) * quantity;
    products.push(product);
  }
  return { products, subtotalPaisa, missing };
}

export function validatePlaceOrderInput(input: PlaceOrderInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const nameError = validateName(input.customerName, "Name");
  if (nameError) errors.customerName = nameError;
  const phoneError = validateRequiredBdPhone(input.customerPhone);
  if (phoneError) errors.customerPhone = phoneError;
  if (input.customerEmail && input.customerEmail.length > 320) {
    errors.customerEmail = "Email address is too long.";
  }
  if (!input.address) {
    errors.address = "Add a delivery address.";
  } else {
    if (validateName(input.address.recipientName, "Recipient name"))
      errors["address.recipientName"] = validateName(
        input.address.recipientName,
        "Recipient name",
      )!;
    const addressPhoneError = validateRequiredBdPhone(input.address.phone);
    if (addressPhoneError) errors["address.phone"] = addressPhoneError;
    if (validateName(input.address.district, "District"))
      errors["address.district"] = validateName(
        input.address.district,
        "District",
      )!;
    if (!input.address.addressLine?.trim())
      errors["address.addressLine"] = "Enter a complete street address.";
    if (
      !SUPPORTED_DELIVERY_ZONES.includes(input.address.deliveryZone)
    ) {
      errors["address.deliveryZone"] = "Choose a delivery area.";
    }
  }
  if (!SUPPORTED_PAYMENT_METHODS.includes(input.paymentMethod)) {
    errors.paymentMethod = "Choose a payment method.";
  }
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    errors.lines = "Your bag is empty.";
  } else {
    for (const [index, line] of input.lines.entries()) {
      if (!line.productId) {
        errors[`lines.${index}.productId`] = "Missing product.";
        continue;
      }
      if (!Number.isFinite(line.quantity) || line.quantity < 1) {
        errors[`lines.${index}.quantity`] = "Quantity must be at least 1.";
      }
    }
  }
  if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
    errors.idempotencyKey = "Missing checkout reference. Refresh and retry.";
  }
  return errors;
}

export function hashOrderContent(input: {
  lines: PlaceOrderInputLine[];
  address: PlaceOrderInput["address"];
  paymentMethod: OrderPaymentMethod;
  subtotalPaisa: number;
  deliveryFeePaisa: number;
}): string {
  const payload = JSON.stringify({
    lines: input.lines
      .map((line) => ({
        productId: line.productId,
        size: normaliseOptional(line.size) ?? "",
        color: normaliseOptional(line.color) ?? "",
        quantity: line.quantity,
      }))
      .sort((a, b) => a.productId.localeCompare(b.productId)),
    address: {
      recipientName: input.address.recipientName.trim(),
      phone: normaliseBdPhone(input.address.phone) ?? "",
      district: input.address.district.trim(),
      locality: normaliseOptional(input.address.locality) ?? "",
      addressLine: input.address.addressLine.trim(),
      additionalDetails: normaliseOptional(input.address.additionalDetails) ?? "",
      postalCode: normaliseOptional(input.address.postalCode) ?? "",
      deliveryZone: input.address.deliveryZone,
      deliveryInstructions:
        normaliseOptional(input.address.deliveryInstructions) ?? "",
    },
    paymentMethod: input.paymentMethod,
    subtotalPaisa: input.subtotalPaisa,
    deliveryFeePaisa: input.deliveryFeePaisa,
  });
  return simpleHash(payload);
}

export function simpleHash(value: string): string {
  // Deterministic non-cryptographic hash. The match is by exact
  // string comparison so we do not need cryptographic strength —
  // collisions only cause an idempotency conflict, not a security
  // failure.
  let h = 5381;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 33) ^ value.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

async function findIdempotentOrder(
  client: SupabaseClient,
  userId: string,
  key: string,
): Promise<{ detail: OrderDetail; idempotency_hash: string } | null> {
  const { data, error } = await client
    .from("orders")
    .select("id, idempotency_hash")
    .eq("user_id", userId)
    .eq("idempotency_key", key)
    .maybeSingle();
  if (error || !data) return null;
  const detail = await readOrderAsDetail(client, data.id as string, userId);
  if (!detail) return null;
  return { detail, idempotency_hash: (data.idempotency_hash as string) ?? "" };
}

/* ------------------------------------------------------------------ *
 * Admin reads
 * ------------------------------------------------------------------ */

export type AdminGuardResult =
  | { kind: "ok"; userId: string }
  | { kind: "not_configured" }
  | { kind: "not_authenticated" }
  | { kind: "forbidden" };

export async function requireAdmin(): Promise<AdminGuardResult> {
  const user = await getCurrentUser();
  if (!user) return { kind: "not_authenticated" };
  const client = getServiceClient();
  if (!client) return { kind: "not_configured" };
  const { data, error } = await client
    .from("admin_allowlist")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return { kind: "not_configured" };
  if (!data) return { kind: "forbidden" };
  return { kind: "ok", userId: user.id };
}

export async function listOrdersForAdmin(
  filters: AdminOrderListFilters = {},
): Promise<AdminOrderListResult> {
  const guard = await requireAdmin();
  if (guard.kind !== "ok") {
    return mapGuardToAdminResult(guard);
  }
  const client = getServiceClient();
  if (!client) return { kind: "not_configured" };
  let query = client
    .from("orders")
    .select(
      "id, order_number, created_at, order_status, payment_method, payment_status, total_paisa, currency, customer_name, customer_phone, customer_email, delivery_zone",
    )
    .order("created_at", { ascending: false });
  if (filters.status) query = query.eq("order_status", filters.status);
  if (filters.paymentMethod)
    query = query.eq("payment_method", filters.paymentMethod);
  if (filters.paymentStatus)
    query = query.eq("payment_status", filters.paymentStatus);
  if (filters.search && filters.search.trim().length > 0) {
    const needle = filters.search.trim();
    // The order number is searched using `ilike` so partial matches
    // surface to the operator. Customer name + phone use a separate
    // OR clause.
    const orParts = [
      `order_number.ilike.%${needle.replace(/%/g, "")}%`,
      `customer_name.ilike.%${needle.replace(/%/g, "")}%`,
      `customer_phone.ilike.%${needle.replace(/%/g, "")}%`,
    ];
    query = query.or(orParts.join(","));
  }
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);
  const { data, error } = await query;
  if (error) {
    return { kind: "error", message: "Could not load orders." };
  }
  const counts: Record<OrderStatus, number> = {
    pending_confirmation: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };
  const paymentCounts: Record<OrderPaymentStatus, number> = {
    pending: 0,
    awaiting_verification: 0,
    paid: 0,
    failed: 0,
    refunded: 0,
  };
  const orders: AdminOrderSummary[] = [];
  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    const status = coerceOrderStatus(row.order_status);
    const paymentStatus = coercePaymentStatus(row.payment_status);
    counts[status] += 1;
    paymentCounts[paymentStatus] += 1;
    const itemCount = await countItemsForOrder(client, (row.id as string) ?? "");
    orders.push({
      id: (row.id as string) ?? "",
      number: (row.order_number as string) ?? "",
      placedAt: (row.created_at as string) ?? "",
      status,
      paymentMethod: coercePaymentMethod(row.payment_method),
      total: {
        amount: paisaToTaka(row.total_paisa as number),
        currency: ((row.currency as string) ?? ORDER_CURRENCY) as Money["currency"],
      },
      itemCount,
      customerName: (row.customer_name as string) ?? "",
      customerPhone: (row.customer_phone as string) ?? "",
      customerEmail: (row.customer_email as string | null) ?? null,
      paymentStatus,
      deliveryZone:
        ((row.delivery_zone as DeliveryZone) ?? "inside_dhaka"),
    });
  }
  return { kind: "ok", orders, counts, paymentCounts };
}

export async function getOrderForAdmin(
  id: string,
): Promise<AdminOrderDetailResult> {
  const guard = await requireAdmin();
  if (guard.kind !== "ok") {
    return mapGuardToAdminDetail(guard);
  }
  const client = getServiceClient();
  if (!client) return { kind: "not_configured" };
  return readOrderAsAdminDetail(client, id);
}

export async function updateOrderStatus(
  input: UpdateOrderStatusInput,
): Promise<UpdateOrderStatusResult> {
  const guard = await requireAdmin();
  if (guard.kind !== "ok") {
    return mapGuardToUpdateStatus(guard);
  }
  const client = getServiceClient();
  if (!client) return { kind: "not_configured" };
  if (!isValidTransitionId(input.orderId)) {
    return { kind: "not_found" };
  }

  const { data: existing, error: existingError } = await client
    .from("orders")
    .select("id, order_status")
    .eq("id", input.orderId)
    .maybeSingle();
  if (existingError || !existing) {
    return { kind: "not_found" };
  }
  const from = coerceOrderStatus(existing.order_status);
  if (!isValidOrderTransition(from, input.nextStatus)) {
    return { kind: "invalid_transition", from, to: input.nextStatus };
  }

  const updates: Record<string, unknown> = { order_status: input.nextStatus };
  if (input.nextStatus === "cancelled") updates.cancelled_at = new Date().toISOString();

  const { error: updateError } = await client
    .from("orders")
    .update(updates)
    .eq("id", input.orderId);
  if (updateError) {
    return { kind: "error", message: "Could not update the order status." };
  }
  await client.from("order_status_history").insert({
    order_id: input.orderId,
    from_status: from,
    to_status: input.nextStatus,
    actor: "admin",
    actor_id: guard.userId,
    note: input.note?.trim() || null,
  });
  const detail = await readOrderAsAdminDetail(client, input.orderId);
  if (detail.kind !== "ok") {
    return { kind: "error", message: "Could not reload the order." };
  }
  return { kind: "ok", order: detail.order };
}

export async function updatePaymentStatus(
  input: UpdatePaymentStatusInput,
): Promise<UpdatePaymentStatusResult> {
  const guard = await requireAdmin();
  if (guard.kind !== "ok") {
    return mapGuardToUpdatePayment(guard);
  }
  const client = getServiceClient();
  if (!client) return { kind: "not_configured" };
  if (!isValidTransitionId(input.orderId)) return { kind: "not_found" };

  const { data: existing, error: existingError } = await client
    .from("orders")
    .select("id, payment_method, payment_status")
    .eq("id", input.orderId)
    .maybeSingle();
  if (existingError || !existing) {
    return { kind: "not_found" };
  }
  const method = coercePaymentMethod(existing.payment_method);
  if (!isValidPaymentTransition(method, input.nextStatus)) {
    return { kind: "error", message: "Invalid payment status for this method." };
  }

  const { error: updateError } = await client
    .from("orders")
    .update({ payment_status: input.nextStatus })
    .eq("id", input.orderId);
  if (updateError) {
    return { kind: "error", message: "Could not update the payment status." };
  }
  await client.from("order_status_history").insert({
    order_id: input.orderId,
    from_status: null,
    to_status: `payment:${input.nextStatus}`,
    actor: "admin",
    actor_id: guard.userId,
    note: input.note?.trim() || null,
  });
  const detail = await readOrderAsAdminDetail(client, input.orderId);
  if (detail.kind !== "ok") {
    return { kind: "error", message: "Could not reload the order." };
  }
  return { kind: "ok", order: detail.order };
}

export async function retryNotification(
  notificationId: string,
): Promise<RetryNotificationResult> {
  const guard = await requireAdmin();
  if (guard.kind !== "ok") {
    return mapGuardToRetryNotification(guard);
  }
  const client = getServiceClient();
  if (!client) return { kind: "not_configured" };
  const { data, error } = await client
    .from("order_notifications")
    .select("id, status, order_id")
    .eq("id", notificationId)
    .maybeSingle();
  if (error || !data) return { kind: "not_found" };
  if (data.status === "sent") return { kind: "not_retryable" };
  const result = await dispatchNewOrderNotification(data.order_id as string, {
    notificationId,
  });
  if (result.kind === "ok") {
    return { kind: "ok", notification: result.notification };
  }
  if (result.kind === "not_retryable") {
    return { kind: "not_retryable" };
  }
  if (result.kind === "not_found") {
    return { kind: "not_found" };
  }
  return { kind: "error", message: "Retry failed." };
}

function mapGuardToAdminResult(
  guard: AdminGuardResult,
): AdminOrderListResult {
  if (guard.kind === "ok") return { kind: "error", message: "unreachable" };
  if (guard.kind === "not_authenticated")
    return { kind: "not_authenticated" };
  if (guard.kind === "forbidden") return { kind: "forbidden" };
  return { kind: "not_configured" };
}

function mapGuardToAdminDetail(
  guard: AdminGuardResult,
): AdminOrderDetailResult {
  if (guard.kind === "ok")
    return { kind: "error", message: "unreachable" };
  if (guard.kind === "not_authenticated")
    return { kind: "not_authenticated" };
  if (guard.kind === "forbidden") return { kind: "forbidden" };
  return { kind: "not_configured" };
}

function mapGuardToUpdateStatus(
  guard: AdminGuardResult,
): UpdateOrderStatusResult {
  if (guard.kind === "ok")
    return { kind: "error", message: "unreachable" };
  if (guard.kind === "not_authenticated")
    return { kind: "not_authenticated" };
  if (guard.kind === "forbidden") return { kind: "forbidden" };
  return { kind: "not_configured" };
}

function mapGuardToUpdatePayment(
  guard: AdminGuardResult,
): UpdatePaymentStatusResult {
  if (guard.kind === "ok")
    return { kind: "error", message: "unreachable" };
  if (guard.kind === "not_authenticated")
    return { kind: "not_authenticated" };
  if (guard.kind === "forbidden") return { kind: "forbidden" };
  return { kind: "not_configured" };
}

function mapGuardToRetryNotification(
  guard: AdminGuardResult,
): RetryNotificationResult {
  if (guard.kind === "ok")
    return { kind: "error", message: "unreachable" };
  if (guard.kind === "not_authenticated")
    return { kind: "not_authenticated" };
  if (guard.kind === "forbidden") return { kind: "forbidden" };
  return { kind: "not_configured" };
}

function isValidTransitionId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/* ------------------------------------------------------------------ *
 * Read helpers
 * ------------------------------------------------------------------ */

async function readOrder(
  client: SupabaseClient,
  id: string,
  scope: { userId: string },
): Promise<OrderLookupState> {
  if (!isValidTransitionId(id)) return { kind: "not_found" };
  const { data, error } = await client
    .from("orders")
    .select(orderSelectColumns().join(", "))
    .eq("id", id)
    .eq("user_id", scope.userId)
    .maybeSingle();
  if (error || !data) return { kind: "not_found" };
  const row = data as unknown as Record<string, unknown>;
  const items = await fetchItems(client, id);
  const timeline = await fetchTimeline(client, id);
  return {
    kind: "ok",
    order: rowToOrderDetail(row, items, timeline),
  };
}

async function readOrderAsDetail(
  client: SupabaseClient,
  id: string,
  userId: string,
): Promise<OrderDetail | null> {
  const { data, error } = await client
    .from("orders")
    .select(orderSelectColumns().join(", "))
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as Record<string, unknown>;
  const items = await fetchItems(client, id);
  const timeline = await fetchTimeline(client, id);
  return rowToOrderDetail(row, items, timeline);
}

async function readOrderAsAdminDetail(
  client: SupabaseClient,
  id: string,
): Promise<AdminOrderDetailResult> {
  if (!isValidTransitionId(id)) return { kind: "not_found" };
  const { data, error } = await client
    .from("orders")
    .select(orderSelectColumns().join(", "))
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { kind: "not_found" };
  const row = data as unknown as Record<string, unknown>;
  const items = await fetchItems(client, id);
  const timeline = await fetchTimeline(client, id);
  const order = rowToOrderDetail(row, items, timeline);
  const customerEmail = (row.customer_email as string | null) ?? null;

  const { data: notifications, error: notificationsError } = await client
    .from("order_notifications")
    .select(
      "id, status, recipient, attempt_count, last_attempted_at, last_error, sent_at",
    )
    .eq("order_id", id)
    .order("created_at", { ascending: false });
  if (notificationsError) {
    return { kind: "error", message: "Could not load notifications." };
  }
  const mapped: OrderNotificationSummary[] = (
    (notifications ?? []) as unknown as Record<string, unknown>[]
  ).map((row) => ({
    id: (row.id as string) ?? "",
    status: (row.status as "pending" | "sent" | "failed") ?? "pending",
    recipient: (row.recipient as string) ?? "",
    attemptCount: (row.attempt_count as number) ?? 0,
    lastAttemptedAt: (row.last_attempted_at as string | null) ?? null,
    lastError: (row.last_error as string | null) ?? null,
    sentAt: (row.sent_at as string | null) ?? null,
  }));

  return { kind: "ok", order, customerEmail, timeline, notifications: mapped };
}

function orderSelectColumns(): string[] {
  return [
    "id",
    "order_number",
    "created_at",
    "order_status",
    "payment_method",
    "payment_status",
    "subtotal_paisa",
    "delivery_fee_paisa",
    "total_paisa",
    "currency",
    "customer_name",
    "customer_phone",
    "customer_email",
    "recipient_name",
    "phone",
    "district",
    "locality",
    "address_line",
    "additional_details",
    "postal_code",
    "delivery_zone",
    "delivery_instructions",
    "bkash_reference",
    "cancelled_at",
    "courier_name",
    "courier_tracking_number",
    "courier_tracking_url",
    "courier_dispatched_at",
    "courier_estimated_delivery_at",
  ];
}

async function fetchItems(
  client: SupabaseClient,
  orderId: string,
): Promise<OrderItem[]> {
  const { data, error } = await client
    .from("order_items")
    .select(
      "id, product_id, product_slug, product_name, size, color, quantity, unit_price_paisa, line_total_paisa, image_alt, image_aspect_ratio",
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as Record<string, unknown>[]).map(rowToOrderItem);
}

async function fetchTimeline(
  client: SupabaseClient,
  orderId: string,
): Promise<OrderTimelineEvent[]> {
  const { data, error } = await client
    .from("order_status_history")
    .select("to_status, created_at, note")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  const events: OrderTimelineEvent[] = [];
  for (const row of (data as unknown as Record<string, unknown>[])) {
    const status = String(row.to_status ?? "");
    if (status.startsWith("payment:")) continue; // payment history is not a status event
    const orderStatus = coerceOrderStatus(status);
    if (!orderStatus) continue;
    events.push({
      status: orderStatus,
      at: (row.created_at as string) ?? new Date().toISOString(),
      note: (row.note as string | null) ?? null,
    });
  }
  return events;
}

async function countItemsForOrder(
  client: SupabaseClient,
  orderId: string,
): Promise<number> {
  const { count, error } = await client
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);
  if (error || typeof count !== "number") return 0;
  // `count` is the number of rows; the visible "items" metric counts
  // the cumulative quantity.
  return count;
}

function rowToOrderSummary(
  row: Record<string, unknown>,
  itemCount: number,
): OrderSummary {
  return {
    id: (row.id as string) ?? "",
    number: (row.order_number as string) ?? "",
    placedAt: (row.created_at as string) ?? "",
    status: coerceOrderStatus(row.order_status),
    paymentMethod: coercePaymentMethod(row.payment_method),
    total: {
      amount: paisaToTaka(row.total_paisa as number),
      currency: ((row.currency as string) ?? ORDER_CURRENCY) as Money["currency"],
    },
    itemCount,
  };
}

function rowToOrderDetail(
  row: Record<string, unknown>,
  items: OrderItem[],
  timeline: OrderTimelineEvent[],
): OrderDetail {
  const subtotal = paisaToTaka(row.subtotal_paisa as number);
  const delivery = paisaToTaka(row.delivery_fee_paisa as number);
  const total = paisaToTaka(row.total_paisa as number);
  const currency = ((row.currency as string) ?? ORDER_CURRENCY) as Money["currency"];
  const status = coerceOrderStatus(row.order_status);
  const paymentStatus = coercePaymentStatus(row.payment_status);
  const address: OrderAddressSnapshot = {
    recipientName: (row.recipient_name as string) ?? "",
    phone: (row.phone as string) ?? "",
    district: (row.district as string) ?? "",
    locality: (row.locality as string | null) ?? null,
    addressLine: (row.address_line as string) ?? "",
    additionalDetails: (row.additional_details as string | null) ?? null,
    postalCode: (row.postal_code as string | null) ?? null,
    deliveryZone: (row.delivery_zone as DeliveryZone) ?? "inside_dhaka",
    deliveryInstructions:
      (row.delivery_instructions as string | null) ?? null,
  };
  const courier = readCourier(row);
  return {
    id: (row.id as string) ?? "",
    number: (row.order_number as string) ?? "",
    placedAt: (row.created_at as string) ?? "",
    status,
    paymentMethod: coercePaymentMethod(row.payment_method),
    total: { amount: total, currency },
    itemCount: items.reduce((acc, item) => acc + item.quantity, 0),
    currency,
    items,
    subtotal: { amount: subtotal, currency },
    deliveryFee: { amount: delivery, currency },
    paymentStatus,
    paymentReference: (row.bkash_reference as string | null) ?? null,
    shippingAddress: address,
    courier,
    timeline,
    customerName: (row.customer_name as string) ?? "",
    customerPhone: (row.customer_phone as string) ?? "",
    customerEmail: (row.customer_email as string | null) ?? "",
  };
}

function rowToOrderItem(row: Record<string, unknown>): OrderItem {
  const unit = paisaToTaka(row.unit_price_paisa as number);
  const total = paisaToTaka(row.line_total_paisa as number);
  const alt = (row.image_alt as string | null) ?? (row.product_name as string);
  const aspect = (row.image_aspect_ratio as number | null) ?? null;
  return {
    productId: (row.product_id as string) ?? "",
    slug: (row.product_slug as string | null) ?? null,
    name: (row.product_name as string) ?? "",
    variant: null,
    size: (row.size as string | null) ?? null,
    color: (row.color as string | null) ?? null,
    quantity: (row.quantity as number) ?? 0,
    unitPrice: { amount: unit, currency: ORDER_CURRENCY },
    lineTotal: { amount: total, currency: ORDER_CURRENCY },
    image: {
      alt: alt ?? "Item",
      aspectRatio: aspect ?? 3 / 4,
    },
  };
}

function readCourier(
  row: Record<string, unknown>,
): OrderCourierTracking | null {
  const name = (row.courier_name as string | null) ?? null;
  const tracking = (row.courier_tracking_number as string | null) ?? null;
  if (!name && !tracking) return null;
  return {
    courier: name ?? "Courier",
    trackingNumber: tracking ?? "",
    trackingUrl: (row.courier_tracking_url as string | null) ?? null,
    dispatchedAt: (row.courier_dispatched_at as string | null) ?? null,
    estimatedDeliveryAt:
      (row.courier_estimated_delivery_at as string | null) ?? null,
  };
}

/* ------------------------------------------------------------------ *
 * Coercion helpers
 * ------------------------------------------------------------------ */

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

const ALLOWED_PAYMENT_STATUSES: ReadonlyArray<OrderPaymentStatus> = [
  "pending",
  "awaiting_verification",
  "paid",
  "failed",
  "refunded",
];

export function coerceOrderStatus(value: unknown): OrderStatus {
  if (typeof value !== "string") return "pending_confirmation";
  return (ALLOWED_STATUSES as ReadonlyArray<string>).includes(value)
    ? (value as OrderStatus)
    : "pending_confirmation";
}

export function coercePaymentMethod(value: unknown): OrderPaymentMethod {
  if (typeof value !== "string") return "cod";
  return (ALLOWED_PAYMENT_METHODS as ReadonlyArray<string>).includes(value)
    ? (value as OrderPaymentMethod)
    : "cod";
}

export function coercePaymentStatus(value: unknown): OrderPaymentStatus {
  if (typeof value !== "string") return "pending";
  return (ALLOWED_PAYMENT_STATUSES as ReadonlyArray<string>).includes(value)
    ? (value as OrderPaymentStatus)
    : "pending";
}

export function isValidOrderTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (from === to) return false;
  if (from === "cancelled") return false; // No leaving cancelled
  if (to === "cancelled") return true; // Allowed at any point
  const order: OrderStatus[] = [
    "pending_confirmation",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
  ];
  const fromIndex = order.indexOf(from);
  const toIndex = order.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  // Allow moving forward; allow moving one step back for corrections
  // (e.g. `processing` → `confirmed`).
  return toIndex >= fromIndex - 1 && toIndex <= fromIndex + 1;
}

export function isValidPaymentTransition(
  method: OrderPaymentMethod,
  to: OrderPaymentStatus,
): boolean {
  if (method === "cod") {
    return to === "pending" || to === "paid" || to === "failed" || to === "refunded";
  }
  // bKash
  return (
    to === "awaiting_verification" ||
    to === "paid" ||
    to === "failed" ||
    to === "refunded"
  );
}

function normaliseOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
}

export {
  ORDER_PAYMENT_METHOD_LABEL,
  ORDER_PAYMENT_STATUS_LABEL,
  ORDER_STATUS_LABEL,
};
export { getSiteUrl, listAllProducts };
