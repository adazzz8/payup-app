import { PAYUP_RAILWAY_BASE_URL } from "./config";
import { isPayUpTokenUnauthorized, PayUpAuthError } from "./errors";
import { forceRefreshPayUpAccessToken, getPayUpAccessToken } from "./payupAuth";

export type RailwayFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

/**
 * All therapist Railway HTTP calls must use this helper.
 * - Injects Authorization: Bearer <PayUp JWT>
 * - Retries once on 401 after refreshing token via Base44 bridge
 * - Does not send x-user-id for authentication
 */
export async function railwayFetch(path: string, options: RailwayFetchOptions = {}): Promise<Response> {
  const url = `${PAYUP_RAILWAY_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const doFetch = async (token: string): Promise<Response> => {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  let token = await getPayUpAccessToken();
  let response = await doFetch(token);

  if (isPayUpTokenUnauthorized(response.status, await cloneJsonSafely(response))) {
    try {
      token = await forceRefreshPayUpAccessToken();
    } catch {
      throw new PayUpAuthError("PayUp session expired. Please sign in again.", "RAILWAY_AUTH_FAILED");
    }
    response = await doFetch(token);
  }

  if (isPayUpTokenUnauthorized(response.status, await cloneJsonSafely(response))) {
    throw new PayUpAuthError("PayUp session expired. Please sign in again.", "RAILWAY_AUTH_FAILED");
  }

  return response;
}

async function cloneJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}
