import { PAYUP_TOKEN_REFRESH_SKEW_MS } from "./config";
import type { PayUpTokenResponse } from "../server/getPayUpAccessToken";
import { PayUpAuthError } from "./errors";

export type PayUpBridgeInvoker = () => Promise<PayUpTokenResponse>;

type MemoryTokenState = {
  accessToken: string | null;
  expiresAtMs: number | null;
  refreshPromise: Promise<string> | null;
};

const memory: MemoryTokenState = {
  accessToken: null,
  expiresAtMs: null,
  refreshPromise: null,
};

let bridgeInvoker: PayUpBridgeInvoker | null = null;

/**
 * Register how the client calls the Base44 server function `getPayUpAccessToken`.
 * Example: () => base44.functions.invoke("getPayUpAccessToken", {})
 */
export function configurePayUpBridgeInvoker(invoker: PayUpBridgeInvoker): void {
  bridgeInvoker = invoker;
}

function assertInvoker(): PayUpBridgeInvoker {
  if (!bridgeInvoker) {
    throw new PayUpAuthError(
      "PayUp bridge is not configured. Call configurePayUpBridgeInvoker() at app startup.",
      "NOT_AUTHENTICATED",
    );
  }
  return bridgeInvoker;
}

function isTokenFresh(): boolean {
  if (!memory.accessToken || memory.expiresAtMs === null) return false;
  return Date.now() < memory.expiresAtMs - PAYUP_TOKEN_REFRESH_SKEW_MS;
}

function storeToken(response: PayUpTokenResponse): string {
  memory.accessToken = response.accessToken;
  memory.expiresAtMs = Date.now() + response.expiresIn * 1000;
  return response.accessToken;
}

/** Clear in-memory token (e.g. Base44 logout). No localStorage/sessionStorage. */
export function clearPayUpToken(): void {
  memory.accessToken = null;
  memory.expiresAtMs = null;
  memory.refreshPromise = null;
}

async function fetchTokenFromBridge(): Promise<string> {
  const invoker = assertInvoker();
  const response = await invoker();
  return storeToken(response);
}

async function refreshTokenSingleFlight(): Promise<string> {
  if (memory.refreshPromise) {
    return memory.refreshPromise;
  }

  memory.refreshPromise = (async () => {
    try {
      clearPayUpToken();
      return await fetchTokenFromBridge();
    } catch {
      throw new PayUpAuthError("Failed to refresh PayUp access token.", "TOKEN_REFRESH_FAILED");
    } finally {
      memory.refreshPromise = null;
    }
  })();

  return memory.refreshPromise;
}

/** Returns a valid PayUp JWT, refreshing proactively before expiry. Memory-only. */
export async function getPayUpAccessToken(): Promise<string> {
  if (isTokenFresh() && memory.accessToken) {
    return memory.accessToken;
  }
  return refreshTokenSingleFlight();
}

/** Used by railwayFetch after 401 — forces a new bridge round-trip once. */
export async function forceRefreshPayUpAccessToken(): Promise<string> {
  return refreshTokenSingleFlight();
}
