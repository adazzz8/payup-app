# Base44 manual tests (before therapist Railway auth deploy)

## Prerequisites

- `resolveCurrentBase44UserId` wired to Base44 server session
- Base44 server env: `PAYUP_RAILWAY_BASE_URL`, `BASE44_SERVICE_API_KEY`
- Railway therapist has Phase 1 auth env + migration applied (for full E2E)
- `configurePayUpBridgeInvoker` called at app startup

## 1. Bridge — logged in

1. Log into therapist Base44 app.
2. Trigger bridge only (debug button or console):

```javascript
// Example after configurePayUpBridgeInvoker is wired
await invoke("getPayUpAccessToken", {});
```

**Pass:** Returns `accessToken`, `expiresIn`. No `base44UserId` in request from browser.

## 2. Bridge — rejects client user id

```javascript
await invoke("getPayUpAccessToken", { base44UserId: "fake-id" });
```

**Pass:** Error `CLIENT_USER_ID_FORBIDDEN` (or bridge error), no token returned.

## 3. Bridge — logged out

Log out of Base44, call bridge.

**Pass:** `NOT_AUTHENTICATED`, no Railway exchange.

## 4. SMS flow (QuickCharge / send reminder)

1. Log in.
2. Run existing flow that sends collection SMS.
3. Confirm SMS still sends (or reaches Railway with non-401 when auth enabled).

**Pass:** No `401 TOKEN_MISSING` from Railway; same UX as before auth.

## 5. Memory-only token

1. Obtain token via bridge.
2. Send reminder successfully.
3. Send second reminder without calling bridge again (within TTL).

**Pass:** Second call succeeds without extra bridge invocation (check network tab).

## 6. 401 retry (optional)

Use expired token or wait past TTL, then send reminder.

**Pass:** One bridge refresh + one retry; then success or clear auth error.

## 7. No secrets in frontend bundle

Search built PWA / sources for `BASE44_SERVICE_API_KEY`.

**Pass:** Not present in client bundle.
