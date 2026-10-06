/**
 * Unit tests for Google Calendar token persistence helpers — no network / no Twilio.
 * Run: npx tsx scripts/test-google-token-refresh.ts
 */

import {
  computeAccessTokenExpiresAt,
  isGoogleAuthRevokedError,
  isTransientGoogleTokenError,
  resolveRefreshTokenToPersist,
  shouldRefreshAccessToken,
} from "../src/core/google/tokenPersistence";

let failures = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`PASS: ${message}`);
  }
}

// A. Existing refresh token + Google response without refresh token
{
  const preserved = resolveRefreshTokenToPersist(undefined, "existing-refresh");
  assert(preserved === "existing-refresh", "A: existing refresh token preserved when Google omits it");

  const preservedNull = resolveRefreshTokenToPersist(null, "existing-refresh");
  assert(preservedNull === "existing-refresh", "A: null incoming does not overwrite");

  const preservedEmpty = resolveRefreshTokenToPersist("   ", "existing-refresh");
  assert(preservedEmpty === "existing-refresh", "A: empty/whitespace incoming does not overwrite");
}

// B. Google returns new refresh token
{
  const rotated = resolveRefreshTokenToPersist("new-refresh", "existing-refresh");
  assert(rotated === "new-refresh", "B: new refresh token saved when Google returns one");
}

// C. Expired access token + valid refresh token → should refresh
{
  const expired = shouldRefreshAccessToken(
    "access-token",
    new Date(Date.now() - 60_000).toISOString(),
    Date.now(),
  );
  assert(expired === true, "C: expired access token requires refresh");

  const fresh = shouldRefreshAccessToken(
    "access-token",
    new Date(Date.now() + 3600_000).toISOString(),
    Date.now(),
  );
  assert(fresh === false, "C: valid non-expired access token does not refresh yet");

  const expiresAt = computeAccessTokenExpiresAt(3600, 1_000_000);
  assert(
    expiresAt !== null && expiresAt.getTime() === 1_000_000 + 3600 * 1000,
    "C: expires_at computed from expires_in",
  );
}

// D. Temporary Google/API error → connection NOT marked disconnected
{
  assert(isTransientGoogleTokenError("fetch failed") === true, "D: network/fetch is transient");
  assert(isTransientGoogleTokenError("Google 503 temporarily unavailable") === true, "D: 503 is transient");
  assert(isGoogleAuthRevokedError("fetch failed") === false, "D: transient is not revoked");
}

// E. invalid_grant / revoked access → reconnect required
{
  assert(isGoogleAuthRevokedError("invalid_grant") === true, "E: invalid_grant is revoked");
  assert(
    isGoogleAuthRevokedError("Token has been expired or revoked.") === true,
    "E: revoked wording detected",
  );
  assert(isTransientGoogleTokenError("invalid_grant") === false, "E: revoked is not transient");
}

console.log("\n--- summary ---");
console.log(JSON.stringify({ failures, result: failures === 0 ? "PASS" : "FAIL" }, null, 2));
process.exit(failures === 0 ? 0 : 1);
