# Base44 auth bridge contract (Path B — Phase 1)

**Implementation kit:** `integrations/base44/` (server bridge + client `payupAuth` + `railwayFetch` + `sendCollectionReminderToRailway`).

Base44 hosts **one** stateless server function. Railway owns JWTs and all business logic.

## Bridge responsibilities (only)

1. Resolve the **current** logged-in Base44 user on the server (never trust client-supplied `base44UserId` alone).
2. Call Railway token exchange with the service API key.
3. Return `{ accessToken, expiresIn }` to the Base44 client.

## Bridge must NOT

- Store PayUp JWTs server-side between invocations
- Implement Google, calendar, Twilio, queues, or sync
- Mint or sign JWTs locally
- Put `BASE44_SERVICE_API_KEY` in the frontend bundle

## Railway exchange

```http
POST {PAYUP_RAILWAY_BASE_URL}/api/auth/exchange
Authorization: Bearer {BASE44_SERVICE_API_KEY}
Content-Type: application/json

{
  "base44UserId": "<from Base44 server session>"
}
```

**Success `200`:**

```json
{
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

## Client token storage

- **In-memory only** (`integrations/base44/client/payupAuth.ts`)
- **Never:** `localStorage` or `sessionStorage` in v1

Refresh by calling the bridge again before expiry or on `401`.

## Protected Railway APIs

```http
Authorization: Bearer {accessToken}
```

Identity is **only** JWT `sub` (internal `therapist_accounts.id` UUID).

Do not use `x-user-id` for authorization.

## Example: collection reminder

```http
POST {PAYUP_RAILWAY_BASE_URL}/api/send-collection-reminder
Authorization: Bearer {accessToken}
Content-Type: application/json

{ "debtId": "...", "payload": { ... } }
```

Without `Authorization`, response is `401` with `code: "TOKEN_MISSING"`.
