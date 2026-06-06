# Base44 therapist — PayUp auth bridge (Phase 1)

Copy `integrations/base44/` into your **therapist** Base44 project.

## Server (one function)

1. Copy `server/getPayUpAccessToken.ts`, `server/config.ts`.
2. Implement `server/resolveCurrentBase44UserId.ts` with your Base44 server session API.
3. Register server function name: **`getPayUpAccessToken`** (no parameters from client).

## Client

1. Copy `client/` modules.
2. At app startup: `configurePayUpBridgeInvoker(() => invoke("getPayUpAccessToken", {}))`.
3. Replace **only** the existing `send-collection-reminder` `fetch` with `sendCollectionReminderToRailway()`.

## Token storage

Memory only. No `sessionStorage`. No `localStorage`.

## Deploy order

1. Implement + test bridge against Railway **with** Phase 1 auth env (or staging).
2. Verify SMS flow in Base44.
3. Then deploy therapist Railway Phase 1 auth (if not already).

See `integrations/base44-auth-bridge.contract.md` for Railway API details.
