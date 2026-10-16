-- Phone is required so a scheduled payup_intro can be sent later without another Base44 call.
-- Existing rows stay null and are not auto-sent.

alter table public.payup_intro_deliveries
  add column if not exists phone text;
