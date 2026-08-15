import { requireAuth } from "@/core/auth/requireAuth";
import { buildGoogleOAuthUrl } from "@/core/google/oauth";
import { emptyCorsResponse, jsonWithCors } from "@/core/http/cors";
import type { GoogleOAuthReturnTo } from "@/core/google/state";

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const requestedReturnTo = new URL(request.url).searchParams.get("returnTo");
    const returnTo: GoogleOAuthReturnTo =
      requestedReturnTo === "onboarding" ? "onboarding" : "dashboard";
    const url = buildGoogleOAuthUrl(auth.context.userId, returnTo);
    return jsonWithCors(request, { url }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build Google OAuth URL";
    console.error("[PayUp API][google/connect] failed:", message);
    return jsonWithCors(request, { error: message, code: "GOOGLE_NOT_CONFIGURED" }, 500);
  }
}

export async function OPTIONS(request: Request) {
  return emptyCorsResponse(request, 204);
}
