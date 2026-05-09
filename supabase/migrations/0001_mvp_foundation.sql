-- PayUp MVP foundation schema
-- Hebrew-first debt workflow app with owner-based tenancy

create extension if not exists "pgcrypto";

-- =========
-- Enums
-- =========
create type public.debt_status as enum ('draft', 'ready_to_send', 'sent', 'waiting_payment', 'customer_said_today', 'customer_said_week', 'customer_claimed_paid', 'paid_confirmed', 'overdue', 'cancelled', 'needs_receipt', 'receipt_sent');
create type public.message_channel as enum ('whatsapp', 'sms', 'email', 'manual');
create type public.message_status as enum ('queued', 'sent', 'delivered', 'read', 'failed', 'cancelled');
create type public.receipt_status as enum ('pending_upload', 'uploaded', 'sent', 'not_required');
create type public.receipt_source as enum ('upload', 'whatsapp', 'manual');

-- =========
-- Profile / users table (maps auth.users)
-- =========
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  timezone text not null default 'Asia/Jerusalem',
  default_currency text not null default 'ILS',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- =========
-- Core entities
-- =========
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  public_slug text unique not null,
  qr_token text unique not null,
  business_name text not null,
  description text,
  logo_url text,
  cover_image_url text,
  theme_primary_color text not null default '#7ecbff',
  theme_secondary_color text not null default '#ff9ccc',
  public_enabled boolean not null default true,
  qr_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  display_name text not null,
  phone text,
  notes text,
  last_contacted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  default_price numeric(12,2),
  currency text not null default 'ILS',
  is_active boolean not null default true,
  usage_count integer not null default 0,
  last_used_at timestamptz,
  image_url text,
  category text,
  display_order integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint products_owner_name_unique unique (owner_id, name)
);

create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  slug_snapshot text,
  source text not null default 'qr',
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.checkout_submissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  checkout_session_id uuid references public.checkout_sessions(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name_snapshot text not null,
  customer_phone_snapshot text,
  total_amount numeric(12,2),
  status text not null default 'submitted',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.checkout_submission_items (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.checkout_submissions(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  quantity integer not null default 1,
  unit_price numeric(12,2),
  line_total numeric(12,2),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  checkout_submission_id uuid references public.checkout_submissions(id) on delete set null,
  source text not null default 'manual' check (source in ('manual', 'quick_add', 'self_checkout')),
  description text not null,
  currency text not null default 'ILS',
  original_amount numeric(12,2) not null check (original_amount >= 0),
  outstanding_amount numeric(12,2) not null check (outstanding_amount >= 0),
  status public.debt_status not null default 'draft',
  is_quick_add boolean not null default false,
  send_after_review boolean not null default true,
  due_date date,
  paid_at timestamptz,
  customer_claimed_payment_method text,
  customer_claimed_paid_at timestamptz,
  owner_confirmed_paid_at timestamptz,
  receipt_required boolean not null default false,
  invoice_required boolean not null default false,
  invoice_uploaded_at timestamptz,
  invoice_file_url text,
  reminder_count integer not null default 0,
  message_count integer not null default 0,
  last_message_at timestamptz,
  quick_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- IMPORTANT: Customer payment acknowledgment should set debt status to 'customer_claimed_paid'.
-- Only owner action should transition status to 'paid_confirmed'.

-- Outbound/inbound communication log (ready for WhatsApp automation)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  channel public.message_channel not null default 'whatsapp',
  direction text not null check (direction in ('outbound', 'inbound')),
  provider_message_id text,
  template_key text,
  body text,
  status public.message_status not null default 'queued',
  scheduled_for timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'ILS',
  source public.receipt_source not null default 'upload',
  status public.receipt_status not null default 'pending_upload',
  file_url text,
  note text,
  paid_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- =========
-- Helpful indexes
-- =========
create index businesses_owner_id_idx on public.businesses (owner_id);
create unique index businesses_public_slug_idx on public.businesses (public_slug);
create unique index businesses_qr_token_idx on public.businesses (qr_token);

create index customers_owner_created_idx on public.customers (owner_id, created_at desc);
create index customers_owner_phone_idx on public.customers (owner_id, phone);

create index products_owner_active_updated_idx on public.products (owner_id, is_active, updated_at desc);
create index products_owner_last_used_idx on public.products (owner_id, last_used_at desc nulls last);
create index products_business_public_order_idx on public.products (business_id, is_public, display_order);

create index checkout_sessions_business_id_idx on public.checkout_sessions (business_id);
create index checkout_submissions_business_id_idx on public.checkout_submissions (business_id);
create index checkout_submissions_customer_id_idx on public.checkout_submissions (customer_id);
create index checkout_submission_items_submission_id_idx on public.checkout_submission_items (submission_id);

create index debts_owner_status_updated_idx on public.debts (owner_id, status, updated_at desc);
create index debts_owner_customer_idx on public.debts (owner_id, customer_id, created_at desc);
create index debts_owner_due_date_idx on public.debts (owner_id, due_date);
create index debts_owner_last_message_idx on public.debts (owner_id, last_message_at desc nulls last);
create index debts_business_id_idx on public.debts (business_id);
create index debts_checkout_submission_id_idx on public.debts (checkout_submission_id);

create index messages_owner_debt_created_idx on public.messages (owner_id, debt_id, created_at desc);
create index messages_owner_status_sched_idx on public.messages (owner_id, status, scheduled_for);
create index messages_provider_message_id_idx on public.messages (provider_message_id);

create index receipts_owner_status_created_idx on public.receipts (owner_id, status, created_at desc);
create index receipts_owner_debt_idx on public.receipts (owner_id, debt_id, created_at desc);

-- =========
-- Updated at trigger
-- =========
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger users_set_updated_at before update on public.users
for each row execute procedure public.set_updated_at();

create trigger businesses_set_updated_at before update on public.businesses
for each row execute procedure public.set_updated_at();

create trigger customers_set_updated_at before update on public.customers
for each row execute procedure public.set_updated_at();

create trigger products_set_updated_at before update on public.products
for each row execute procedure public.set_updated_at();

create trigger debts_set_updated_at before update on public.debts
for each row execute procedure public.set_updated_at();

create trigger messages_set_updated_at before update on public.messages
for each row execute procedure public.set_updated_at();

create trigger receipts_set_updated_at before update on public.receipts
for each row execute procedure public.set_updated_at();

-- =========
-- Owner guardrails
-- =========
create or replace function public.enforce_owner_consistency()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'products' then
    if exists (
      select 1
      from public.businesses b
      where b.id = new.business_id
        and b.owner_id <> new.owner_id
    ) then
      raise exception 'Product owner_id must match business owner_id';
    end if;
  end if;

  if tg_table_name = 'debts' then
    if exists (
      select 1
      from public.customers c
      where c.id = new.customer_id
        and c.owner_id <> new.owner_id
    ) then
      raise exception 'Debt owner_id must match customer owner_id';
    end if;

    if new.product_id is not null and exists (
      select 1
      from public.products p
      where p.id = new.product_id
        and p.owner_id <> new.owner_id
    ) then
      raise exception 'Debt owner_id must match product owner_id';
    end if;

    if new.business_id is not null and exists (
      select 1
      from public.businesses b
      where b.id = new.business_id
        and b.owner_id <> new.owner_id
    ) then
      raise exception 'Debt owner_id must match business owner_id';
    end if;

    if new.checkout_submission_id is not null and exists (
      select 1
      from public.checkout_submissions cs
      join public.businesses b on b.id = cs.business_id
      where cs.id = new.checkout_submission_id
        and b.owner_id <> new.owner_id
    ) then
      raise exception 'Debt owner_id must match checkout submission business owner_id';
    end if;
  end if;

  if tg_table_name = 'messages' then
    if exists (
      select 1
      from public.debts d
      where d.id = new.debt_id
        and d.owner_id <> new.owner_id
    ) then
      raise exception 'Message owner_id must match debt owner_id';
    end if;
  end if;

  if tg_table_name = 'receipts' then
    if exists (
      select 1
      from public.debts d
      where d.id = new.debt_id
        and d.owner_id <> new.owner_id
    ) then
      raise exception 'Receipt owner_id must match debt owner_id';
    end if;
  end if;

  return new;
end;
$$;

create trigger products_owner_consistency before insert or update on public.products
for each row execute procedure public.enforce_owner_consistency();

create trigger debts_owner_consistency before insert or update on public.debts
for each row execute procedure public.enforce_owner_consistency();

create trigger messages_owner_consistency before insert or update on public.messages
for each row execute procedure public.enforce_owner_consistency();

create trigger receipts_owner_consistency before insert or update on public.receipts
for each row execute procedure public.enforce_owner_consistency();

-- =========
-- Optional profile bootstrap on signup
-- =========
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- =========
-- RLS
-- =========
alter table public.users enable row level security;
alter table public.businesses enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.checkout_submissions enable row level security;
alter table public.checkout_submission_items enable row level security;
alter table public.debts enable row level security;
alter table public.messages enable row level security;
alter table public.receipts enable row level security;

-- Users
create policy "users_select_own" on public.users
for select using (auth.uid() = id);

create policy "users_update_own" on public.users
for update using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users_insert_own" on public.users
for insert with check (auth.uid() = id);

-- Businesses
create policy "businesses_owner_all" on public.businesses
for all using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "businesses_public_read_enabled" on public.businesses
for select using (public_enabled = true);

-- Customers
create policy "customers_owner_all" on public.customers
for all using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

-- Products
create policy "products_owner_all" on public.products
for all using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "products_public_read_storefront" on public.products
for select using (
  is_public = true
  and exists (
    select 1
    from public.businesses b
    where b.id = products.business_id
      and b.public_enabled = true
  )
);

-- Checkout sessions
create policy "checkout_sessions_owner_read" on public.checkout_sessions
for select using (
  exists (
    select 1
    from public.businesses b
    where b.id = checkout_sessions.business_id
      and b.owner_id = auth.uid()
  )
);

create policy "checkout_sessions_public_insert_enabled_business" on public.checkout_sessions
for insert with check (
  exists (
    select 1
    from public.businesses b
    where b.id = checkout_sessions.business_id
      and b.public_enabled = true
  )
);

-- Checkout submissions
create policy "checkout_submissions_owner_read" on public.checkout_submissions
for select using (
  exists (
    select 1
    from public.businesses b
    where b.id = checkout_submissions.business_id
      and b.owner_id = auth.uid()
  )
);

create policy "checkout_submissions_public_insert_enabled_business" on public.checkout_submissions
for insert with check (
  exists (
    select 1
    from public.businesses b
    where b.id = checkout_submissions.business_id
      and b.public_enabled = true
  )
);

-- Checkout submission items
create policy "checkout_submission_items_owner_read" on public.checkout_submission_items
for select using (
  exists (
    select 1
    from public.checkout_submissions cs
    join public.businesses b on b.id = cs.business_id
    where cs.id = checkout_submission_items.submission_id
      and b.owner_id = auth.uid()
  )
);

create policy "checkout_submission_items_public_insert_valid_submission" on public.checkout_submission_items
for insert with check (
  exists (
    select 1
    from public.checkout_submissions cs
    join public.businesses b on b.id = cs.business_id
    where cs.id = checkout_submission_items.submission_id
      and b.public_enabled = true
  )
);

-- Debts
create policy "debts_owner_all" on public.debts
for all using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

-- Messages
create policy "messages_owner_all" on public.messages
for all using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

-- Receipts
create policy "receipts_owner_all" on public.receipts
for all using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
