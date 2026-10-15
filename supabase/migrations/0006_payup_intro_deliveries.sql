-- payup_intro delivery state only. Other message types do not use this table.

create table public.payup_intro_deliveries (
  business_id text not null,
  customer_id text not null,
  status text not null,
  attempts integer not null default 0,
  last_error text,
  scheduled_for timestamptz,
  provider_message_id text,
  message_text text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (business_id, customer_id)
);

alter table public.payup_intro_deliveries enable row level security;
