-- ----------------------------------------------------------------------------
-- support_messages
-- ----------------------------------------------------------------------------
-- Persists contact-form submissions so the support team can pick them
-- up from the dashboard, retry email delivery and reply to customers.
-- The form is the only writer — the admin tools can read through the
-- service-role client. Row-level security allows the customer to read
-- their own message so the support area can render a per-customer
-- history without an extra API.

create table if not exists public.support_messages (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  name          text not null,
  email         text not null,
  phone         text,
  topic         text not null,
  order_number  text,
  message       text not null,
  ip            text,
  -- The authenticated user (when the visitor is signed in). The form
  -- works for unauthenticated visitors too, in which case this is
  -- null. The owner is only ever set by the server, never from the
  -- browser.
  user_id       uuid references auth.users(id) on delete set null,
  status        text not null default 'received'
    check (status in ('received', 'in_progress', 'resolved', 'spam')),
  -- Email-delivery state for the outbound notification.
  email_status  text not null default 'pending'
    check (email_status in ('pending', 'sent', 'failed', 'skipped')),
  email_error   text,
  emailed_at    timestamptz
);

create index if not exists support_messages_created_at_idx
  on public.support_messages (created_at desc);

create index if not exists support_messages_user_id_idx
  on public.support_messages (user_id);

create index if not exists support_messages_email_status_idx
  on public.support_messages (email_status);

-- Auto-update the `updated_at` column on every write so the admin
-- view can show the latest activity.
create or replace function public.touch_support_messages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_support_messages on public.support_messages;
create trigger touch_support_messages
  before update on public.support_messages
  for each row execute function public.touch_support_messages_updated_at();

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------

alter table public.support_messages enable row level security;

-- The customer can read their own message. RLS is the source of
-- truth — the server-side `submitSupportMessage` function is the
-- only writer, but the customer UI can render a confirmation
-- history if it ever needs to.
drop policy if exists "Customers can read their own support messages"
  on public.support_messages;
create policy "Customers can read their own support messages"
  on public.support_messages
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Inserts are blocked for the anon / authenticated roles. The
-- contact form goes through the server-side `submitSupportMessage`
-- service which uses the service-role key. The trigger is
-- retained so a future authenticated API can re-enable inserts
-- with a policy like `with check (auth.uid() = user_id)`.
-- No INSERT / UPDATE policy is created on purpose.

-- Service role can read and write — the admin dashboard uses the
-- service-role client to list / mark messages.
