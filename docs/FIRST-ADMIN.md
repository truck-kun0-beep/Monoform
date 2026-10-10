# Promoting the first administrator

This document is the **only** safe way to grant administrator
access to the MONOFORM storefront. Read it end-to-end before doing
any of the steps.

The storefront has **no public promotion endpoint**. The role is
written into a single database table (`public.admin_allowlist`)
through a privileged operation that an ordinary customer cannot
trigger from the browser.

## 1. The threat model

The administrator role can:

- Read every order in the system, across all customers.
- Update order status and payment status.
- Trigger a new-order email to the configured owner address.
- Retry a failed notification.

If a regular customer could grant themselves the role, the entire
order history of the storefront would be exposed. The design
prevents this in three layers:

1. **No client-side role flag.** The application code never
   inspects a `role` cookie, query string, or localStorage entry.
2. **Server-side role lookup.** Every admin route calls
   `requireAdmin()`, which queries the `admin_allowlist` table
   through the service-role client and returns `forbidden` for
   every non-member.
3. **Row Level Security.** Even if a customer constructed a
   crafted Supabase client request, the `admin_allowlist` RLS
   policy refuses every insert from anon and authenticated roles.
   Only the service role can write a row.

The remaining surface — the Supabase SQL editor — is the only path
to grant administrator access, and it is restricted to project
owners.

## 2. Prerequisites

- The MONOFORM Supabase project is provisioned.
- The five migrations in `supabase/migrations/` are applied in
  numeric order. `0003_orders_and_admin.sql` creates the
  `admin_allowlist` table and the `is_admin()` helper.
- The intended administrator has created an account through
  `/register` (or the Supabase dashboard) and confirmed their
  email if email confirmation is enabled.

## 3. Step-by-step procedure

### Step 1 — capture the user id

1. Sign in as the intended administrator through `/login`.
2. In the Supabase dashboard, open **Authentication → Users**.
3. Locate the user row and copy the `id` (a UUID).
4. Confirm the email address matches the intended administrator.

If you cannot find the user, the account has not been created.
The administrator must register first — do not proceed without a
matching `auth.users` row.

### Step 2 — open the Supabase SQL editor as the service role

1. In the Supabase dashboard, click **SQL Editor → New query**.
2. The editor runs as the **postgres** role by default, which is
   the service role for the project. Do not switch to the `anon`
   or `authenticated` role — those cannot write to
   `admin_allowlist`.
3. Paste the following query, replacing the placeholder UUID with
   the user id you captured in Step 1:

   ```sql
   insert into public.admin_allowlist (user_id, note)
   values ('00000000-0000-0000-0000-000000000000', 'store owner');
   ```

4. Click **Run**. The query should return one row.

If the query fails with "new row violates row-level security
policy", the editor is not running as the service role. Switch
to the `postgres` role (Supabase SQL editor always uses the
project owner; the failure indicates a different policy or
schema drift — re-apply migration `0003_orders_and_admin.sql`
and retry).

### Step 3 — verify the promotion

1. Sign in as the new administrator at `/login`.
2. Open `/admin`. The dashboard should render the order list (or
   the "No orders placed yet" empty state, depending on the
   project's history).
3. If the page renders a "You don't have access to the admin
   dashboard" message, the user id does not match. Re-check the
   value inserted into `admin_allowlist`.

### Step 4 — verify the boundary in the other direction

1. Sign out.
2. Register a separate customer through `/register`. This is the
   "ordinary customer" used to confirm the boundary.
3. Open `/admin` while signed in as that customer. The page must
   show the "You don't have access to the admin dashboard"
   message.
4. Open `/admin/orders` directly — the same message should
   appear. Even if the URL is guessed or shared, the page must
   refuse to render.

Only after both verifications succeed should the storefront be
considered ready for live use.

## 4. Promoting additional administrators

The procedure is the same. Each new administrator:

1. Registers through `/register` (or is invited through the
   Supabase dashboard).
2. Has their `auth.users.id` captured.
3. Has a row inserted into `admin_allowlist`.

There is no de-provisioning endpoint. To revoke administrator
access, run:

```sql
delete from public.admin_allowlist
where user_id = '00000000-0000-0000-0000-000000000000';
```

The `on delete cascade` on the foreign key ensures the row is
removed if the underlying `auth.users` row is ever deleted.

## 5. What the operator must NOT do

- Do not insert an `admin_allowlist` row for a user that has
  never signed in. The RLS policies on the order tables assume
  `auth.users.id` is a real, signed-in user.
- Do not edit `auth.users.app_metadata` to add a role. The
  application does not read that field; the change will not take
  effect.
- Do not commit the service-role key, the SQL query, or any
  UUID that should remain private to the public repository.
- Do not share the Supabase SQL editor link with anyone outside
  the project owner.

## 6. What to do if a promotion goes wrong

If a row is inserted with the wrong user id:

```sql
delete from public.admin_allowlist
where user_id = '<wrong-uuid>';
```

Then re-run the insert with the correct UUID. The table has no
history column, so there is no audit trail of the mistake
itself — record the action in your own operational log.
