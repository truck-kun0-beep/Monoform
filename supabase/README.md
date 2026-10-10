# Supabase

This directory holds the SQL migrations that the MONOFORM Next.js
app expects to be applied to its Supabase project. Nothing in this
folder is shipped to the browser — the SQL is run manually through
the Supabase SQL editor, or piped through the `supabase` CLI.

## Migrations

| File | What it does |
| --- | --- |
| `migrations/0001_customer_profiles.sql` | Creates the `customer_profiles` table keyed on `auth.users(id)`, with Row Level Security policies that allow a customer to read and update only their own record. |
| `migrations/0002_customer_addresses.sql` | Creates the `customer_addresses` table keyed on `auth.users(id)`, with RLS policies that scope every read and write to the authenticated customer. Enforces a single default address per customer through a partial unique index. |
| `migrations/0003_orders_and_admin.sql` | Creates the `orders`, `order_items`, `order_status_history`, `order_notifications` and `admin_allowlist` tables, plus the `next_order_number()` generator and the `is_admin()` RLS helper. Customer reads are owner-scoped; admin reads are gated by `admin_allowlist`. |

## How to apply a migration

1. Open the [Supabase dashboard](https://app.supabase.com) and
   select your project.
2. Click `SQL Editor` → `New query`.
3. Paste the contents of the migration file and click `Run`.
4. Verify under `Table Editor` that the table exists, that the
   row-level security policies are enabled, and (for the address
   table) that the partial unique index is in place.

Or, with the Supabase CLI linked to your project:

```bash
supabase db push
```

## Required dashboard settings

- **Authentication → Email** is enabled.
- **Authentication → Email Templates → Confirmation** keeps the
  default subject so the verification email reaches the customer.
- **Authentication → URL Configuration**:
  - `Site URL` should be set to the production site
    (e.g. `https://monoform.example`).
  - `Additional redirect URLs` should include the local dev URL
    (`http://localhost:3000`) and the production callback path
    (`/reset-password`).
- **Authentication → Providers → Email** — leave `Confirm email`
  on if you want to enforce verification; the registration form
  handles both cases.

After changing the auth settings, restart the Next.js dev server
so the SSR client picks up the new redirect URLs.

## Order service

The order backend introduced in `migrations/0003_orders_and_admin.sql`
creates the authoritative `orders`, `order_items`,
`order_status_history`, `order_notifications` and `admin_allowlist`
tables, along with the `next_order_number()` generator and the
`is_admin()` helper.

To promote an authenticated user to the administrator role, insert a
row into `admin_allowlist` through the Supabase SQL editor using the
service role (the table's RLS policies refuse client-side inserts):

```sql
insert into public.admin_allowlist (user_id, note)
values ('00000000-0000-0000-0000-000000000000', 'store owner');
```

The matching `auth.users.id` is the UUID of the customer's account.
The user must already have signed in at least once so the row exists
in `auth.users`.
