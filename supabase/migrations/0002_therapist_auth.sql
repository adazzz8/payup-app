-- PayUp Therapist — Path B auth (Phase 1)
-- Maps Base44 user id → internal PayUp therapist account (JWT sub)

create table public.therapist_accounts (
  id uuid primary key default gen_random_uuid(),
  base44_user_id text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index therapist_accounts_base44_user_id_idx on public.therapist_accounts (base44_user_id);

alter table public.therapist_accounts enable row level security;

-- No policies: accessed only via Supabase service role from Railway.

create or replace function public.set_therapist_accounts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger therapist_accounts_updated_at
  before update on public.therapist_accounts
  for each row
  execute function public.set_therapist_accounts_updated_at();
