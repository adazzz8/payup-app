-- Google Calendar: persist short-lived access token + expiry; never lose refresh tokens.

alter table public.google_calendar_connections
  add column if not exists access_token_encrypted text,
  add column if not exists access_token_expires_at timestamptz;
