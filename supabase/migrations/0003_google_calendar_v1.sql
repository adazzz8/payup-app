-- PayUp Therapist — Google Calendar V1 (read-only)

create table public.google_calendar_connections (
  therapist_account_id uuid primary key references public.therapist_accounts (id) on delete cascade,
  google_email text,
  refresh_token_encrypted text not null,
  scopes text not null,
  connected_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index google_calendar_connections_connected_at_idx
  on public.google_calendar_connections (connected_at desc);

alter table public.google_calendar_connections enable row level security;

-- No policies: accessed only via Supabase service role from Railway.

create or replace function public.set_google_calendar_connections_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger google_calendar_connections_updated_at
  before update on public.google_calendar_connections
  for each row
  execute function public.set_google_calendar_connections_updated_at();
