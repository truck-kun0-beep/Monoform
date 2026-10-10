# Customer order lifecycle

This document covers the customer-facing order lifecycle:
checkout, order placement, confirmation, public tracking, the
authenticated order history and the order detail view.

For the underlying authentication and account-area setup, see
[`docs/AUTH.md`](./AUTH.md) and [`docs/ACCOUNT.md`](./ACCOUNT.md).
For the store-owner admin area, see
[`docs/ADMIN.md`](./ADMIN.md).

## 1. Routes

| Route | Server-side guard | Renders |
| --- | --- | --- |
| `/checkout` | Authenticated session (middleware redirect) | Real checkout form: contact, delivery address, payment, totals preview |
| `/order-confirmation/[id]` | None — the order service enforces ownership | Confirmation of a real order, or an honest "not supported" / "not found" state |
| `/track-order` | None (public lookup) | Tracking form + result, gated by a server action |
| `/account/orders` | `requireUser('/account/orders')` | Customer order history (real rows when the order service returns them) |
| `/account/orders/[id]` | `requireUser(\`/account/orders/${id}\`)` | Authenticated order detail |

The middleware also covers every `/account/*` prefix so
unauthenticated visitors are redirected to `/login?redirect=…`
before any sensitive data is rendered.

## 2. Checkout

`/checkout` renders the `CheckoutForm` client component. The form
posts to the `placeOrderAction` server action, which:

- validates every field on the server
- derives the customer identity from the validated Supabase session
- re-reads product prices from the authoritative catalogue
- computes the delivery charge from the explicit `delivery_zone`
  the customer chose
- generates a unique order number through the
  `next_order_number()` SQL function
- commits the order, the line items, the initial status history
  event and a `pending` notification row
- attempts to dispatch the store-owner email
- returns the order id so the client can navigate to
  `/order-confirmation/[id]`

The client never trusts the server result. Until the action
returns `{ ok: true, orderId, orderNumber }` the form keeps the
"Place Order" button enabled (with a pending state during the
request) and re-renders any server-side field errors inline.

### Bag preservation

The cart is only cleared once the action returns success. Failed
requests, validation errors and `not_configured` responses leave
the bag intact so the customer can retry without re-adding their
items.

### Idempotency

The form generates a per-tab `idempotencyKey` and includes it on
every submission. The server uses the unique index on
`(user_id, idempotency_key)` to dedupe; the same key with
different contents is rejected as a conflict.

## 3. Order confirmation page

`/order-confirmation/[id]` is the only place where a "success"
state is shown. The success state is reached only when the order
service returns an `OrderDetail` record that matches the
authenticated session. The page never trusts the URL `id` alone:
even a forged id will be rejected by the order service and the
page renders the "not found" / "not supported" state.

When the order backend returns a real order, the page renders:

- A "Thank you for your order" header.
- The customer-facing order number, placement timestamp, status
  and total.
- The customer name, contact phone and email.
- The full items list (with variants, quantities, unit prices
  and line subtotals).
- A `OrderStatusTimeline` driven by the recorded timeline
  events — future stages are *not* marked as completed.
- The delivery address snapshot stored on the order.
- The payment method and payment status, with the bKash
  reference only when it is still awaiting verification.
- The courier / tracking card when the order has been
  dispatched by a real fulfilment partner.

A set of follow-up actions links to the customer's order
history, the order detail page, the public tracking page and the
catalogue — only the links to implemented routes are rendered.

## 4. Public tracking

`/track-order` exposes the lookup form and the limited result
view. The form posts to the `trackOrderAction` server action,
which:

- Validates the order number format and normalises the
  Bangladeshi phone number through `normaliseBdPhone`.
- Rate-limits each (IP, number) bucket to **5 attempts per
  10 minutes** to prevent enumeration.
- Returns a single `not_found` state when the number + phone
  pair does not match a single order — the page never
  distinguishes "wrong number" from "wrong phone" so the
  endpoint cannot be used to probe valid order numbers.
- Returns a `rate_limited` state with a `retryAfterSeconds`
  hint when the bucket is exhausted.
- Returns a `not_supported` / `not_configured` state when the
  order service is not yet wired in.

The public result intentionally omits the customer's email,
the full address, the payment reference and any other private
metadata. Only the district / delivery area and the
limited courier card (when the order has shipped) are surfaced.

## 5. Authenticated order history

`/account/orders` lists the customer's orders sorted by the
authoritative `placedAt` timestamp (newest first). The
`OrderHistoryTable` component renders a table on desktop and a
stacked card list on mobile. Each row links to
`/account/orders/[id]`.

`/account/orders/[id]` is the authenticated order detail. It
re-uses the `AccountShell` layout and renders the full
`OrderDetailView` once the order service returns a real order.

## 6. Order service contract

The `lib/account/orders.ts` module is the public read surface for
the customer-facing order pages. The actual backend is in
`lib/orders/service.ts`; the public types are re-exported through
`@/lib/account` so the existing pages keep working.

### `listOrders()`

Returns the authenticated customer's orders. Owner-scoped through
the service-role client and the RLS policy on the `orders` table.

### `getOrder(id)` and `getOrderConfirmation(id)`

Return a single order. The id is a UUID primary key. Both
functions refuse to return an order belonging to another customer
even when the id is supplied via the URL.

### `lookupOrderForTracking({ number, phone })`

Performs a public lookup keyed on the order number and the
contact phone. The result is the limited `OrderTrackingResult`
view that omits private metadata. Validation and rate limiting
run in front of the database call so the public surface is
shaped correctly even before the backend is in place.

### Result types

| `OrderListState` | `OrderLookupState` | `OrderTrackingState` |
| --- | --- | --- |
| `ok` (`OrderSummary[]`) | `ok` (`OrderDetail`) | `ok` (`OrderTrackingResult`) |
| `not_found` | `not_found` | `not_found` |
| `not_supported` | `not_supported` | `not_supported` |
| `not_configured` | `not_configured` | `not_configured` |
| `error` | `error` | `error` |
|   |   | `validation_error` |
|   |   | `rate_limited` |

## 7. Order data model

Orders live in the `orders`, `order_items`,
`order_status_history` and `order_notifications` tables defined
in `supabase/migrations/0003_orders_and_admin.sql`. Every money
value is stored in integer paisa to avoid floating-point drift.
The customer-facing order number is generated by the
`next_order_number()` SQL function and is unique by construction.

An order's address and product snapshots are frozen at placement
time so historical orders remain stable even when the customer
later updates their saved address or the product catalogue
changes.

## 8. Notifications

Customer-facing notifications (the order confirmation and
tracking pages) never display "we sent you an email" because
the application does not own a customer-facing transactional
email channel. The store-owner notification is dispatched
through the dedicated `lib/orders/notifications` pipeline, which
writes a row to `order_notifications` before attempting delivery
and updates the row with the provider result.

## 9. Privacy and authorization

- **Owner-scoped reads.** Every read against the order service
  is scoped to the authenticated customer. A forged id in the URL
  never returns another customer's order.
- **Public tracking.** The `/track-order` endpoint requires
  *both* the order number and the matching contact phone. It
  does not distinguish "wrong number" from "wrong phone" in the
  error response.
- **Rate limiting.** The public endpoint is rate-limited per
  (IP, number) bucket. The in-memory limiter is sufficient
  for a single instance; a multi-instance deployment should
  swap it for a centralised limiter (Upstash / Redis) without
  changing the public surface.
- **Limited public view.** `OrderTrackingResult` omits the
  customer's email, full address, payment reference and any
  internal identifiers. Only the district and the courier
  card (when shipped) are exposed.
- **No client trust.** The order service does not accept a
  payment status, an order status or a courier name from the
  client. Status advances only happen through the trusted
  order-management service.

## 10. What works without the order backend

- The page-level route protection (middleware + `requireUser`).
- The order confirmation page renders a "not supported" state
  with the order id and a clear "we will never show fake
  success" notice.
- The order history page renders a "not supported" empty
  state and a "Back to the catalogue" link.
- The order detail page renders a "not supported" state with
  the order id in the heading.
- The tracking form is fully wired to the validation +
  rate-limiting + result rendering. The server returns
  `not_configured` when Supabase is not configured, and the
  page renders an honest message.

## 11. Setup steps

1. Apply the customer auth migration
   `supabase/migrations/0001_customer_profiles.sql`.
2. Apply the saved-address migration
   `supabase/migrations/0002_customer_addresses.sql`.
3. Apply the order migration
   `supabase/migrations/0003_orders_and_admin.sql`.
4. Configure the Supabase project for email sign-in as
   documented in [`docs/AUTH.md`](./AUTH.md).
5. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` so the
   order backend can perform privileged writes.
6. Run `npm run dev` and visit `/account/orders` to confirm the
   honest "not supported" state. Visit `/track-order` to
   confirm the same.

## 12. Security checklist

- The order service never accepts a `user_id` from the client.
  It is always derived from the validated session.
- The public tracking result omits the customer's email, full
  address, payment reference and any internal IDs.
- The order detail view re-uses the address snapshot stored on
  the order; it never falls back to the customer's *current*
  saved address.
- The status timeline never marks a future stage as completed
  unless a `OrderTimelineEvent` exists for it.
- The payment status badge is rendered separately from the
  order status badge so the customer can read both without
  conflating them.
- A bKash reference is rendered only when the payment status
  is `awaiting_verification`. We never display "Payment
  Successful" based on a typed reference alone.
