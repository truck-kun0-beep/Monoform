# MONOFORM admin dashboard

This document describes the protected store-owner area introduced
in Prompt 11. It explains how the admin role is provisioned, which
routes the operator can access, how orders are managed and how
notifications are retried.

For the underlying authentication setup, see
[`docs/AUTH.md`](./AUTH.md). For the customer order lifecycle, see
[`docs/ORDERS.md`](./ORDERS.md).

## 1. Routes

| Route | Server-side guard | Renders |
| --- | --- | --- |
| `/admin` | `requireAdmin()` | Live summary, status counts, recent orders |
| `/admin/orders` | `requireAdmin()` + filter parsing | Full order list with search, status, payment and date filters |
| `/admin/orders/[id]` | `requireAdmin()` + service-role fetch | Single order management: customer info, address snapshot, line items, financials, status / payment controls, notification history |

The middleware also blocks unauthenticated access to `/admin/*`
and redirects visitors to `/login?redirect=…`. The `requireAdmin`
helper additionally checks the `admin_allowlist` table so a regular
customer who happens to be signed in is still denied.

## 2. Admin authorization

The admin role is **not** stored in `auth.users.app_metadata` and
it is **not** settable from the browser. A dedicated
`admin_allowlist` table is the only source of truth:

```sql
create table public.admin_allowlist (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  granted_by  uuid references auth.users(id) on delete set null,
  granted_at  timestamptz not null default now(),
  note        text
);
```

Row Level Security allows a user to read their own row (used to
render a friendly "you are an admin" badge if desired) but refuses
inserts from the anon / authenticated client. The table is
populated only through the service role (a Supabase SQL editor
query, a migration, or a trusted server-side setup script).

To grant the first administrator:

1. Have the store owner sign in once so a row exists in
   `auth.users`. The user id is visible in the Supabase dashboard
   under **Authentication → Users**.
2. In the Supabase SQL editor, run:

   ```sql
   insert into public.admin_allowlist (user_id, note)
   values ('00000000-0000-0000-0000-000000000000', 'store owner');
   ```

3. The owner can now visit `/admin` and see the live dashboard.

The `is_admin(uuid)` helper function is `SECURITY DEFINER` so the
RLS policies on the order tables can ask "is this caller an
administrator?" without exposing the full allowlist.

## 3. Order placement

Customers place orders from `/checkout` through the
`placeOrderAction` server action. The action:

1. Validates every field on the server (the client is a hint, not
   a source of truth).
2. Derives the customer identity from the validated Supabase
   session.
3. Re-reads product prices from the authoritative catalogue
   (`lib/products`) — never trusts the price the browser sent.
4. Computes the delivery charge from the explicit `delivery_zone`
   chosen by the customer (৳70 inside Dhaka, ৳120 outside).
5. Generates a unique order number through the
   `next_order_number()` SQL function.
6. Persists the order, the line items, the initial status history
   event and a `pending` notification row in a single write path.
7. Attempts to dispatch the store-owner email through Resend
   *after* the order is committed. A failed email never rolls
   back the order.
8. Returns the order id so the client can navigate to
   `/order-confirmation/[id]`.

### Idempotency

The action requires an `idempotencyKey` field. Two submissions
with the same key and identical contents return the original
order; the same key with different contents is rejected as a
conflict (so a tampered retry cannot silently reuse a previous
result). The unique index on `(user_id, idempotency_key)` makes
the guarantee a database-level invariant.

### Cart cleanup

After a successful placement, the `CheckoutForm` client component
calls the cart store's `clear()` before navigating to the
confirmation page. Failed or `not_configured` submissions do not
clear the cart.

## 4. Notification pipeline

Every new order writes a row to the `order_notifications` outbox
with `status = "pending"`. The notification service
(`lib/orders/notifications.ts`) attempts to deliver the email
through Resend using the `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
environment variables. The result is recorded on the row:

- `sent` — Resend accepted the message and returned an id.
- `failed` — the provider returned a non-2xx response. The error
  message is sanitised and stored on `last_error`.
- `pending` — the provider is not configured, or the operator is
  retrying.

The owner email is configured through
`STORE_ORDER_NOTIFICATION_EMAIL`. The notification module never
sends to any other address.

A failed delivery does **not** roll back the order. The order
remains visible in the admin dashboard with a "Failed" badge on
its notification row, and the operator can click "Retry
notification" to attempt delivery again.

## 5. Admin order detail

`/admin/orders/[id]` renders:

- The customer-facing order number, with a one-click copy button.
- The placed-at timestamp, item count, total and currency.
- The customer name, contact phone and email (if collected).
- The full delivery address snapshot stored on the order — never
  the customer's *current* saved address.
- The line items with the historical unit price and line subtotal
  captured at order time.
- The financial summary: subtotal, delivery fee, total.
- The payment method and payment status.
- A "Status controls" card with two server actions:
  - **Update order status** — restricted to the transition graph
    enforced by `isValidOrderTransition`. The dropdown only
    offers the allowed next states for the current status.
  - **Update payment status** — restricted to the payment-method
    transition graph. COD orders cannot be moved to
    `awaiting_verification`; bKash orders can.
- A "Status history" timeline of every transition recorded in
  `order_status_history`.
- A "Store-owner notifications" card listing every notification
  attempt with the recipient, attempt count, last error and a
  retry button for failed / pending rows.

## 6. Status and payment workflows

The order lifecycle is the union of:

```
pending_confirmation → confirmed → processing → shipped → delivered
                                  ↘ cancelled (from any state)
```

`isValidOrderTransition` enforces the graph on the server. The
client dropdown is a UX hint; the authoritative check happens in
the database transaction.

For payments, COD orders may transition between
`pending → paid | failed | refunded` and bKash orders between
`awaiting_verification → paid | failed | refunded`. We never mark
a bKash order paid without an explicit admin action — the
reference is only ever evidence to be verified.

## 7. Configuration matrix

| Feature | Requires | Without it |
| --- | --- | --- |
| Place order | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` + `0003_orders_and_admin.sql` | Checkout renders an honest "order backend unavailable" notice |
| Store-owner email | `RESEND_API_KEY` + `RESEND_FROM_EMAIL` + `STORE_ORDER_NOTIFICATION_EMAIL` | Order commits; notification row stays `pending`; admin sees the missing config in the notification history |
| Admin access | Row in `admin_allowlist` | `/admin/*` returns "You don't have access" |
| Public tracking | `NEXT_PUBLIC_SUPABASE_*` + service key + migration | `/track-order` renders the validation form but the lookup returns `not_configured` |

## 8. Setup steps (fresh project)

1. Apply `supabase/migrations/0001_customer_profiles.sql` and
   `supabase/migrations/0002_customer_addresses.sql` (the auth +
   address foundations introduced in earlier prompts).
2. Apply `supabase/migrations/0003_orders_and_admin.sql` to add
   the `orders`, `order_items`, `order_status_history`,
   `order_notifications` and `admin_allowlist` tables.
3. Populate `.env.local` from `.env.example` with your Supabase
   project URL, anon key, service-role key, store-owner email
   address, Resend API key and verified "from" address.
4. Have the store owner sign in once so a row exists in
   `auth.users`. Copy their UUID from the dashboard.
5. Insert that UUID into `admin_allowlist`.
6. `npm run dev` and visit `/admin` to confirm the dashboard
   renders.

## 9. Security checklist

- The customer identity is always derived from the validated
  Supabase session; the client never supplies a `user_id`.
- Order rows are owned-scoped; the customer cannot read another
  customer's order even by guessing the UUID.
- The admin allowlist is the only source of truth for the
  administrator role. A regular customer cannot insert a row
  because the RLS policy refuses it; the role is not stored in
  `auth.users.app_metadata` (which would be exposed to the
  authenticated client).
- Money values are stored in integer paisa to avoid
  floating-point drift in totals.
- All mutations happen through the service role, which never
  reaches the browser. RLS is defence in depth, not the
  primary gate.
- The notification service sanitises provider errors before
  persisting them so internal Resend metadata does not leak into
  the admin UI.
- Status transitions are validated by a server-side function
  before any database write.
