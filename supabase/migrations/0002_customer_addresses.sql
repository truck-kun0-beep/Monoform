-- ============================================================================
-- 0002_customer_addresses.sql
--
-- Creates the `customer_addresses` table that backs the saved-address
-- manager in the customer account area. Every read / write is scoped
-- to the authenticated customer through Row Level Security so the
-- browser (using the anon key) can never read or modify another
-- customer's addresses, even by supplying a forged id.
--
-- How to apply:
--   1. Open the Supabase dashboard, then `SQL Editor`.
--   2. Paste the contents of this file and run.
--   3. Verify the policies under `Authentication → Policies` for the
--      `customer_addresses` table.
--
-- Notes:
--   * `id` is a generated UUID so the browser cannot guess a neighbour's
--     primary key.
--   * `user_id` references `auth.users(id)` and is enforced by both a
--     foreign key and a RLS policy. The client never provides a
--     `user_id` — the application derives it from the session.
--   * `delivery_zone` is an explicit enum-like column. Storing a
--     machine value rather than parsing the address string stops the
--     "any address mentioning Dhaka" → ৳70 mistake noted in the
--     prompt.
--   * The partial unique index `customer_addresses_one_default_per_user`
--     enforces the invariant "at most one default address per
--     customer" at the database level.
--   * `updated_at` is maintained by the same trigger that updates
--     `customer_profiles`.
-- ============================================================================

create table if not exists public.customer_addresses (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  recipient_name           text not null check (char_length(recipient_name) between 1 and 80),
  phone                    text not null check (char_length(phone) between 6 and 32),
  district                 text not null check (char_length(district) between 1 and 80),
  locality                 text check (locality is null or char_length(locality) <= 80),
  address_line             text not null check (char_length(address_line) between 1 and 240),
  additional_details       text check (additional_details is null or char_length(additional_details) <= 240),
  postal_code              text check (postal_code is null or char_length(postal_code) <= 16),
  delivery_zone            text not null check (delivery_zone in ('inside_dhaka', 'outside_dhaka')),
  delivery_instructions    text check (delivery_instructions is null or char_length(delivery_instructions) <= 500),
  is_default               boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists customer_addresses_user_idx
  on public.customer_addresses (user_id, updated_at desc);

create index if not exists customer_addresses_default_idx
  on public.customer_addresses (user_id)
  where is_default;

-- A customer can only have one default address at a time. The partial
-- unique index makes this a database-level invariant, not just a
-- application-level one.
create unique index if not exists customer_addresses_one_default_per_user
  on public.customer_addresses (user_id)
  where is_default;

-- ----------------------------------------------------------------------------
-- Reuse the existing `set_updated_at` trigger function from the
-- customer_profiles migration.
-- ----------------------------------------------------------------------------

drop trigger if exists set_customer_addresses_updated_at on public.customer_addresses;
create trigger set_customer_addresses_updated_at
  before update on public.customer_addresses
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security. Customers can read / insert / update / delete only
-- their own addresses. The `user_id` column cannot be set by the client
-- because the corresponding policies assert `auth.uid() = user_id` on
-- insert and the application's server code derives the value from the
-- session before writing.
-- ----------------------------------------------------------------------------

alter table public.customer_addresses enable row level security;

drop policy if exists "Customers can read their own addresses" on public.customer_addresses;
create policy "Customers can read their own addresses"
  on public.customer_addresses
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Customers can insert their own addresses" on public.customer_addresses;
create policy "Customers can insert their own addresses"
  on public.customer_addresses
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Customers can update their own addresses" on public.customer_addresses;
create policy "Customers can update their own addresses"
  on public.customer_addresses
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Customers can delete their own addresses" on public.customer_addresses;
create policy "Customers can delete their own addresses"
  on public.customer_addresses
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Customers must not be able to reassign the `user_id` of an existing row.
-- The previous policy already enforces the row-level owner check on update;
-- this restrictive policy additionally guarantees the `user_id` does
-- not change. Without it, a forged UPDATE could move an address to a
-- different customer's account and pass the `auth.uid() = user_id` check
-- after the move.
-- ----------------------------------------------------------------------------

drop policy if exists "Customers cannot reassign address ownership" on public.customer_addresses;
create policy "Customers cannot reassign address ownership"
  on public.customer_addresses
  as restrictive
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Privileged operations (cross-customer writes, schema changes) are
-- intentionally limited to the service role, which is never exposed to
-- the browser.
