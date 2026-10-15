# MONOFORM

> A considered, minimalist e-commerce storefront for the Bangladesh market.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6_strict-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_+_Postgres-3ecf8e?logo=supabase)](https://supabase.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Node](https://img.shields.io/badge/Node-20%2B-339933?logo=node.js)](https://nodejs.org)

MONOFORM is a production-ready, headless e-commerce storefront built for the
Bangladesh market. It pairs a server-rendered Next.js 15 (App Router) frontend
with a Supabase backend and a Resend-powered transactional email pipeline.
Payments are intentionally offline (Cash on Delivery + manual bKash reference)
so the store can launch without a payment-gateway integration.

---

## Table of contents

1. [Highlights](#1-highlights)
2. [Technology stack](#2-technology-stack)
3. [Repository layout](#3-repository-layout)
4. [Quickstart](#4-quickstart)
5. [Environment variables](#5-environment-variables)
6. [Database setup and migrations](#6-database-setup-and-migrations)
7. [Authentication](#7-authentication)
8. [Order notifications (Resend)](#8-order-notifications-resend)
9. [Payment methods](#9-payment-methods)
10. [Local development](#10-local-development)
11. [Testing the notification outbox](#11-testing-the-notification-outbox)
12. [Production build](#12-production-build)
13. [Deployment](#13-deployment)
14. [Security boundaries](#14-security-boundaries)
15. [Operational checklist](#15-operational-checklist)
16. [License](#16-license)

---

## 1. Highlights

- **End-to-end order pipeline** — checkout, server-side order placement, an
  outbox-backed notification dispatcher, and a full admin dashboard for
  order management, status transitions, and payment reconciliation.
- **Honest failure modes** — the storefront never fabricates a success. If
  Supabase, the service-role key, the store-owner email, or the Resend
  credentials are missing, the UI renders a clear "Setup required" state
  instead of pretending to work.
- **Resilient notification outbox** — every committed order is paired with a
  `pending` row in `order_notifications`. Email failures are recorded on
  the row, never on the order. The admin dashboard surfaces the real state
  and offers a one-click retry / rebuild.
- **Strict server / client separation** — `@/lib/orders/server` is marked
  `"server-only"` and is the **only** path that reads or writes order data.
  No client component ever sees the service-role key.
- **Row Level Security everywhere** — every public table is protected by
  RLS. Customers can only see their own data; administrators are gated by
  `admin_allowlist`; cross-customer reads happen only after `requireAdmin()`
  succeeds and go through the service-role client.
- **Hardened redirects** — the login `?redirect=…` parameter is validated
  by `isSafeInternalPath()`, so the auth flow cannot be coerced into an
  open redirect.
- **Rate-limited public endpoints** — order tracking and the contact form
  both enforce 5 attempts per IP per 10 minutes to prevent enumeration.

---

## 2. Technology stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15.5 (App Router, RSC, server actions) |
| Runtime | Node.js 20+ (React 19) |
| Language | TypeScript 5.6, `strict: true` |
| Styling | Tailwind CSS 3.4 |
| Auth & DB | Supabase (`@supabase/ssr` + `@supabase/supabase-js`) |
| Email | Resend HTTP API, called directly via `fetch()` (no SDK) |
| Payments | Cash on Delivery + manual bKash reference |
| Lint | ESLint 9 (flat config, typescript-eslint recommended) |
| Tests | Node's built-in `node:test` runner, plain ESM |

The project intentionally avoids heavyweight additions. The order backend
is plain TypeScript calling Supabase through the service-role client. Email
goes straight to Resend's HTTP API.

---

## 3. Repository layout

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
  migrations/            0001 … 0005 (apply in numeric order)
  README.md              Migration overview
docs/                    Markdown source for the in-app /docs routes
types/                   Shared TS types
```

The `@/lib/orders/server` module is the only path that ever reads or writes
order data. Client components must not import it.

---

## 4. Quickstart

```bash
# 1. Clone and install
git clone <repo>
cd <repo>
npm install

# 2. Configure secrets
cp .env.example .env.local
# Open .env.local and fill in:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
#   SUPABASE_SERVICE_ROLE_KEY
#   STORE_ORDER_NOTIFICATION_EMAIL
#   RESEND_API_KEY
#   RESEND_FROM_EMAIL

# 3. Apply the Supabase migrations (see § 6)

# 4. Start the dev server
npm run dev
```

Open <http://localhost:3000>.

For a full end-to-end smoke test, see
[§ 11 — Testing the notification outbox](#11-testing-the-notification-outbox).

---

## 5. Environment variables

The full set is documented in `.env.example`. Summary:

| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | yes (prod) | public | Origin used to build absolute redirect URLs |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | public | Browser-safe Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | public | Browser-safe publishable anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | for orders | server-only | Privileged key for the order backend |
| `STORE_ORDER_NOTIFICATION_EMAIL` | for orders | server-only | Recipient of every new-order email |
| `RESEND_API_KEY` | for emails | server-only | Resend transactional-email key |
| `RESEND_FROM_EMAIL` | for emails | server-only | Verified sender identity |

The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is still accepted as a fallback
when the publishable key is not set, but the publishable key wins when both
are present. The application refuses to construct a public client if a value
that looks like a service-role key is supplied through the public env vars.

When a required variable is absent, the affected UI surface renders an
honest "Setup required" state instead of pretending to work. The order
backend logs a `notification_recipient_missing` event when the store-owner
email is unset, and a `provider_not_configured` event when Resend is
unconfigured, so the failure is always visible.

> **Never commit `.env.local` or any file containing real credentials.**

---

## 6. Database setup and migrations

Apply the SQL files in numeric order through the Supabase SQL editor (or
`supabase db push`):

| File | Purpose |
| --- | --- |
| `0001_customer_profiles.sql` | `customer_profiles` + RLS |
| `0002_customer_addresses.sql` | `customer_addresses` + RLS, single default per user |
| `0003_orders_and_admin.sql` | `orders`, `order_items`, `order_status_history`, `order_notifications`, `admin_allowlist`, `next_order_number()`, `is_admin()` |
| `0004_support_messages.sql` | `support_messages` + RLS for the contact form |
| `0005_newsletter_subscriptions.sql` | `newsletter_subscriptions` + RLS, token-rotated unsubscribe |

After applying, confirm RLS is enabled on every public table and audit the
policies with `select * from pg_policies`.

### 6.1 Promote the first administrator

The admin dashboard and the order-management endpoints are gated by
`public.admin_allowlist`. RLS refuses client-side inserts into the
allowlist, so the first row must be created through the service role (or
the Supabase SQL editor with the service role active):

```sql
insert into public.admin_allowlist (user_id, note)
values ('00000000-0000-0000-0000-000000000000', 'store owner');
```

The `user_id` is the customer's `auth.users.id` — get it from
**Authentication → Users** in the dashboard after the customer has signed
in at least once.

---

## 7. Authentication

In **Authentication → URL Configuration**:

- **Site URL** = your production origin (e.g. `https://monoform.example`).
- **Additional redirect URLs** must include `http://localhost:3000` and
  the production callback path `…/reset-password`.

Leave the **Email** provider enabled. The default Supabase confirmation
template is fine. Restart `npm run dev` after changing auth settings so
the SSR client picks them up.

The `redirect` parameter the login form accepts is validated by
`isSafeInternalPath()` — external URLs and protocol-relative destinations
are rejected, so `/login?redirect=…` cannot be used for open-redirect
attacks.

---

## 8. Order notifications (Resend)

The order notification pipeline is built around a **durable outbox**. Every
committed order is paired with a row in `order_notifications`; the email
dispatch happens after the order is durable, and the outcome (`sent` /
`failed` / `pending`) is written back to the row. The store-owner email is
the only outbound notification channel wired today — SMS and WhatsApp
integrations are explicitly out of scope.

The dispatch contract is:

1. `placeOrder` commits the order, line items, and status history, **then**
   inserts a `pending` row in `order_notifications` using the resolved
   recipient. A missing `STORE_ORDER_NOTIFICATION_EMAIL` does not abort
   the order; the row is inserted with the safe fallback recipient
   `not-configured@local.invalid` and `last_error` explains the exact
   reason (`unset` / `placeholder` / `invalid`).
2. `dispatchNewOrderNotification` reads the row, calls Resend, and writes
   the outcome back: `sent` (with `provider_message_id`), `failed` (with
   `last_error`), or `pending` (with `last_error = "Email provider is not
   configured."` if the Resend env vars are missing).
3. The admin dashboard at `/admin/orders/[id]` surfaces the live row
   state, including the recipient, the attempt count, the last error
   text, and a one-click **Retry notification** button for `pending` and
   `failed` rows. A **Rebuild notification** button appears for orders
   that committed with zero outbox rows (typically placed before the
   outbox contract existed or during an outage).

Duplicate-dispatch is prevented by `status === "sent"` short-circuits in
the dispatch pipeline — refreshing the admin page never re-sends an email.

---

## 9. Payment methods

Two payment methods are supported. No automatic payment gateway is
integrated.

| Method | Flow |
| --- | --- |
| **Cash on Delivery (COD)** | Order is created with `payment_method = 'cod'` and `payment_status = 'pending'`. Nothing is charged at this stage. The admin marks the order paid after cash is collected. |
| **bKash (manual reference)** | Order is created with `payment_method = 'bkash'` and `payment_status = 'awaiting_verification'`. The customer supplies a transaction reference which is stored on the order. The admin verifies the reference and marks the order paid. |

The application does not send bKash API requests and does not claim
successful payment for any order that has not been verified by an
administrator.

---

## 10. Local development

```bash
npm run dev       # next dev (hot reload)
npm run lint      # ESLint
npm run typecheck # tsc --noEmit
npm run build     # next build
npm start         # next start (after build)
```

Default port: `3000`. Override with `PORT=4000 npm run dev`.

### 10.1 Preflight

`scripts/preflight.mjs` is a Node-only check that confirms the required
environment variables are present **before** the deployment pipeline
proceeds. The script never prints the value of any secret — it only
reports `present` / `missing` / `placeholder` per variable. Placeholders
are the literal strings from `.env.example` (e.g. `service-role-key`,
`anon-key`, `re_xxx`).

```bash
npm run preflight        # basic site tier (default)
npm run preflight:auth   # Supabase auth variables
npm run preflight:orders # order placement + admin
npm run preflight:email  # Resend transactional email
npm run preflight:all    # every variable, informational only
```

| Exit code | Meaning |
| --- | --- |
| `0` | All required variables for the requested tier are present and not placeholders. |
| `1` | At least one required variable is missing or still a placeholder. |
| `2` | Invalid CLI argument. |

The preflight never reports a remote service as reachable — it only
inspects the local environment. Pair it with a real network check (curl,
the Resend dashboard, etc.) before treating a tier as production-ready.

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
- Order-placement input validation, server-side product resolution,
  and the idempotency hash (`tests/order-input.test.mjs`).
- Notification-recipient resolution
  (`tests/notification-recipient.test.mjs`).
- Order-notification outbox contract: always-write, fallback recipient,
  rebuild path, retry idempotency
  (`tests/order-notification-outbox.test.mjs`).
- Supabase env-config placeholder detection
  (`tests/env-config.test.mjs`).
- Preflight placeholder / secret-safety behaviour
  (`tests/preflight.test.mjs`).
- Live end-to-end Supabase round-trips — auto-skipped when the
  service-role key is the placeholder or the URL is the example domain
  (`tests/order-checkout-flow.live.test.mjs`).

The tests use a small Node loader (`tests/register-loader.mjs`) that
maps the `@/*` project alias, stubs `server-only`, and stubs the
Next.js runtime modules so server-only helpers can be imported in plain
Node. No third-party test framework is used — the suite is plain ESM
with `node:test` and `node:assert`.

---

## 11. Testing the notification outbox

To exercise the full notification pipeline end-to-end against your live
Supabase project:

1. Apply the migrations (§ 6) and promote an admin (§ 6.1).
2. In `.env.local` (and on the host for the deployed app), set:
   - `STORE_ORDER_NOTIFICATION_EMAIL` to a real, deliverable address
     (not the documented placeholder).
   - `RESEND_API_KEY` to a real `re_*` key.
   - `RESEND_FROM_EMAIL` to a verified Resend identity.
3. Run `npm run preflight:orders` and `npm run preflight:email` to
   confirm the variables are present and not placeholders.
4. `npm run dev`, sign in as a customer, place a test order (any
   product, COD).
5. Open `/admin/orders` in the deployed dashboard and click **View**
   on the new order. Confirm:
   - The new **Store-owner notifications** card shows a row with a
     `Sent` badge, `Attempts: 1`, and a `Last attempted at` timestamp.
   - Your inbox contains the formatted email with the `Open in admin`
     link.
6. To exercise the failure / rebuild paths:
   - Temporarily blank `STORE_ORDER_NOTIFICATION_EMAIL`, place another
     order, and refresh the admin page. The card now says the
     recipient is not configured and shows a **Rebuild notification**
     button. Re-set the env var, restart the dev server, click
     **Rebuild notification**, and confirm the row transitions to
     `Sent` and the email is delivered.
   - For an order that already has a `pending` or `failed` row (e.g.
     MF-000007 in the seed data), use **Retry notification** and
     confirm the attempt counter increments and the row transitions
     to `Sent` if Resend is configured.

> **Do not run a real paid transaction during testing.** COD and manual
> bKash do not need one — both start in a non-paid state.

---

## 12. Production build

```bash
npm run build
npm start
```

The build runs `tsc --noEmit` internally. Any type or ESLint error fails
the build. Lint warnings (unused imports) are not promoted to errors by
default.

`next.config.mjs` keeps `images.remotePatterns` empty because the project
uses no third-party image hosts. Add patterns there if you wire a CDN.

---

## 13. Deployment

The project is a standard Next.js 15 App Router app. It runs on any
platform that supports the Next.js Node.js runtime (Vercel, Render, Fly,
AWS App Runner, a self-managed Node server, etc.). The following must
hold in production:

- The host runs Node.js 20+.
- All env vars from § 5 are present in the host's secret store.
- The site is reachable over HTTPS — the auth flow uses
  `NEXT_PUBLIC_SITE_URL` to build absolute redirect URLs, and that URL
  must match the production origin.
- The Supabase project is provisioned in the same region as the
  application to keep RTT low.
- The database migrations from § 6 have been applied.
- An admin user has been promoted via `admin_allowlist` (§ 6.1).

---

## 14. Security boundaries

- The browser never supplies prices, totals, delivery zones, payment
  status, order status, or `user_id`. Every authoritative value is
  recomputed by the order backend on the server.
- Unauthenticated direct calls to the order-placement endpoint are
  rejected by `placeOrder` because the service-role path requires a
  real Supabase session.
- Customer reads (orders, addresses, profile) are scoped by
  `auth.users.id`. RLS refuses rows that do not belong to the caller;
  the service-role path is used only for cross-customer reads in
  `/admin` after `requireAdmin()` succeeds.
- The admin allowlist is the single source of truth for administrator
  status; there is no client-side role flag.
- The `order_notifications` table is readable only by the admin
  allowlist. Customers can never see internal delivery metadata.
- Public order tracking requires both the order number and the contact
  phone, and is rate-limited (5 attempts per IP per 10 minutes) to
  prevent enumeration.
- The contact form is rate-limited the same way.
- The login `redirect` parameter is validated by `isSafeInternalPath()`
  (same-origin, no schemes).
- The service-role key is read only from server-only modules
  (`lib/orders/*`, `lib/support/*`) and is never imported by any client
  component.
- The newsletter endpoint validates the address, deduplicates by
  lower-cased email, rotates the unsubscribe token on every state
  change, and rate-limits submissions per IP.

This is the audit summary, not a penetration test. None of the above is
a substitute for a professional security review.

---

## 15. Operational checklist

Before going live, confirm every item below.

**Brand and content**

- [ ] Real product media is added to the seed data and image hosts.
- [ ] `config/content.ts` legal copy is reviewed and `published` is set
      to `true` on each entry.
- [ ] The seed catalogue (categories, products, prices) has been
      reviewed by the operator.

**Infrastructure**

- [ ] An active Supabase project is provisioned in the same region as
      the host.
- [ ] All migrations from § 6 are applied.
- [ ] At least one user has been promoted to administrator via
      `admin_allowlist`.
- [ ] The Resend sending identity is verified in the Resend dashboard.

**Environment**

- [ ] `NEXT_PUBLIC_SITE_URL` matches the production origin.
- [ ] `STORE_ORDER_NOTIFICATION_EMAIL` is a real, deliverable address.
- [ ] `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are populated and
      verified.
- [ ] `npm run preflight:all` reports PASS for every tier.

**Smoke test**

- [ ] A test order is placed from the deployed storefront.
- [ ] The admin dashboard at `/admin/orders/[id]` shows a `Sent`
      notification row and the matching email is received.
- [ ] A second test order is placed with the recipient temporarily
      blanked, the admin dashboard shows the rebuild path, and the
      order is rebuildable after the env var is restored.

---

## 16. License

Proprietary — all rights reserved. Contact the project owner for
licensing, redistribution, or white-label enquiries.
