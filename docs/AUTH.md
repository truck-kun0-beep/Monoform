# Customer authentication

This document explains how the customer authentication flows in
`/login`, `/register`, `/forgot-password` and `/reset-password` are
wired, how to configure Supabase, how to run the database migration
and how to test the flows locally.

The implementation is built on **Supabase Auth** using the official
`@supabase/ssr` package. The browser and server clients, the
`AuthProvider` context and the edge middleware all read the same
session so sign-in state is consistent across navigation, refresh
and protected server actions.

## 1. Required environment variables

| Variable | Scope | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Your Supabase project URL, e.g. `https://abc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | The **publishable** key from the project settings (canonical name in the current Supabase dashboard). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public (legacy) | The **anon** key — the older name for the same publishable token. Still honoured as a fallback so projects that have not migrated to the new naming keep working. When both are set the publishable key wins. |
| `NEXT_PUBLIC_SITE_URL` | public | Public storefront URL. Used for Supabase email callback URLs. |

Copy `.env.example` to `.env.local` and replace the placeholder
values. The auth pages render an honest "setup required" state when
either variable is missing or still a placeholder — they never
claim that the integration works without real credentials.

The service-role key is **never** imported anywhere in this app.
Privileged writes to the `customer_profiles` table happen only via
SQL functions that the service role owns. The application also
refuses to construct a public client if a value that looks like a
service-role / secret key (`sb_secret_…`, `sbp_…`, or a JWT with a
`role: "service_role"` claim) is supplied through either of the
`NEXT_PUBLIC_SUPABASE_*_KEY` variables.

## 2. Required Supabase dashboard settings

Open the Supabase dashboard for your project and check the
following:

1. **Authentication → Providers → Email** is enabled.
2. **Authentication → Email Templates** keeps the default subjects
   for `Confirmation` and `Reset password` so the verification and
   recovery emails reach the customer.
3. **Authentication → URL Configuration**:
   - `Site URL` = the production URL (e.g. `https://monoform.example`).
   - `Additional redirect URLs` includes:
     - `http://localhost:3000` (local development)
     - `http://localhost:3000/reset-password` (recovery callback)
     - `https://monoform.example/reset-password` (production)
4. **Authentication → Email → Confirm email** — leave it on if you
   want verification, or off for instant sign-up. The registration
   form handles both: when the provider returns a session the user
   is signed in immediately, otherwise we display a "check your
   email" message.

After changing any of these settings, restart the Next.js dev
server so the new redirect URLs are picked up.

## 3. Apply the database migration

The `supabase/migrations/0001_customer_profiles.sql` migration
creates the `customer_profiles` table with the appropriate
Row Level Security policies.

To apply it through the dashboard:

1. Open `SQL Editor` → `New query`.
2. Paste the contents of the migration file.
3. Click `Run`.
4. Verify under `Table Editor → customer_profiles` that the table
   exists and that RLS is enabled.

Or, with the Supabase CLI linked to your project:

```bash
supabase db push
```

The migration installs:

- A `customer_profiles` row keyed on `auth.users(id)`.
- A trigger that inserts a profile automatically on sign-up.
- Policies that allow a customer to read and update only their own
  profile.
- A restrictive policy that prevents customers from editing their
  own `role` column. Privileged operations are limited to the
  service role.

## 4. How the flows work

### Registration (`/register`)

`registerAction` (server action) calls
`supabase.auth.signUp({ email, password, options: { data: { full_name }, emailRedirectTo } })`.
When email confirmation is enabled Supabase returns no session and
the page displays a "check your email" notice. When confirmation is
disabled the user is signed in immediately and the page navigates
to the validated `redirect` query parameter (default `/account`).

The form tracks these outcomes through an explicit
`status` discriminator on the action's success result
(`"verification_pending"` vs `"signed_in"`). The initial state of
the form is the shared `{ ok: false, error: "" }` sentinel — the
"check your email" panel is never shown until the action
genuinely returns `status: "verification_pending"`. The form also
rejects any value that looks like a service-role key in the
public env vars before it even starts, so a misconfigured
deployment surfaces the setup notice rather than a fake success
state.

### Login (`/login`)

`signInAction` calls `supabase.auth.signInWithPassword`. The cookie
returned by the provider is read by the middleware and the
`AuthProvider` on every subsequent request, so the header account
menu and the cart checkout CTA update without a manual refresh.

A successful sign-in is reported as
`{ ok: true, status: "signed_in", redirectTo }`; any failure
(bad credentials, network, or unconfigured) is reported as
`{ ok: false, error }`. The form only navigates when the action
returns the explicit `signed_in` status, so a misconfigured
deployment never redirects the user on a fake success.

### Forgot password (`/forgot-password`)

`forgotPasswordAction` calls
`supabase.auth.resetPasswordForEmail` with a `redirectTo` of
`${NEXT_PUBLIC_SITE_URL}/reset-password`. The response is always a
neutral "check your email" message — we never reveal whether the
address has an account.

The message is gated on the action returning
`{ ok: true, status: "request_submitted" }`. The initial form
state cannot satisfy this branch, so the message is never shown
before the user has actually submitted a valid email address and
the Supabase call has genuinely accepted the request.

### Reset password (`/reset-password`)

Supabase's recovery link lands on this page and the SDK picks up the
session from the URL. The form calls
`supabase.auth.updateUser({ password })` and, on success, redirects
to `/login` so the customer can sign in with their new password.

The success path is reported as
`{ ok: true, status: "password_updated", redirectTo: "/login" }`,
and the "Password updated" panel only renders when the action
returns that status.

If the page is opened without a recovery session (expired link,
already used, or just typed in the URL) the form is replaced with
a "Recovery link required" message and a link to request a new one.
This is enforced by checking the Supabase session client-side and
falls back to server-side validation in the action itself.

## 5. Session handling

- The cookie is set by Supabase on every sign-in event.
- The `middleware.ts` runs on every request, refreshes the cookie
  via `@supabase/ssr` and short-circuits unauthenticated visitors
  to `/login?redirect=…` for the following prefixes:
  - `/account`
  - `/account/orders/[id]`
  - `/orders`
  - `/checkout`
- Server components that need the user call `requireUser(returnTo)`
  from `lib/auth/require`. This both reads the session and redirects
  on the server — the redirect happens before any sensitive data is
  rendered.
- The browser-side `AuthProvider` subscribes to
  `onAuthStateChange` so the header account link and the checkout
  CTA update without a refresh.
- The cart is **never** touched by the auth flow. Guests can keep
  adding to their bag, sign in or register, and continue to
  checkout with the same items and variants.

## 6. Protected routes

| Route | Server-side guard |
| --- | --- |
| `/account` | `requireUser('/account')` |
| `/account/profile` | `requireUser('/account/profile')` |
| `/account/addresses` | `requireUser('/account/addresses')` |
| `/account/orders` | `requireUser('/account/orders')` |
| `/account/orders/[id]` | `requireUser(\`/account/orders/${id}\`)` |
| `/checkout` | middleware redirect (client check in the cart CTA) |

`requireUser` calls `redirect(\`/login?redirect=\${returnTo}\`)`
when there is no session, using the validated `isSafeInternalPath`
helper from `lib/auth/redirects` to refuse external URLs.

## 7. Mandatory sign-in before checkout

The cart's `CheckoutCta` component reads the live auth state and
sends unauthenticated customers to `/login?redirect=/checkout`. The
bag is not mutated at any point — items, sizes, colours and
quantities stay in `localStorage`. After a successful sign-in the
login page calls `router.push(redirect)` and the customer lands on
the existing checkout scaffold.

A future prompt will add the server-side order-placement endpoint
that re-checks the session before accepting the order. The current
implementation provides the foundation; the server-side enforcement
is the responsibility of that later prompt.

## 8. Cart preservation notes

- The cart store keys everything on `monoform.cart.v1` in
  `localStorage`. Nothing in the auth flow reads or writes this
  key, so failed logins and logouts do not delete the bag.
- When a customer signs in for the first time, their local cart
  remains local. Server-side cart sync is the responsibility of a
  later prompt — at that point we will merge the local cart into
  the server-side cart by summing duplicate `(productId, size,
  colour)` lines using the same `makeVariantKey` rules the cart
  store already uses.

## 9. Local testing recipe

1. Create a Supabase project and copy the project URL and
   **publishable** key (Project Settings → API → "Publishable
   key") into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The legacy
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also accepted.
2. Apply the `0001_customer_profiles.sql` migration through the
   Supabase SQL editor.
3. Set `Site URL` to `http://localhost:3000` in
   `Authentication → URL Configuration` and add
   `http://localhost:3000/reset-password` to the additional
   redirect URLs.
4. `npm run dev`.
5. Visit `/register`, create an account, follow the verification
   link from your inbox, then sign in.
6. Add a product to the bag, click `Proceed to Checkout` while
   signed out, confirm the redirect to `/login?redirect=/checkout`,
   sign in, and confirm the bag is preserved.
7. Visit `/forgot-password`, request a reset, follow the link in
   your inbox, choose a new password, sign in.
8. Sign out via the header account menu and confirm the cart is
   still present.

Without a real Supabase project the forms render an honest
"Authentication is not connected" notice instead of pretending the
integration is live.

## ## 10. Customer account area

The customer account area (`/account/*`) reuses the same
authentication and middleware primitives documented above. See
[`docs/ACCOUNT.md`](./ACCOUNT.md) for the account-level
features: dashboard, personal information editor, saved delivery
addresses, sign-out and the order history placeholder.

The account area relies on the additional
`0002_customer_addresses.sql` migration in addition to
`0001_customer_profiles.sql`. Both must be applied for the
dashboard and address manager to function.
