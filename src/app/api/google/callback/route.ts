import { NextResponse } from "next/server";
import { upsertGoogleCalendarConnection, getGoogleCalendarConnection } from "@/core/google/connections";
import { completeGoogleOAuth, isGoogleAuthRevokedError } from "@/core/google/oauth";
import { getGoogleOAuthAppBaseUrl } from "@/core/google/config";
import { verifyOAuthState } from "@/core/google/state";

function callbackConfigError(message: string): NextResponse {
  console.error("[PayUp API][google/callback] config error:", message);
  return NextResponse.json({ error: message, code: "GOOGLE_NOT_CONFIGURED" }, { status: 500 });
}

function callbackBadRequest(message: string, code: string): NextResponse {
  return NextResponse.json({ error: message, code }, { status: 400 });
}

function buildSuccessRedirect(
  appBaseUrl: string,
  returnTo: "dashboard" | "onboarding",
  params: { connected?: boolean; error?: string },
): string {
  const url = new URL(returnTo === "onboarding" ? "/onboarding" : "/dashboard", appBaseUrl);
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

  if (!state || (!oauthError && !code)) {
    return callbackBadRequest("code and state are required", "MISSING_CODE_OR_STATE");
  }

  let verifiedState: ReturnType<typeof verifyOAuthState>;
  try {
    verifiedState = verifyOAuthState(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_state";
    console.error("[PayUp API][google/callback] invalid state:", message);
    return callbackBadRequest(message, "INVALID_STATE");
  }

  let appBaseUrl: string;
  try {
    appBaseUrl = getGoogleOAuthAppBaseUrl();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google OAuth app URL is not configured.";
    return callbackConfigError(message);
  }

  if (oauthError) {
    return NextResponse.redirect(buildSuccessRedirect(appBaseUrl, verifiedState.returnTo, { error: oauthError }));
  }

  if (!code) {
    return callbackBadRequest("code and state are required", "MISSING_CODE_OR_STATE");
  }

  try {
    const existing = await getGoogleCalendarConnection(verifiedState.therapistAccountId);
    const completed = await completeGoogleOAuth(code, existing?.refreshToken);

    await upsertGoogleCalendarConnection({
      therapistAccountId: verifiedState.therapistAccountId,
      refreshToken: completed.refreshToken,
      googleEmail: completed.googleEmail,
      scopes: completed.scopes,
    });

    return NextResponse.redirect(buildSuccessRedirect(appBaseUrl, verifiedState.returnTo, { connected: true }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "oauth_callback_failed";
    console.error("[PayUp API][google/callback] failed:", message);

    if (isGoogleAuthRevokedError(message)) {
      return NextResponse.redirect(
        buildSuccessRedirect(appBaseUrl, verifiedState.returnTo, { error: "google_auth_revoked" }),
      );
    }

    return NextResponse.redirect(
      buildSuccessRedirect(appBaseUrl, verifiedState.returnTo, { error: "oauth_callback_failed" }),
    );
  }
}
