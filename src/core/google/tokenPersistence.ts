/**
 * Pure helpers for Google OAuth token persistence / refresh decisions.
 * Kept free of I/O so unit tests can verify overwrite and expiry behavior.
 */

/** Treat null/undefined/whitespace as "Google did not return a refresh token". */
export function normalizeIncomingRefreshToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Never overwrite a stored refresh token with missing/empty Google response.
 * Prefer a newly returned non-empty refresh token when present.
 */
export function resolveRefreshTokenToPersist(
  incomingRefreshToken: unknown,
  existingRefreshToken: string | null | undefined,
): string | null {
  const incoming = normalizeIncomingRefreshToken(incomingRefreshToken);
  if (incoming) {
    return incoming;
  }
  const existing = normalizeIncomingRefreshToken(existingRefreshToken);
  return existing;
}

/** expiresAt = now + expires_in seconds (Google token response field). */
export function computeAccessTokenExpiresAt(
  expiresInSeconds: unknown,
  nowMs: number = Date.now(),
): Date | null {
  if (typeof expiresInSeconds !== "number" || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    return null;
  }
  return new Date(nowMs + Math.trunc(expiresInSeconds) * 1000);
}

/**
 * Refresh when missing expiry/token, or within skewMs of expiry.
 * Default skew 60s avoids using a token that is about to expire mid-request.
 */
export function shouldRefreshAccessToken(
  accessToken: string | null | undefined,
  expiresAtIso: string | null | undefined,
  nowMs: number = Date.now(),
  skewMs: number = 60_000,
): boolean {
  const token = typeof accessToken === "string" ? accessToken.trim() : "";
  if (!token) {
    return true;
  }
  if (!expiresAtIso || typeof expiresAtIso !== "string") {
    return true;
  }
  const expiresAtMs = Date.parse(expiresAtIso);
  if (!Number.isFinite(expiresAtMs)) {
    return true;
  }
  return expiresAtMs <= nowMs + skewMs;
}

export function isGoogleAuthRevokedError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid_grant") ||
    lower.includes("token has been expired or revoked") ||
    lower.includes("token has been revoked") ||
    lower.includes("account has been deleted")
  );
}

/** Transient failures must NOT clear a stored Google connection. */
export function isTransientGoogleTokenError(message: string): boolean {
  if (isGoogleAuthRevokedError(message)) {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes("network") ||
    lower.includes("timeout") ||
    lower.includes("econnreset") ||
    lower.includes("fetch failed") ||
    lower.includes("503") ||
    lower.includes("502") ||
    lower.includes("500") ||
    lower.includes("429") ||
    lower.includes("temporarily unavailable")
  );
}
