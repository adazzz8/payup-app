import { NextResponse } from "next/server";
import { upsertGoogleCalendarConnection, getGoogleCalendarConnection } from "@/core/google/connections";
import { completeGoogleOAuth, isGoogleAuthRevokedError } from "@/core/google/oauth";
import { getGoogleOAuthSuccessRedirect } from "@/core/google/config";
import { verifyOAuthState } from "@/core/google/state";

function callbackConfigError(message: string): NextResponse {
  console.error("[PayUp API][google/callback] config error:", message);
  return NextResponse.json({ error: message, code: "GOOGLE_NOT_CONFIGURED" }, { status: 500 });
}

function callbackBadRequest(message: string, code: string): NextResponse {
  return NextResponse.json({ error: message, code }, { status: 400 });
}

function buildSuccessRedirect(successRedirect: string, params: { connected?: boolean; error?: string }): string {
  const url = new URL(successRedirect);
  if (params.connected) {
    url.searchParams.set("connected", "1");
  }
  if (params.error) {
    url.searchParams.set("google_error", params.error);
  }
  return url.toString();
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const oauthError = requestUrl.searchParams.get("error");
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");

  if (!oauthError && (!code || !state)) {
    return callbackBadRequest("code and state are required", "MISSING_CODE_OR_STATE");
  }

  let successRedirect: string;
  try {
    successRedirect = getGoogleOAuthSuccessRedirect();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "GOOGLE_OAUTH_SUCCESS_REDIRECT is not configured.";
    return callbackConfigError(message);
  }

  if (oauthError) {
    return NextResponse.redirect(buildSuccessRedirect(successRedirect, { error: oauthError }));
  }

  if (!code || !state) {
    return callbackBadRequest("code and state are required", "MISSING_CODE_OR_STATE");
  }

  let therapistAccountId: string;
  try {
    therapistAccountId = verifyOAuthState(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_state";
    console.error("[PayUp API][google/callback] invalid state:", message);
    return callbackBadRequest(message, "INVALID_STATE");
  }

  try {
    const existing = await getGoogleCalendarConnection(therapistAccountId);
    const completed = await completeGoogleOAuth(code, existing?.refreshToken);

    await upsertGoogleCalendarConnection({
      therapistAccountId,
      refreshToken: completed.refreshToken,
      googleEmail: completed.googleEmail,
      scopes: completed.scopes,
    });

    return NextResponse.redirect(buildSuccessRedirect(successRedirect, { connected: true }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "oauth_callback_failed";
    console.error("[PayUp API][google/callback] failed:", message);

    if (isGoogleAuthRevokedError(message)) {
      return NextResponse.redirect(buildSuccessRedirect(successRedirect, { error: "google_auth_revoked" }));
    }

    return NextResponse.redirect(buildSuccessRedirect(successRedirect, { error: "oauth_callback_failed" }));
  }
}
