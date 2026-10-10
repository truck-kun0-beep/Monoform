-- ============================================================================
-- 0001_customer_profiles.sql
--
-- Creates the `customer_profiles` table and the Row Level Security policies
-- that make it safe to expose from the browser. The application code lives
-- in /lib/auth; this file is the only place these constraints are defined.
--
-- How to apply:
--   1. Open the Supabase dashboard, then `SQL Editor`.
--   2. Paste the contents of this file and run.
--   3. Verify the policies under `Authentication → Policies` for the
--      `customer_profiles` table.
--
-- Notes:
--   * `id` references `auth.users(id)` so it cannot be forged by the client.
--   * `role` is constrained to `customer` at the database level; a separate
--     admin role can be added by an `ALTER TABLE … ADD VALUE` migration
--     (see the auth guide). Customers cannot change their own role.
--   * `updated_at` is maintained by the trigger defined at the bottom of
--     the file.
-- ============================================================================

create table if not exists public.customer_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  phone       text,
  role        text not null default 'customer' check (role in ('customer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists customer_profiles_email_idx
  on public.customer_profiles (lower(email));

-- ----------------------------------------------------------------------------
-- Auto-update `updated_at` on every UPDATE so the application can render the
-- last-modified time without manual bookkeeping.
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_customer_profiles_updated_at on public.customer_profiles;
create trigger set_customer_profiles_updated_at
  before update on public.customer_profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- A row is created automatically when a new auth.users record is inserted
-- so the application can always read the customer's profile.
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customer_profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Row Level Security. Customers can read and update their own profile.
-- Nobody can write privileged columns like `role` from the client.
-- ----------------------------------------------------------------------------

alter table public.customer_profiles enable row level security;

drop policy if exists "Customers can read their own profile" on public.customer_profiles;
create policy "Customers can read their own profile"
  on public.customer_profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Customers can update their own profile" on public.customer_profiles;
create policy "Customers can update their own profile"
  on public.customer_profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Customers cannot change their own role" on public.customer_profiles;
create policy "Customers cannot change their own role"
  on public.customer_profiles
  as restrictive
  for update
  to authenticated
  using (auth.uid() = id)
  with check (role = (select role from public.customer_profiles where id = auth.uid()));

-- Privileged writes (insert / delete / role mutation) are deliberately
-- only possible from the service role key, which never reaches the client.
