-- ----------------------------------------------------------------------------
-- newsletter_subscriptions
-- ----------------------------------------------------------------------------
-- Persistent store for newsletter subscriptions. The contact path is the
-- /newsletter form (and, in the future, the footer / homepage forms). The
-- table is the source of truth — the service never pretends to subscribe
-- a customer when no row is written.
--
-- The token column is a per-subscriber random secret used to authorise
-- the unsubscribe request. We rotate the token on every status change
-- (subscribe, unsubscribe, resubscribe) so a previously-leaked link
-- cannot be reused.
--
-- The table is ownerless: newsletter is not tied to a customer account.
-- We deliberately do not store a user_id here — a customer must give
-- explicit consent, regardless of whether they have a customer account
-- or not.
--
-- Row-level security keeps the data out of the public anon key entirely;
-- only the service role can read or write. The service still validates
-- the unsubscribe token at the application layer so a leaked service
-- key is not sufficient to enumerate subscribers.

create table if not exists public.newsletter_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  email           citext not null,
  status          text not null default 'pending'
    check (status in ('pending', 'subscribed', 'unsubscribed')),
  source          text not null default 'homepage',
  -- The "confirmed" consent comes from an explicit opt-in checkbox
  -- on the newsletter form. The timestamp records the moment the
  -- customer agreed to receive the configured newsletter emails.
  consent_at      timestamptz not null default now(),
  -- Per-subscriber random secret. Authorises the unsubscribe link
  -- and is rotated on every state change.
  unsubscribe_token text not null default encode(gen_random_bytes(24), 'hex'),
  -- When the customer unsubscribed, if ever.
  unsubscribed_at timestamptz,
  -- Best-effort: the IP we recorded at submit time. Used for rate
  -- limiting on the server; the customer never sees this value.
  ip              text,
  -- Optional reference to the authenticated user at the time of
  -- consent. Stored for cross-reference with the customer's own
  -- account when one exists. Not a foreign key because the
  -- customer may have subscribed before signing up.
  user_id         uuid references auth.users(id) on delete set null,
  -- Last welcome / confirmation email outcome. Used by the admin
  -- to retry failed deliveries.
  email_status    text not null default 'pending'
    check (email_status in ('pending', 'sent', 'failed', 'skipped')),
  email_error     text,
  emailed_at      timestamptz
);

-- One row per active email. The unique index only enforces uniqueness
-- for the lowercase email so a re-submission of the same address is
-- matched deterministically regardless of the casing the customer
-- typed.
create unique index if not exists newsletter_subscriptions_email_lower_idx
  on public.newsletter_subscriptions (lower(email));

create index if not exists newsletter_subscriptions_status_idx
  on public.newsletter_subscriptions (status);

create index if not exists newsletter_subscriptions_created_at_idx
  on public.newsletter_subscriptions (created_at desc);

create index if not exists newsletter_subscriptions_token_idx
  on public.newsletter_subscriptions (unsubscribe_token);

-- Auto-update the `updated_at` column on every write.
create or replace function public.touch_newsletter_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_newsletter_subscriptions on public.newsletter_subscriptions;
create trigger touch_newsletter_subscriptions
  before update on public.newsletter_subscriptions
  for each row execute function public.touch_newsletter_subscriptions_updated_at();

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------

alter table public.newsletter_subscriptions enable row level security;

-- The anon / authenticated roles can read NOTHING. The service role
-- reads and writes through the server-side action. There is no public
-- endpoint for reading this table.

-- No SELECT / INSERT / UPDATE policy is created on purpose.

-- ----------------------------------------------------------------------------
-- citext extension
-- ----------------------------------------------------------------------------
-- citext is normally already enabled in Supabase, but include the
-- guard so the migration is self-contained.
create extension if not exists citext;
