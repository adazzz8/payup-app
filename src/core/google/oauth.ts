import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import {
  getGoogleClientId,
  getGoogleClientSecret,
  getGoogleOAuthRedirectUri,
  GOOGLE_CALENDAR_READONLY_SCOPE,
  getGoogleAuthBaseUrl,
  getGoogleTokenUrl,
} from "@/core/google/config";
import { createOAuthState, type GoogleOAuthReturnTo } from "@/core/google/state";

export type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

function getTokenEncryptionKey(): Buffer {
  const secret =
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim() || process.env.PAYUP_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("PAYUP_JWT_SECRET or GOOGLE_TOKEN_ENCRYPTION_KEY is required for token encryption.");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptRefreshToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getTokenEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptRefreshToken(ciphertext: string): string {
  const parts = ciphertext.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted refresh token.");
  }

  const [ivPart, tagPart, dataPart] = parts;
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Invalid encrypted refresh token.");
  }

  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  const data = Buffer.from(dataPart, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", getTokenEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

export function buildGoogleOAuthUrl(
  therapistAccountId: string,
  returnTo: GoogleOAuthReturnTo = "dashboard",
): string {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: getGoogleOAuthRedirectUri(),
    response_type: "code",
    scope: GOOGLE_CALENDAR_READONLY_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: createOAuthState(therapistAccountId, returnTo),
  });

  return `${getGoogleAuthBaseUrl()}?${params.toString()}`;
}

export async function revokeGoogleRefreshToken(refreshToken: string): Promise<void> {
  const response = await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: refreshToken }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Google token revocation failed (${response.status})`);
  }
}

export async function exchangeAuthorizationCode(code: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    redirect_uri: getGoogleOAuthRedirectUri(),
    grant_type: "authorization_code",
  });

  const response = await fetch(getGoogleTokenUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const json = (await response.json()) as GoogleTokenResponse & { error?: string; error_description?: string };
  if (!response.ok) {
    const message = json.error_description || json.error || `Google token exchange failed (${response.status})`;
    throw new Error(message);
  }

  if (!json.access_token) {
    throw new Error("Google token exchange returned no access token.");
  }

  return json;
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(getGoogleTokenUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const json = (await response.json()) as GoogleTokenResponse & { error?: string; error_description?: string };
  if (!response.ok) {
    const message = json.error_description || json.error || `Google token refresh failed (${response.status})`;
    throw new Error(message);
  }

  if (!json.access_token) {
    throw new Error("Google token refresh returned no access token.");
  }

  return json;
}

async function fetchGoogleUserEmail(accessToken: string): Promise<string | null> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as { email?: string };
  return typeof json.email === "string" ? json.email : null;
}

export async function completeGoogleOAuth(
  code: string,
  existingRefreshToken?: string | null,
): Promise<{
  refreshToken: string;
  googleEmail: string | null;
  scopes: string;
}> {
  const tokens = await exchangeAuthorizationCode(code);
  const googleEmail = await fetchGoogleUserEmail(tokens.access_token);
  const refreshToken = tokens.refresh_token ?? existingRefreshToken ?? null;

  if (!refreshToken) {
    throw new Error("Google did not return a refresh token.");
  }

  return {
    refreshToken,
    googleEmail,
    scopes: tokens.scope ?? GOOGLE_CALENDAR_READONLY_SCOPE,
  };
}

export function isGoogleAuthRevokedError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("invalid_grant") || lower.includes("token has been expired or revoked");
}
