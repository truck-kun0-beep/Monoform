import { Badge } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import type { Currency } from "@/types";
import {
  ORDER_PAYMENT_METHOD_LABEL,
  ORDER_PAYMENT_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  type OrderDetail,
  type OrderNotificationSummary,
  type OrderPaymentMethod,
  type OrderPaymentStatus,
  type OrderStatus,
  type OrderTimelineEvent,
} from "@/lib/account";
import { AdminOrderStatusForm } from "./AdminOrderStatusForm";
import { AdminPaymentStatusForm } from "./AdminPaymentStatusForm";
import { AdminNotificationRetryButton } from "./AdminNotificationRetryButton";
import { AdminNotificationRebuildButton } from "./AdminNotificationRebuildButton";
import { orderStatusTone, paymentStatusTone } from "./AdminOrdersTable";
import { CopyButton } from "@/components/ui";

type Props = {
  order: OrderDetail;
  customerEmail: string | null;
  timeline: OrderTimelineEvent[];
  notifications: OrderNotificationSummary[];
  /**
   * Whether the deployment has `STORE_ORDER_NOTIFICATION_EMAIL`
   * set to a usable email address. When `false`, the admin
   * notifications card shows an explicit "recipient not
   * configured" message and the rebuild button carries a hint
   * that clicking it will create a `pending` row with a "not
   * configured" error rather than a real delivery.
   */
  recipientConfigured: boolean;
  /**
   * Operator-facing explanation for why no notifications were
   * queued for this order. Computed on the server from the env
   * state and the recipient resolver so the wording is identical
   * to the `last_error` written into rebuilt rows.
   */
  recipientMissingReason: string | null;
};

/**
 * Admin order detail. Includes the customer identity, the
 * delivery address snapshot, the line items, the financial
 * summary, the notification history and the authorized status
 * controls. All values come from the authoritative `OrderDetail`
 * record returned by the order service.
 */
export function AdminOrderDetailView({
  order,
  customerEmail,
  timeline,
  notifications,
  recipientConfigured,
  recipientMissingReason,
}: Props) {
  return (
    <article className="flex flex-col gap-8" aria-label={`Order ${order.number}`}>
      <OrderHeader order={order} customerEmail={customerEmail} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <ItemsCard order={order} />
          <TimelineCard timeline={timeline} />
        </div>
        <div className="flex flex-col gap-6">
          <CustomerCard order={order} customerEmail={customerEmail} />
          <AddressCard order={order} />
          <FinancialsCard order={order} />
          <StatusControlsCard order={order} />
        </div>
      </div>
      <NotificationsCard
        order={order}
        notifications={notifications}
        recipientConfigured={recipientConfigured}
        recipientMissingReason={recipientMissingReason}
      />
    </article>
  );
}

function OrderHeader({
  order,
  customerEmail,
}: {
  order: OrderDetail;
  customerEmail: string | null;
}) {
  return (
    <header className="border border-line bg-paper p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-eyebrow uppercase text-ink-muted">Order</p>
          <p className="mt-1 flex items-center gap-3 text-display-md text-ink">
            <span>#{order.number}</span>
            <CopyButton
              value={order.number}
              label={`Copy order number ${order.number}`}
            />
          </p>
        </div>
        <Badge tone={orderStatusTone(order.status)}>
          {ORDER_STATUS_LABEL[order.status]}
        </Badge>
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-4">
        <Field label="Placed" value={formatDateTime(order.placedAt)} />
        <Field
          label="Items"
          value={`${order.itemCount} ${order.itemCount === 1 ? "item" : "items"}`}
        />
        <Field
          label="Total"
          value={formatPrice(order.total.amount, order.total.currency)}
        />
        <Field
          label="Currency"
          value={order.total.currency}
        />
      </dl>
      <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
        <Field label="Customer" value={order.customerName} />
        <Field label="Contact phone" value={order.customerPhone} />
        <Field label="Email" value={customerEmail ?? "—"} />
      </dl>
    </header>
  );
}

function CustomerCard({
  order,
  customerEmail,
}: {
  order: OrderDetail;
  customerEmail: string | null;
}) {
  return (
    <section className="border border-line bg-paper p-6" aria-label="Customer">
      <h2 className="text-eyebrow uppercase text-ink-muted">Customer</h2>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
        <Field label="Name" value={order.customerName} />
        <Field label="Phone" value={order.customerPhone} />
        <Field label="Email" value={customerEmail ?? "—"} />
      </dl>
    </section>
  );
}

function AddressCard({ order }: { order: OrderDetail }) {
  const address = order.shippingAddress;
  return (
    <section className="border border-line bg-paper p-6" aria-label="Delivery address">
      <h2 className="text-eyebrow uppercase text-ink-muted">Delivery</h2>
      <address className="mt-3 not-italic text-sm text-ink">
        <p className="text-ink">{address.recipientName}</p>
        <p>{address.phone}</p>
        <p>{address.addressLine}</p>
        {address.additionalDetails ? <p>{address.additionalDetails}</p> : null}
        <p>
          {address.locality ? `${address.locality}, ` : ""}
          {address.district}
          {address.postalCode ? ` ${address.postalCode}` : ""}
        </p>
        <p className="mt-1 text-ink-muted">
          {address.deliveryZone === "inside_dhaka"
            ? "Inside Dhaka"
            : "Outside Dhaka"}
        </p>
        {address.deliveryInstructions ? (
          <p className="mt-2 text-xs text-ink-subtle">
            Note: {address.deliveryInstructions}
          </p>
        ) : null}
      </address>
    </section>
  );
}

function FinancialsCard({ order }: { order: OrderDetail }) {
  return (
    <section className="border border-line bg-paper p-6" aria-label="Financials">
      <h2 className="text-eyebrow uppercase text-ink-muted">Financials</h2>
      <dl className="mt-4 flex flex-col gap-2 text-sm">
        <Row label="Subtotal" value={order.subtotal} />
        <Row label="Delivery" value={order.deliveryFee} />
        <Row label="Total" value={order.total} emphasis />
      </dl>
      <p className="mt-3 text-xs text-ink-muted">
        Payment method: {ORDER_PAYMENT_METHOD_LABEL[order.paymentMethod]}
        <br />
        Payment status:{" "}
        <Badge tone={paymentStatusTone(order.paymentStatus)}>
          {ORDER_PAYMENT_STATUS_LABEL[order.paymentStatus]}
        </Badge>
      </p>
      {order.paymentReference ? (
        <p className="mt-3 text-xs text-ink-muted">
          Submitted bKash reference:{" "}
          <span className="text-ink">{order.paymentReference}</span>
        </p>
      ) : null}
    </section>
  );
}

function ItemsCard({ order }: { order: OrderDetail }) {
  if (order.items.length === 0) {
    return (
      <section className="border border-line bg-paper p-6">
        <h2 className="text-eyebrow uppercase text-ink-muted">Items</h2>
        <p className="mt-3 text-sm text-ink-muted">
          No items are attached to this order.
        </p>
      </section>
    );
  }
  return (
    <section className="border border-line bg-paper p-6" aria-label="Items">
      <h2 className="text-eyebrow uppercase text-ink-muted">Items</h2>
      <ul className="mt-4 divide-y divide-line">
        {order.items.map((item, index) => (
          <li
            key={`${item.productId}-${index}`}
            className="flex items-baseline justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm text-ink">{item.name}</p>
              <p className="text-xs text-ink-muted">
                {[
                  item.size ? `Size ${item.size}` : null,
                  item.color,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="text-ink">
                {item.quantity} × {formatPrice(item.unitPrice.amount, item.unitPrice.currency)}
              </p>
              <p className="font-medium text-ink">
                {formatPrice(item.lineTotal.amount, item.lineTotal.currency)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TimelineCard({ timeline }: { timeline: OrderTimelineEvent[] }) {
  return (
    <section className="border border-line bg-paper p-6" aria-label="Status history">
      <h2 className="text-eyebrow uppercase text-ink-muted">Status history</h2>
      {timeline.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          No status changes have been recorded yet.
        </p>
      ) : (
        <ol className="mt-4 flex flex-col gap-3 text-sm">
          {timeline.map((event, index) => (
            <li
              key={`${event.status}-${event.at}-${index}`}
              className="flex flex-col gap-1 border-l-2 border-line pl-3"
            >
              <span className="text-eyebrow uppercase text-ink-muted">
                {ORDER_STATUS_LABEL[event.status]}
              </span>
              <span className="text-ink">
                {formatDateTime(event.at)}
              </span>
              {event.note ? (
                <span className="text-xs text-ink-subtle">{event.note}</span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function StatusControlsCard({ order }: { order: OrderDetail }) {
  return (
    <section className="border border-line bg-paper p-6" aria-label="Status controls">
      <h2 className="text-eyebrow uppercase text-ink-muted">Update status</h2>
      <div className="mt-4 flex flex-col gap-6">
        <AdminOrderStatusForm
          orderId={order.id}
          currentStatus={order.status}
        />
        <AdminPaymentStatusForm
          orderId={order.id}
          currentStatus={order.paymentStatus}
          paymentMethod={order.paymentMethod}
        />
      </div>
    </section>
  );
}

function NotificationsCard({
  order,
  notifications,
  recipientConfigured,
  recipientMissingReason,
}: {
  order: OrderDetail;
  notifications: OrderNotificationSummary[];
  recipientConfigured: boolean;
  recipientMissingReason: string | null;
}) {
  return (
    <section className="border border-line bg-paper p-6" aria-label="Notifications">
      <h2 className="text-eyebrow uppercase text-ink-muted">
        Store-owner notifications
      </h2>
      {notifications.length === 0 ? (
        <div className="mt-3 flex flex-col gap-3 text-sm text-ink-muted">
          {recipientConfigured ? (
            <p>
              No notifications were queued for this order. Use the button
              below to create one now and dispatch it.
            </p>
          ) : (
            <>
              <p className="text-ink">
                No notifications have been queued for this order because the
                store-owner recipient is not configured.
              </p>
              {recipientMissingReason ? (
                <p className="text-ink-muted">{recipientMissingReason}</p>
              ) : null}
            </>
          )}
          <div>
            <AdminNotificationRebuildButton
              orderId={order.id}
              hint={
                recipientConfigured
                  ? undefined
                  : "A new row will be created in 'pending' with a 'Recipient not configured' error until STORE_ORDER_NOTIFICATION_EMAIL is set in the deployment environment."
              }
            />
          </div>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-4 text-sm">
          {notifications.map((notification) => (
            <li key={notification.id} className="border-t border-line pt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="text-eyebrow uppercase text-ink-muted">
                    Recipient
                  </p>
                  <p className="text-ink">{notification.recipient}</p>
                </div>
                <Badge
                  tone={
                    notification.status === "sent"
                      ? "neutral"
                      : notification.status === "failed"
                        ? "sale"
                        : "low-stock"
                  }
                >
                  {notification.status === "sent"
                    ? "Delivered"
                    : notification.status === "failed"
                      ? "Failed"
                      : "Pending"}
                </Badge>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <Field
                  label="Attempt count"
                  value={String(notification.attemptCount)}
                />
                <Field
                  label="Last attempted"
                  value={notification.lastAttemptedAt ? formatDateTime(notification.lastAttemptedAt) : "—"}
                />
                <Field
                  label="Delivered at"
                  value={notification.sentAt ? formatDateTime(notification.sentAt) : "—"}
                />
                <Field
                  label="Last error"
                  value={notification.lastError ?? "—"}
                />
              </dl>
              {notification.status !== "sent" ? (
                <div className="mt-3">
                  <AdminNotificationRetryButton
                    notificationId={notification.id}
                    orderId={order.id}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: { amount: number; currency: string };
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className={emphasis ? "text-eyebrow uppercase text-ink" : "text-ink-muted"}>
        {label}
      </dt>
      <dd className={emphasis ? "text-base font-medium text-ink" : "text-ink"}>
        {formatPrice(value.amount, value.currency as Currency)}
      </dd>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-eyebrow uppercase text-ink-subtle">{label}</dt>
      <dd className="mt-1 text-sm text-ink break-words">{value || "—"}</dd>
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

// Suppress unused warning
export type { OrderStatus, OrderPaymentStatus, OrderPaymentMethod };
