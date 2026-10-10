import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/auth/config";
import { getSiteUrl } from "@/lib/auth/config";
import { ORDER_CURRENCY, paisaToTaka } from "./config";
import type {
  OrderAddressSnapshot,
  OrderDetail,
  OrderItem,
  OrderNotificationSummary,
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderStatus,
} from "@/lib/account";

/**
 * Notification pipeline for new orders.
 *
 * The order-placement path writes a `pending` row to the
 * `order_notifications` outbox before it returns. This module is
 * responsible for actually sending the email through Resend (or
 * another HTTP-compatible provider) and updating the row with the
 * result. A failure here is non-fatal: the order is already
 * committed and the admin can retry the delivery from the dashboard.
 *
 * The provider is intentionally abstracted so a future WhatsApp /
 * SMS channel can be added without touching the order-placement
 * code.
 */

type NotificationDispatchResult =
  | { kind: "ok"; notification: OrderNotificationSummary }
  | { kind: "not_retryable" }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

type EmailDispatchResult =
  | { kind: "sent"; providerId: string | null }
  | { kind: "failed"; error: string }
  | { kind: "skipped" };

let cachedServiceClient: SupabaseClient | null | undefined;

function getServiceClient(): SupabaseClient | null {
  if (cachedServiceClient !== undefined) return cachedServiceClient;
  const env = getSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !serviceKey || serviceKey === "service-role-key") {
    cachedServiceClient = null;
    return null;
  }
  // Lazy import to avoid pulling the SDK into modules that never
  // touch notifications.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  cachedServiceClient = createClient(env.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedServiceClient;
}

export async function dispatchNewOrderNotification(
  orderId: string,
  options: { notificationId?: string } = {},
): Promise<NotificationDispatchResult> {
  const client = getServiceClient();
  if (!client) return { kind: "error", message: "Order backend is not configured." };

  // Find the notification row.
  let notificationQuery = client
    .from("order_notifications")
    .select("id, status, recipient, notification_type, order_id")
    .eq("order_id", orderId)
    .eq("notification_type", "new_order_owner");
  if (options.notificationId) {
    notificationQuery = notificationQuery.eq("id", options.notificationId);
  }
  const { data: notificationRows, error: notificationError } =
    await notificationQuery
      .order("created_at", { ascending: false })
      .limit(1);
  if (notificationError || !notificationRows || notificationRows.length === 0) {
    return { kind: "not_found" };
  }
  const notification = notificationRows[0] as Record<string, unknown>;
  if (notification.status === "sent") {
    return { kind: "not_retryable" };
  }

  const { data: orderRow, error: orderError } = await client
    .from("orders")
    .select(
      "id, order_number, created_at, customer_name, customer_phone, customer_email, delivery_zone, total_paisa, currency, payment_method, payment_status, order_status, district, locality, address_line, additional_details, postal_code, recipient_name, phone, delivery_instructions, bkash_reference, subtotal_paisa, delivery_fee_paisa",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !orderRow) return { kind: "not_found" };

  const { data: itemRows, error: itemsError } = await client
    .from("order_items")
    .select(
      "product_id, product_slug, product_name, size, color, quantity, unit_price_paisa, line_total_paisa",
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (itemsError) {
    return { kind: "error", message: "Could not read order items." };
  }

  const { data: timelineRows, error: timelineError } = await client
    .from("order_status_history")
    .select("to_status, created_at, note")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (timelineError) {
    return { kind: "error", message: "Could not read order history." };
  }

  const order: OrderDetail = {
    id: orderId,
    number: (orderRow.order_number as string) ?? "",
    placedAt: (orderRow.created_at as string) ?? new Date().toISOString(),
    status: ((orderRow.order_status as OrderStatus) ??
      "pending_confirmation") as OrderStatus,
    paymentMethod: ((orderRow.payment_method as OrderPaymentMethod) ??
      "cod") as OrderPaymentMethod,
    paymentStatus: ((orderRow.payment_status as OrderPaymentStatus) ??
      "pending") as OrderPaymentStatus,
    total: {
      amount: paisaToTaka(orderRow.total_paisa as number),
      currency: ((orderRow.currency as string) ?? ORDER_CURRENCY) as OrderDetail["currency"],
    },
    itemCount: (itemRows ?? []).reduce(
      (acc: number, row: Record<string, unknown>) =>
        acc + ((row.quantity as number) ?? 0),
      0,
    ),
    currency: ((orderRow.currency as string) ?? ORDER_CURRENCY) as OrderDetail["currency"],
    items: (itemRows ?? []).map(rowToOrderItem),
    subtotal: {
      amount: paisaToTaka(orderRow.subtotal_paisa as number),
      currency: ((orderRow.currency as string) ?? ORDER_CURRENCY) as OrderDetail["currency"],
    },
    deliveryFee: {
      amount: paisaToTaka(orderRow.delivery_fee_paisa as number),
      currency: ((orderRow.currency as string) ?? ORDER_CURRENCY) as OrderDetail["currency"],
    },
    paymentReference: (orderRow.bkash_reference as string | null) ?? null,
    shippingAddress: rowToAddress(orderRow),
    courier: null,
    timeline: (timelineRows ?? [])
      .filter((row: Record<string, unknown>) => {
        const status = String(row.to_status ?? "");
        return !status.startsWith("payment:");
      })
      .map((row: Record<string, unknown>) => ({
        status: (row.to_status as OrderStatus) ?? "pending_confirmation",
        at: (row.created_at as string) ?? new Date().toISOString(),
        note: (row.note as string | null) ?? null,
      })),
    customerName: (orderRow.customer_name as string) ?? "",
    customerPhone: (orderRow.customer_phone as string) ?? "",
    customerEmail: (orderRow.customer_email as string | null) ?? "",
  };

  const adminLink = `${getSiteUrl().replace(/\/$/, "")}/admin/orders/${orderId}`;

  const dispatch = await sendOrderEmail({
    order,
    recipient: (notification.recipient as string) ?? "",
    adminLink,
  });

  if (dispatch.kind === "skipped") {
    // The provider is unconfigured. Leave the row pending so the
    // admin can retry once the env vars are populated. We still
    // bump the attempt counter for traceability.
    await bumpAttempt(client, notification.id as string, "Provider not configured.");
    return {
      kind: "ok",
      notification: {
        id: notification.id as string,
        status: "pending",
        recipient: (notification.recipient as string) ?? "",
        attemptCount: ((notification.attempt_count as number) ?? 0) + 1,
        lastAttemptedAt: new Date().toISOString(),
        lastError: "Email provider is not configured.",
        sentAt: null,
      },
    };
  }

  if (dispatch.kind === "failed") {
    await markFailed(
      client,
      notification.id as string,
      dispatch.error,
      ((notification.attempt_count as number) ?? 0) + 1,
    );
    return {
      kind: "ok",
      notification: {
        id: notification.id as string,
        status: "failed",
        recipient: (notification.recipient as string) ?? "",
        attemptCount: ((notification.attempt_count as number) ?? 0) + 1,
        lastAttemptedAt: new Date().toISOString(),
        lastError: dispatch.error,
        sentAt: null,
      },
    };
  }

  await markSent(
    client,
    notification.id as string,
    dispatch.providerId,
    ((notification.attempt_count as number) ?? 0) + 1,
  );
  return {
    kind: "ok",
    notification: {
      id: notification.id as string,
      status: "sent",
      recipient: (notification.recipient as string) ?? "",
      attemptCount: ((notification.attempt_count as number) ?? 0) + 1,
      lastAttemptedAt: new Date().toISOString(),
      lastError: null,
      sentAt: new Date().toISOString(),
    },
  };
}

function rowToOrderItem(row: Record<string, unknown>): OrderItem {
  return {
    productId: (row.product_id as string) ?? "",
    slug: (row.product_slug as string | null) ?? null,
    name: (row.product_name as string) ?? "Item",
    variant: null,
    size: (row.size as string | null) ?? null,
    color: (row.color as string | null) ?? null,
    quantity: (row.quantity as number) ?? 0,
    unitPrice: {
      amount: paisaToTaka(row.unit_price_paisa as number),
      currency: ORDER_CURRENCY,
    },
    lineTotal: {
      amount: paisaToTaka(row.line_total_paisa as number),
      currency: ORDER_CURRENCY,
    },
    image: { alt: (row.product_name as string) ?? "Item" },
  };
}

function rowToAddress(row: Record<string, unknown>): OrderAddressSnapshot {
  return {
    recipientName: (row.recipient_name as string) ?? "",
    phone: (row.phone as string) ?? "",
    district: (row.district as string) ?? "",
    locality: (row.locality as string | null) ?? null,
    addressLine: (row.address_line as string) ?? "",
    additionalDetails: (row.additional_details as string | null) ?? null,
    postalCode: (row.postal_code as string | null) ?? null,
    deliveryZone:
      ((row.delivery_zone as OrderAddressSnapshot["deliveryZone"]) ??
        "inside_dhaka"),
    deliveryInstructions:
      (row.delivery_instructions as string | null) ?? null,
  };
}

async function sendOrderEmail(input: {
  order: OrderDetail;
  recipient: string;
  adminLink: string;
}): Promise<EmailDispatchResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromAddress || !input.recipient) {
    return { kind: "skipped" };
  }
  if (apiKey === "re_xxx") return { kind: "skipped" };

  const subject = `[MONOFORM] New Order #${input.order.number}`;
  const html = renderOrderEmail(input.order, input.adminLink);
  const text = renderOrderEmailText(input.order, input.adminLink);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [input.recipient],
        subject,
        html,
        text,
      }),
    });
    if (!response.ok) {
      const detail = await safeReadError(response);
      return { kind: "failed", error: detail };
    }
    const json = (await response.json().catch(() => null)) as
      | { id?: string }
      | null;
    return { kind: "sent", providerId: json?.id ?? null };
  } catch (err) {
    return {
      kind: "failed",
      error: err instanceof Error ? err.message : "Unknown email provider error.",
    };
  }
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { message?: string; error?: string };
    return json.message || json.error || `Provider returned ${response.status}.`;
  } catch {
    return `Provider returned ${response.status}.`;
  }
}

async function bumpAttempt(
  client: SupabaseClient,
  notificationId: string,
  lastError: string,
): Promise<void> {
  // The dispatch attempt is recorded but the row stays in the
  // "pending" state so the admin can retry once the provider is
  // configured.
  await client
    .from("order_notifications")
    .update({
      last_attempted_at: new Date().toISOString(),
      last_error: lastError,
    })
    .eq("id", notificationId);
}

async function markFailed(
  client: SupabaseClient,
  notificationId: string,
  lastError: string,
  attemptCount: number,
): Promise<void> {
  await client
    .from("order_notifications")
    .update({
      status: "failed",
      attempt_count: attemptCount,
      last_attempted_at: new Date().toISOString(),
      last_error: lastError,
    })
    .eq("id", notificationId);
}

async function markSent(
  client: SupabaseClient,
  notificationId: string,
  providerId: string | null,
  attemptCount: number,
): Promise<void> {
  await client
    .from("order_notifications")
    .update({
      status: "sent",
      attempt_count: attemptCount,
      last_attempted_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      provider_message_id: providerId,
      last_error: null,
    })
    .eq("id", notificationId);
}

/* ------------------------------------------------------------------ *
 * Email rendering
 * ------------------------------------------------------------------ */

function renderOrderEmail(order: OrderDetail, adminLink: string): string {
  const total = formatTaka(order.total.amount);
  const subtotal = formatTaka(order.subtotal.amount);
  const delivery = formatTaka(order.deliveryFee.amount);
  const linesHtml = order.items
    .map((item) => {
      const variantBits: string[] = [];
      if (item.color) variantBits.push(`Colour: ${escapeHtml(item.color)}`);
      if (item.size) variantBits.push(`Size: ${escapeHtml(item.size)}`);
      const variantLine = variantBits.length
        ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #555;">${variantBits.join(" &middot; ")}</p>`
        : "";
      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
            <p style="margin: 0; font-weight: 500;">${escapeHtml(item.name)}</p>
            ${variantLine}
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; vertical-align: top; font-size: 14px;">
            ${item.quantity} &times; ${formatTaka(item.unitPrice.amount)}
            <div style="font-weight: 500; margin-top: 4px;">${formatTaka(item.lineTotal.amount)}</div>
          </td>
        </tr>`;
    })
    .join("");
  const address = order.shippingAddress;
  const addressHtml = `
    <p style="margin: 0;">${escapeHtml(address.recipientName)}</p>
    <p style="margin: 0;">${escapeHtml(address.phone)}</p>
    <p style="margin: 0;">${escapeHtml(address.addressLine)}</p>
    ${address.additionalDetails ? `<p style="margin: 0;">${escapeHtml(address.additionalDetails)}</p>` : ""}
    <p style="margin: 0;">${escapeHtml(address.locality ?? "")}${address.locality ? ", " : ""}${escapeHtml(address.district)}${address.postalCode ? " " + escapeHtml(address.postalCode) : ""}</p>
    <p style="margin: 4px 0 0 0; font-size: 13px; color: #555;">${address.deliveryZone === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka"}</p>
  `;
  return `<!doctype html>
<html lang="en">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #111; background: #fafaf7; padding: 24px;">
    <table style="max-width: 640px; margin: 0 auto; background: #fff; border: 1px solid #eee; width: 100%;">
      <tr>
        <td style="padding: 32px;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #888;">MONOFORM</p>
          <h1 style="margin: 8px 0 0 0; font-size: 24px;">New order #${escapeHtml(order.number)}</h1>
          <p style="margin: 4px 0 0 0; color: #555; font-size: 14px;">Placed ${formatDateTime(order.placedAt)}</p>

          <h2 style="margin: 24px 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.18em; color: #555;">Customer</h2>
          <p style="margin: 0;">${escapeHtml(order.customerName)}</p>
          <p style="margin: 0;">${escapeHtml(order.customerPhone)}</p>
          ${order.customerEmail ? `<p style="margin: 0;">${escapeHtml(order.customerEmail)}</p>` : ""}

          <h2 style="margin: 24px 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.18em; color: #555;">Delivery</h2>
          ${addressHtml}

          <h2 style="margin: 24px 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.18em; color: #555;">Items</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>${linesHtml}</tbody>
          </table>

          <table style="width: 100%; margin-top: 16px;">
            <tr><td style="padding: 4px 0; color: #555;">Subtotal</td><td style="padding: 4px 0; text-align: right;">${subtotal}</td></tr>
            <tr><td style="padding: 4px 0; color: #555;">Delivery</td><td style="padding: 4px 0; text-align: right;">${delivery}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; border-top: 1px solid #111;">Total</td><td style="padding: 8px 0; text-align: right; font-weight: 600; border-top: 1px solid #111;">${total}</td></tr>
          </table>

          <h2 style="margin: 24px 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.18em; color: #555;">Payment</h2>
          <p style="margin: 0;">${escapeHtml(paymentMethodLabel(order.paymentMethod))}</p>
          <p style="margin: 0;">Status: ${escapeHtml(paymentStatusLabel(order.paymentStatus))}</p>
          ${order.paymentReference ? `<p style="margin: 0;">bKash reference: ${escapeHtml(order.paymentReference)}</p>` : ""}

          <h2 style="margin: 24px 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.18em; color: #555;">Status</h2>
          <p style="margin: 0;">${escapeHtml(orderStatusLabel(order.status))}</p>

          <p style="margin: 32px 0 0 0;">
            <a href="${escapeHtml(adminLink)}" style="display: inline-block; padding: 12px 20px; background: #111; color: #fff; text-decoration: none; text-transform: uppercase; letter-spacing: 0.18em; font-size: 12px;">Open in admin</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderOrderEmailText(order: OrderDetail, adminLink: string): string {
  const lines = order.items
    .map((item) => {
      const variant = [item.color, item.size ? `Size ${item.size}` : null]
        .filter(Boolean)
        .join(", ");
      return `- ${item.name}${variant ? ` (${variant})` : ""} — ${item.quantity} x ${formatTaka(item.unitPrice.amount)} = ${formatTaka(item.lineTotal.amount)}`;
    })
    .join("\n");
  return [
    `MONOFORM — New order #${order.number}`,
    `Placed ${formatDateTime(order.placedAt)}`,
    "",
    "Customer",
    `Name: ${order.customerName}`,
    `Phone: ${order.customerPhone}`,
    order.customerEmail ? `Email: ${order.customerEmail}` : "",
    "",
    "Delivery",
    order.shippingAddress.recipientName,
    order.shippingAddress.phone,
    order.shippingAddress.addressLine,
    order.shippingAddress.additionalDetails ?? "",
    [order.shippingAddress.locality, order.shippingAddress.district, order.shippingAddress.postalCode]
      .filter(Boolean)
      .join(", "),
    order.shippingAddress.deliveryZone === "inside_dhaka"
      ? "Inside Dhaka"
      : "Outside Dhaka",
    order.shippingAddress.deliveryInstructions
      ? `Note: ${order.shippingAddress.deliveryInstructions}`
      : "",
    "",
    "Items",
    lines,
    "",
    "Totals",
    `Subtotal: ${formatTaka(order.subtotal.amount)}`,
    `Delivery: ${formatTaka(order.deliveryFee.amount)}`,
    `Total: ${formatTaka(order.total.amount)}`,
    "",
    "Payment",
    `Method: ${paymentMethodLabel(order.paymentMethod)}`,
    `Status: ${paymentStatusLabel(order.paymentStatus)}`,
    order.paymentReference ? `bKash reference: ${order.paymentReference}` : "",
    "",
    `Status: ${orderStatusLabel(order.status)}`,
    "",
    `Open in admin: ${adminLink}`,
  ]
    .filter((line) => line !== null && line !== undefined && line !== "")
    .join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTaka(amount: number): string {
  return `৳${amount.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string): string {
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

function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending_confirmation":
      return "Pending confirmation";
    case "confirmed":
      return "Confirmed";
    case "processing":
      return "Processing";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
  }
}

function paymentMethodLabel(method: OrderPaymentMethod): string {
  return method === "cod" ? "Cash on Delivery" : "bKash";
}

function paymentStatusLabel(status: OrderPaymentStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "awaiting_verification":
      return "Awaiting verification";
    case "paid":
      return "Paid";
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
  }
}
