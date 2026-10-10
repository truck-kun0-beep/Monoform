# MONOFORM

A considered, minimalist e-commerce storefront for the Bangladesh market.
Built with Next.js 15 (App Router) and Supabase. The brand is **MONOFORM**
and the intended market is **Bangladesh / BDT**.

This README documents the actual project state after the integration and
security audit. It does not claim that any external service has been
tested unless that test was actually performed.

---

## 1. Technology stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15.0.3 (App Router, RSC, server actions) |
| Runtime | Node.js (React 19 RC) |
| Styling | Tailwind CSS 3.4 |
| Auth & DB | Supabase (`@supabase/ssr` + `@supabase/supabase-js`) |
| Email | Resend HTTP API (server-side, called from `lib/orders/notifications.ts`) |
| Payments | Cash on Delivery + manual bKash reference (no gateway integration) |
| Language | TypeScript 5.6 (strict) |
| Lint | ESLint 9 (flat config, typescript-eslint recommended) |

The project intentionally avoids heavyweight additions. The
order-placement service is plain TypeScript calling Supabase through the
service-role client. Email is sent with `fetch()` to the Resend API —
no SDK.

---

## 2. Repository layout

```
app/                     Next.js App Router routes
  (auth, account, admin, cart, checkout, product, …)
  docs/[slug]            In-app setup guides (/docs/AUTH, /docs/ORDERS, …)
  not-found.tsx          404 page
components/              Reusable UI (cart, header, product, admin, …)
config/                  Brand, content, consent, market, support, …
lib/
  account/               Customer profile + address + order services
  auth/                  Supabase clients, validation, server actions
  cart/                  Client-side cart store (localStorage)
  consent/               Cookie consent storage + banner
  newsletter/            Newsletter subscribe / unsubscribe
  orders/                Authoritative order backend (server-only)
  seed/                  Seed products + categories
  support/               Contact-form service + Resend dispatch
  wishlist/              Client-side wishlist store
middleware.ts            Edge middleware: session refresh + auth redirects
styles/                  Global CSS
supabase/
  migrations/            0001 … 0005 (run manually in the SQL editor)
  README.md              Migration overview
docs/                    Markdown source for the in-app /docs routes
types/                   Shared TS types
```

The `@/lib/orders/server` module is marked `"server-only"` and is the
**only** path that ever reads or writes order data. Client components
must not import it.

---

## 3. Prerequisites

- Node.js 20+
- A Supabase project (free tier is sufficient for development)
- A Resend account (only required for the store-owner notification email)
- A verified sending identity on Resend (domain or single address)

No other paid services are required for the customer flow.

---

## 4. Installation

```bash
git clone <repo>
cd "G:\ecommerce site"
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase and Resend values (see § 6)
npm run dev
```

Open <http://localhost:3000>.

---

## 5. Environment variables

The full set is documented in `.env.example`. Summary:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | yes (prod) | Used to build absolute redirect URLs |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Browser-safe Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Browser-safe publishable anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | for orders | Server-only key for the order backend |
| `STORE_ORDER_NOTIFICATION_EMAIL` | for orders | Recipient of every new-order email |
| `RESEND_API_KEY` | for emails | Server-only Resend key |
| `RESEND_FROM_EMAIL` | for emails | Verified sender identity (e.g. `MONOFORM <[email protected]>`) |

The application is intentionally tolerant of missing configuration:
when Supabase env vars are absent the auth/account UI renders an
honest "Setup required" state instead of pretending to work. The same
is true for the order backend and the email provider.

**Never commit `.env.local` or any file containing real credentials.**

---

## 6. Database setup and migrations

Apply the five SQL files in numeric order through the Supabase SQL
editor (or `supabase db push`):

| File | Purpose |
| --- | --- |
| `0001_customer_profiles.sql` | `customer_profiles` + RLS |
| `0002_customer_addresses.sql` | `customer_addresses` + RLS, single default per user |
| `0003_orders_and_admin.sql` | `orders`, `order_items`, `order_status_history`, `order_notifications`, `admin_allowlist`, `next_order_number()`, `is_admin()` |
| `0004_support_messages.sql` | `support_messages` table + RLS for the contact form |
| `0005_newsletter_subscriptions.sql` | `newsletter_subscriptions` + RLS, token-rotated unsubscribe |

After applying, enable Row Level Security on every public table the
project touches and verify the policies via `select * from pg_policies`
in the SQL editor.

### 6.1 Promote the first administrator

The admin dashboard and order-management endpoints are gated by
`public.admin_allowlist`. RLS refuses client-side inserts into the
allowlist, so the first row must be created through the service role
(or the Supabase SQL editor with the service role active):

```sql
insert into public.admin_allowlist (user_id, note)
values ('00000000-0000-0000-0000-000000000000', 'store owner');
```

The `user_id` is the customer's `auth.users.id` — get it from
**Authentication → Users** in the dashboard after the customer has
signed in at least once.

---

## 7. Authentication, redirect and email setup

1. In **Authentication → URL Configuration**:
   - **Site URL** = your production site (e.g. `https://monoform.example`).
   - **Additional redirect URLs** must include
     `http://localhost:3000` and the production callback
     path `…/reset-password`.
2. Leave **Email** provider enabled. The default Supabase confirmation
   template is fine.
3. Restart `npm run dev` after changing auth settings so the SSR
   client picks them up.

The redirect target the login form accepts is validated by
`isSafeInternalPath()` — external URLs and protocol-relative
destinations are rejected, so the `/login?redirect=…` parameter
cannot be used for open-redirect attacks.

---

## 8. Email and notification setup

- New-order notifications are sent through the Resend HTTP API from
  `lib/orders/notifications.ts`. The order is **always committed to
  the database first**; the email is then dispatched and its
  outcome (sent / failed / skipped) is written to the
  `order_notifications` row.
- A failed email does **not** roll back the order. The admin can
  retry from `/admin/orders/[id]`.
- The contact form follows the same pattern: the message is
  persisted to `support_messages` before the email is attempted.
- When the Resend env vars are absent, the order still completes and
  the notification row stays in `pending` for later retry.

The store-owner notification email is the **only** outbound
notification channel wired today. SMS / WhatsApp integrations are
explicitly out of scope.

---

## 9. Payment methods

Two payment methods are supported:

| Method | How it works |
| --- | --- |
| Cash on Delivery (COD) | Order is created with `payment_method = 'cod'` and `payment_status = 'pending'`. Nothing is charged at this stage. The admin marks the order paid after cash is collected. |
| bKash (manual reference) | Order is created with `payment_method = 'bkash'` and `payment_status = 'awaiting_verification'`. The customer supplies a transaction reference which is stored on the order. The admin verifies the reference and marks the order paid. |

No automatic payment gateway is integrated. The application does not
send bKash API requests and does not claim successful payment for any
order that has not been verified by an administrator.

---

## 10. Local development

```bash
npm run dev      # next dev (hot reload)
npm run lint     # ESLint
npm run typecheck# tsc --noEmit
npm run build    # next build
npm start        # next start (after build)
```

Default port: 3000. Override with `PORT=4000 npm run dev`.

### 10.1 Preflight

`scripts/preflight.mjs` is a Node-only check that confirms the
required environment variables are present **before** the
deployment pipeline proceeds. The script never prints the value of
any secret — it only reports `present` / `missing` / `placeholder`
per variable. Placeholders are the literal strings from
`.env.example` (e.g. `service-role-key`, `anon-key`, `re_xxx`).

```bash
npm run preflight             # basic site tier (default)
npm run preflight:auth        # Supabase auth variables
npm run preflight:orders      # order placement + admin
npm run preflight:email       # Resend transactional email
npm run preflight:all         # every variable, informational only
```

Exit codes:

| Code | Meaning |
| --- | --- |
| 0 | All required variables for the requested tier are present and not placeholders. |
| 1 | At least one required variable for the requested tier is missing or still a placeholder. |
| 2 | Invalid CLI argument. |

The preflight never reports a remote service as reachable — it
only inspects the local environment. Pair it with a real network
check (curl, the Resend dashboard, etc.) before treating a tier
as production-ready.

### 10.2 Tests

```bash
npm test
```

Runs Node's built-in `node:test` runner. The suite covers:

- Delivery and pricing (`tests/delivery.test.mjs`).
- Cart operations and variant merging (`tests/cart.test.mjs`).
- Auth validation, including the Bangladeshi phone normaliser
  (`tests/auth-validation.test.mjs`).
- Safe-redirect validation that protects the login flow
  (`tests/redirects.test.mjs`).
- Order state-machine guards for both order and payment statuses
  (`tests/order-transitions.test.mjs`).
- Order-placement input validation, server-side product
  resolution, and the idempotency hash
  (`tests/order-input.test.mjs`).
- Supabase env-config placeholder detection
  (`tests/env-config.test.mjs`).

The tests use a small Node loader (`tests/loader.mjs`) that maps
the `@/*` project alias, stubs `server-only`, and stubs the
Next.js runtime modules so server-only helpers can be imported
in plain Node. No third-party test framework is used — the suite
is plain ESM with `node:test` and `node:assert`.

---

## 11. Testing the order backend

To exercise the full flow end-to-end:

1. Apply the migrations (§ 6) to a Supabase project.
2. Create a customer account (Supabase dashboard or `/register`).
3. Promote that account through `admin_allowlist` (§ 6.1) so you
   can also view `/admin/orders`.
4. Set the Resend env vars (§ 5 + § 8) and verify your sending
   domain in the Resend dashboard.
5. Add a product, complete checkout, then visit
   `/admin/orders/<id>` to confirm the order, customer, delivery
   address, totals, payment status and the notification row.

**Do not run a real paid transaction during testing.** COD and
manual bKash do not need one — both start in a non-paid state.

---

## 12. Production build

```bash
npm run build
npm start
```

The build runs `tsc --noEmit` internally. Any type or ESLint error
fails the build. Lint warnings (unused imports) are not promoted
to errors by default.

`next.config.mjs` keeps `images.remotePatterns` empty because the
project uses no third-party image hosts. Add patterns there if you
wire a CDN.

---

## 13. Deployment notes

The project is a standard Next.js 15 App Router app. It can be
deployed to any platform that supports the Next.js Node.js runtime
(Vercel, Render, Fly, AWS App Runner, a self-managed Node server, …).
The following must hold in production:

- The host runs Node.js 20+.
- All env vars from § 5 are present in the host's secret store.
- The site is reachable over HTTPS (the auth flow uses
  `NEXT_PUBLIC_SITE_URL` to build absolute redirect URLs and that
  URL must match the production origin).
- The Supabase project is provisioned in the same region as the
  application to keep RTT low.
- Database migrations have been applied (see § 6).

No deployment URL is provided in this README. The store is **not
claimed to be live**.

---

## 14. Security boundaries

- The browser never supplies prices, totals, delivery zones,
  payment status, order status, or `user_id`. Every authoritative
  value is recomputed by the order backend on the server.
- Unauthenticated direct calls to the order-placement endpoint
  are rejected by `placeOrder` because the service-role path
  requires a real Supabase session.
- Customer reads (orders, addresses, profile) are scoped by
  `auth.users.id`. RLS refuses rows that do not belong to the
  caller; the service-role path is used only for cross-customer
  reads in `/admin` after `requireAdmin()` succeeds.
- The admin allowlist is the single source of truth for
  administrator status; there is no client-side role flag.
- Public order tracking requires both the order number and the
  contact phone, and is rate-limited (5 attempts per IP per
  10 minutes) to prevent enumeration.
- The contact form is rate-limited the same way.
- The login `redirect` parameter is validated by
  `isSafeInternalPath()` (same-origin, no schemes).
- The service-role key is read only from server-only modules
  (`lib/orders/*`, `lib/support/*`) and is never imported by any
  client component.
- The newsletter endpoint validates the address, deduplicates by
  lower-cased email, rotates the unsubscribe token on every
  state change, and rate-limits submissions per IP.

This is the audit summary, not a penetration test. None of the
above is a substitute for a professional security review.

---

## 15. What still requires the operator

- **Real product media.** All hero, product, and campaign slots
  render as empty placeholders until assets are added to the
  seed data and image hosts. No stock photos are inserted.
- **Approved policy text.** `config/content.ts` carries the legal
  copy. Each entry has a `published` flag — pages render a
  "draft" banner until the operator flips the flag.
- **An active Supabase project and Resend account** to run
  the order flow end-to-end.
- **A verified Resend sending domain** for emails to deliver.
- **Operator review of the seed catalogue** (categories,
  products, prices) before any customer sees the store.
#   M o n o f o r m  
 