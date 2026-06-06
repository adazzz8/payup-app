import { mintAccessToken } from "@/core/auth/jwt";
import { verifyServiceApiKey } from "@/core/auth/verifyServiceKey";
import { jsonError } from "@/core/http/jsonError";
import { upsertTherapistAccountByBase44UserId } from "@/lib/auth/therapistAccounts";

type ExchangeBody = {
  base44UserId?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Path B token exchange — Base44 server bridge only (service API key).
 * Not intended for browser calls.
 */
export async function POST(request: Request) {
  if (!verifyServiceApiKey(request.headers.get("Authorization"))) {
    return jsonError({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  let body: ExchangeBody;
  try {
    body = (await request.json()) as ExchangeBody;
  } catch {
    return jsonError({ error: "Invalid JSON body", code: "INVALID_BODY" }, 400);
  }

  if (!isNonEmptyString(body.base44UserId)) {
    return jsonError(
      {
        error: "base44UserId is required",
        code: "INVALID_BODY",
      },
      400,
    );
  }

  const base44UserId = body.base44UserId.trim();

  try {
    const account = await upsertTherapistAccountByBase44UserId(base44UserId);
    const { token, expiresIn } = mintAccessToken(account.id);

    return Response.json({
      accessToken: token,
      tokenType: "Bearer",
      expiresIn,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[PayUp API][auth/exchange] failed:", message);
    return jsonError({ error: message, code: "INTERNAL_ERROR" }, 500);
  }
}
