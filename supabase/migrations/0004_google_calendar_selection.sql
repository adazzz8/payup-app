-- Google Calendar V1.1: one explicitly selected calendar per therapist.
-- Existing connections safely default to Google Calendar's primary calendar.

alter table public.google_calendar_connections
  add column if not exists selected_calendar_id text not null default 'primary',
  add column if not exists selected_calendar_summary text;

