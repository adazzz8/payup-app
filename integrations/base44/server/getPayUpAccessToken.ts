import { getBase44ServiceApiKey, getPayUpRailwayBaseUrl } from "./config";
import { resolveCurrentBase44UserId } from "./resolveCurrentBase44UserId";

export type PayUpTokenResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
};

export type PayUpBridgeErrorCode =
  | "NOT_AUTHENTICATED"
  | "CLIENT_USER_ID_FORBIDDEN"
  | "EXCHANGE_UNAUTHORIZED"
  | "EXCHANGE_FAILED"
  | "PAYUP_UNAVAILABLE";

export class PayUpBridgeError extends Error {
  constructor(
    message: string,
    readonly code: PayUpBridgeErrorCode,
  ) {
    super(message);
    this.name = "PayUpBridgeError";
  }
}

/** Client may send empty object or omit body. Any other shape is rejected if it includes base44UserId. */
export type GetPayUpAccessTokenClientInput = Record<string, never>;

function assertNoClientUserId(clientInput: unknown): void {
  if (clientInput === undefined || clientInput === null) return;
  if (typeof clientInput !== "object") return;
  if ("base44UserId" in (clientInput as Record<string, unknown>)) {
    throw new PayUpBridgeError("base44UserId must not be sent from the client.", "CLIENT_USER_ID_FORBIDDEN");
  }
}

/**
 * Base44 server function entrypoint (Path B).
 * Stateless: does not store JWT server-side between calls.
 * Only calls Railway POST /api/auth/exchange.
 */
export async function getPayUpAccessToken(clientInput?: unknown): Promise<PayUpTokenResponse> {
  assertNoClientUserId(clientInput);

  let base44UserId: string;
  try {
    base44UserId = await resolveCurrentBase44UserId();
  } catch {
    throw new PayUpBridgeError("Base44 user is not authenticated.", "NOT_AUTHENTICATED");
  }

  if (!base44UserId.trim()) {
    throw new PayUpBridgeError("Base44 user is not authenticated.", "NOT_AUTHENTICATED");
  }

  const exchangeUrl = `${getPayUpRailwayBaseUrl()}/api/auth/exchange`;
  const response = await fetch(exchangeUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getBase44ServiceApiKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ base44UserId: base44UserId.trim() }),
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.status === 401) {
    throw new PayUpBridgeError("Railway rejected the service API key.", "EXCHANGE_UNAUTHORIZED");
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Railway exchange failed with HTTP ${response.status}`;
    throw new PayUpBridgeError(message, response.status >= 500 ? "PAYUP_UNAVAILABLE" : "EXCHANGE_FAILED");
  }

  const record = body as Partial<PayUpTokenResponse>;
  if (!record.accessToken || typeof record.expiresIn !== "number") {
    throw new PayUpBridgeError("Railway exchange returned an invalid token payload.", "EXCHANGE_FAILED");
  }

  return {
    accessToken: record.accessToken,
    tokenType: "Bearer",
    expiresIn: record.expiresIn,
  };
}
