import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const STATE_TTL_SECONDS = 600;

type OAuthStatePayload = {
  sub: string;
  exp: number;
  nonce: string;
  returnTo: GoogleOAuthReturnTo;
};

export type GoogleOAuthReturnTo = "dashboard" | "onboarding";

export type VerifiedOAuthState = {
  therapistAccountId: string;
  returnTo: GoogleOAuthReturnTo;
};

function getStateSigningSecret(): string {
  const secret = process.env.PAYUP_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("PAYUP_JWT_SECRET is not configured.");
  }
  return secret;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", getStateSigningSecret()).update(encodedPayload, "utf8").digest("base64url");
}

export function createOAuthState(
  therapistAccountId: string,
  returnTo: GoogleOAuthReturnTo = "dashboard",
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: OAuthStatePayload = {
    sub: therapistAccountId,
    exp: now + STATE_TTL_SECONDS,
    nonce: randomBytes(16).toString("hex"),
    returnTo,
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${signPayload(encoded)}`;
}

export function verifyOAuthState(state: string): VerifiedOAuthState {
  const parts = state.split(".");
  if (parts.length !== 2) {
    throw new Error("Invalid OAuth state.");
  }

  const [encoded, signature] = parts;
  if (!encoded || !signature) {
    throw new Error("Invalid OAuth state.");
  }

  const expected = signPayload(encoded);
  const actualBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
    throw new Error("Invalid OAuth state signature.");
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(base64UrlDecode(encoded).toString("utf8")) as OAuthStatePayload;
  } catch {
    throw new Error("Invalid OAuth state payload.");
  }

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Invalid OAuth state subject.");
  }
  if (payload.returnTo !== "dashboard" && payload.returnTo !== "onboarding") {
    throw new Error("Invalid OAuth state return destination.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) {
    throw new Error("OAuth state expired.");
  }

  return { therapistAccountId: payload.sub, returnTo: payload.returnTo };
}
