# Customer account area

This document covers the customer account area introduced in
Prompt 08: the dashboard, personal information editor, saved
delivery addresses and order history placeholder. It explains
how the page-level protection works, how the address data model
is wired and which flows need a real Supabase project to
function.

For the underlying authentication setup, see
[`docs/AUTH.md`](./AUTH.md).

## 1. Routes

| Route | Server-side guard | Renders |
| --- | --- | --- |
| `/account` | `requireUser('/account')` | Dashboard with welcome, address / order summaries and quick links |
| `/account/profile` | `requireUser('/account/profile')` | Personal information editor |
| `/account/addresses` | `requireUser('/account/addresses')` | Saved delivery address manager |
| `/account/orders` | `requireUser('/account/orders')` | Order history |
| `/account/orders/[id]` | `requireUser(\`/account/orders/${id}\`)` | Single order |

The middleware also covers every `/account/*` prefix so anonymous
visitors are redirected to `/login?redirect=…` before the page is
ever rendered.

## 2. Personal information

`/account/profile` lets a customer edit:

- **Full name** — sourced from `customer_profiles.full_name` or
  the auth metadata set during registration. The customer can
  change it freely.
- **Phone** — optional. Stored in `customer_profiles.phone`,
  normalised on the server to the local `01XXXXXXXXX` form. The
  application accepts the common valid Bangladeshi
  representations (`01XXXXXXXXX`, `+8801XXXXXXXXX`,
  `8801XXXXXXXXX`, `1XXXXXXXXX`) via
  `normaliseBdPhone` / `validateBdPhone` in
  `lib/auth/validation.ts`.
- **Email** — **read-only**. The email is owned by the auth
  provider (`auth.users.email`); changes must go through
  Supabase's own verification flow. The form does not accept an
  email change.

The full name is read from the database. Phone normalisation is
performed on the server so the database always stores the local
format.

## 3. Saved delivery addresses

`/account/addresses` is a full address manager:

- View all saved addresses.
- Add a new address.
- Edit an existing address.
- Delete an address (with a `window.confirm` confirmation).
- Set the default address.

The address model is stored in the `customer_addresses` table
defined by `supabase/migrations/0002_customer_addresses.sql`.
The relevant columns are:

- `id` — generated UUID primary key.
- `user_id` — references `auth.users(id)`; the customer never
  supplies this value.
- `recipient_name`, `phone`, `district`, `address_line` —
  required.
- `locality`, `additional_details`, `postal_code`,
  `delivery_instructions` — optional, but validated for length.
- `delivery_zone` — explicit `inside_dhaka` / `outside_dhaka`
  classification chosen by the customer. The shipping rate
  (৳70 / ৳120) is calculated by the checkout service using this
  column — the address manager never computes a charge.
- `is_default` — boolean. The partial unique index
  `customer_addresses_one_default_per_user` guarantees that at
  most one row per customer is `is_default = true`.

### Ownership and RLS

All four RLS policies scope the table to `auth.uid() = user_id`:

- `select`
- `insert` (with `with check (auth.uid() = user_id)`)
- `update` (with a restrictive policy that prevents the
  `user_id` from being reassigned)
- `delete`

A customer cannot read, edit, delete or set-default an address
belonging to another customer, even by tampering with the URL
or the request payload. The service layer additionally checks
`getOwnedAddress(id)` before any update so the application
returns a clear "not found" error instead of leaking a generic
RLS message.

### Default address invariants

The `addAddress` and `setDefaultAddress` services clear any
existing default before promoting a new one, so the partial
unique index never rejects a legitimate write. Deleting the
default address is allowed; the remaining addresses stay
non-default, and the customer can promote one explicitly.

### Service exposure for checkout

The address service in `lib/account/address.ts` is the same
module the future checkout prompt will import. The functions
exposed for reuse are:

- `listAddresses()` — owner-scoped list.
- `getDefaultAddress()` — the customer's default, or `null`.
- `getOwnedAddress(id)` — owner-scoped single lookup.
- `validateAddressInput(input)` — pure validation, safe to call
  in the browser.

The checkout prompt should call `listAddresses` /
`getDefaultAddress` to surface saved addresses, and call
`validateAddressInput` to validate any new address before
submitting it.

## 4. Order history

`/account/orders` and `/account/orders/[id]` are the
account-level entry points for the eventual order service.

The data access layer in `lib/account/orders.ts` defines:

- `listOrders()` — owner-scoped list. Today it returns a
  `not_supported` state because the order table is not part of
  this prompt.
- `getOrder(id)` — owner-scoped single lookup. Same `not_supported`
  state today.

Both functions perform the session check and the owner-scoped
query placeholder. When the order backend is provisioned (a
later prompt), the same shape will return real rows without any
UI changes. The page already renders the empty / "no orders"
state, the "not found" state, the error state and the "not
configured" state so the eventual wiring is purely additive.

The order detail page validates ownership the same way:
`getOrder(id)` requires the row to belong to `auth.uid()`. A
forged id never returns another customer's order.

## 5. Sign out

Both the account sidebar and the mobile nav render the
`AccountSignOutForm` component, which posts to the
`accountSignOutAction` server action. The action calls the real
`supabase.auth.signOut()` (so the session is invalidated on the
server) and then the client navigates the customer to `/` and
revalidates the routes that depend on session state.

The cart is **not** touched by the sign-out flow. Guests keep
their local bag, and signing out from a logged-in session does
not clear `localStorage`. The cart-merge logic will be added
together with the future server-side cart.

## 6. Setup required

Without `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, every account page renders the
`AccountNotConfiguredNotice` instead of pretending the
integration works. The notice links back to
[`docs/AUTH.md`](./AUTH.md).

The full setup is:

1. Create a Supabase project and copy the URL + anon key into
   `.env.local`.
2. Apply `supabase/migrations/0001_customer_profiles.sql` and
   `supabase/migrations/0002_customer_addresses.sql` through
   the SQL editor (or `supabase db push`).
3. Configure the auth redirect URLs as documented in
   `docs/AUTH.md`.
4. `npm run dev` and visit `/account` to confirm the dashboard
   renders for your test customer.

## 7. Security checklist (in code)

- The `user_id` column is never accepted from the client; the
  services always derive it from the session.
- A restrictive RLS policy prevents the `user_id` of an existing
  row from being changed by an `update`.
- `getOwnedAddress(id)` runs an explicit owner check before any
  update, so the application surfaces a clear "not found" error
  rather than a generic RLS error.
- The `is_default` invariant is enforced at the database level
  by the partial unique index — even a buggy client cannot
  create two default addresses.
- Phone numbers are normalised to the local `01XXXXXXXXX` form
  on the server before being stored.
- Email is read-only in the form and is sourced from
  `auth.users.email`, never from a client-controlled field.
- The order service is owner-scoped; a forged id in the URL
  returns `not_found`, not another customer's data.

## 8. What works without a backend

- All page-level route protection (middleware + `requireUser`).
- The form client-side validation (required fields, BD phone
  normalisation, email format, max lengths).
- The address service correctly refuses any write that does not
  match the session user.
- The order list / detail render honest empty / not-supported
  states with no fabricated data.
- The sign-out flow is wired to the real `supabase.auth.signOut`.

## 9. What needs real Supabase credentials

- Profile read / write (`customer_profiles` table + RLS).
- Address list / add / edit / delete / set-default.
- Order list / detail (when the order service is provisioned).
- Sign-out session invalidation (the local UI works without
  Supabase, but the cookie is not cleared server-side).
