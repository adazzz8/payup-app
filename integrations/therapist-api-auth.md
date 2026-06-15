# PayUp Therapist API auth (Phase 1)

## JWT v1 payload

Signed with `PAYUP_JWT_SECRET` (HS256). Claims only:

| Claim | Description |
|-------|-------------|
| `sub` | `therapist_accounts.id` (UUID) |
| `iss` | `PAYUP_JWT_ISSUER` (default `payup-therapists`) |
| `aud` | `PAYUP_JWT_AUDIENCE` (default `payup-therapists-api`) |
| `iat` | Issued at (unix seconds) |
| `exp` | Expiry (unix seconds) |

No `businessId` or other custom claims in v1.

## Endpoints (Phase 1)

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/auth/exchange` | `BASE44_SERVICE_API_KEY` (Bearer) |
| `POST` | `/api/send-collection-reminder` | PayUp access JWT (Bearer) |
| `OPTIONS` | `/api/send-collection-reminder` | CORS preflight |

## Environment variables (Railway therapist service)

| Variable | Required |
|----------|----------|
| `BASE44_SERVICE_API_KEY` | Yes |
| `PAYUP_JWT_SECRET` | Yes |
| `PAYUP_JWT_ISSUER` | Recommended |
| `PAYUP_JWT_AUDIENCE` | Recommended |
| `PAYUP_ACCESS_TOKEN_TTL_SECONDS` | Recommended (default 900) |
| `ALLOWED_CORS_ORIGINS` | Yes (comma-separated therapist app origins) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for `therapist_accounts`) |
| Twilio vars | Yes (for SMS) |

## Database

Apply `supabase/migrations/0002_therapist_auth.sql` before using exchange in production.

## Not in Phase 1

- Base44 frontend implementation

## Google Calendar V1 (read-only)

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/google/connect` | PayUp access JWT (Bearer) |
| `GET` | `/api/google/callback` | Public (signed OAuth `state`) |
| `POST` | `/api/calendar/today` | PayUp access JWT (Bearer) |

Apply `supabase/migrations/0003_google_calendar_v1.sql` before using Google Calendar in production.
