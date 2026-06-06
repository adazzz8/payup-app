import { createHmac, timingSafeEqual } from "crypto";
import { getAccessTokenTtlSeconds, getJwtAudience, getJwtIssuer } from "@/core/auth/constants";
import type { PayUpAccessTokenClaims } from "@/core/auth/types";

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

function getJwtSecret(): string {
  const secret = process.env.PAYUP_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("PAYUP_JWT_SECRET is not configured.");
  }
  return secret;
}

function signHs256(signingInput: string, secret: string): string {
  return createHmac("sha256", secret).update(signingInput, "utf8").digest("base64url");
}

export function mintAccessToken(sub: string): { token: string; expiresIn: number } {
  const ttl = getAccessTokenTtlSeconds();
  const now = Math.floor(Date.now() / 1000);
  const payload: PayUpAccessTokenClaims = {
    sub,
    iss: getJwtIssuer(),
    aud: getJwtAudience(),
    iat: now,
    exp: now + ttl,
  };

  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const signature = signHs256(signingInput, getJwtSecret());

  return { token: `${signingInput}.${signature}`, expiresIn: ttl };
}

export function verifyAccessToken(token: string): PayUpAccessTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerPart, payloadPart, signaturePart] = parts;
  if (!headerPart || !payloadPart || !signaturePart) return null;

  let header: { alg?: string };
  try {
    header = JSON.parse(base64UrlDecode(headerPart).toString("utf8")) as { alg?: string };
  } catch {
    return null;
  }

  if (header.alg !== "HS256") return null;

  const signingInput = `${headerPart}.${payloadPart}`;
  const expected = signHs256(signingInput, getJwtSecret());
  const actualBuf = Buffer.from(signaturePart, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
    return null;
  }

  let claims: PayUpAccessTokenClaims;
  try {
    claims = JSON.parse(base64UrlDecode(payloadPart).toString("utf8")) as PayUpAccessTokenClaims;
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== getJwtIssuer()) return null;
  if (claims.aud !== getJwtAudience()) return null;
  if (typeof claims.sub !== "string" || claims.sub.length === 0) return null;
  if (typeof claims.exp !== "number" || claims.exp <= now) return null;
  if (typeof claims.iat !== "number") return null;

  return claims;
}
