export const DEFAULT_PAYUP_JWT_ISSUER = "payup-therapists";
export const DEFAULT_PAYUP_JWT_AUDIENCE = "payup-therapists-api";
export const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 900;

export function getJwtIssuer(): string {
  return process.env.PAYUP_JWT_ISSUER?.trim() || DEFAULT_PAYUP_JWT_ISSUER;
}

export function getJwtAudience(): string {
  return process.env.PAYUP_JWT_AUDIENCE?.trim() || DEFAULT_PAYUP_JWT_AUDIENCE;
}

export function getAccessTokenTtlSeconds(): number {
  const raw = process.env.PAYUP_ACCESS_TOKEN_TTL_SECONDS?.trim();
  if (!raw) return DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
}
