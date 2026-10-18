import { requireAuth } from "@/core/auth/requireAuth";
import { disconnectGoogleCalendarForTherapist } from "@/core/google/calendar";
import { emptyCorsResponse, jsonWithCors } from "@/core/http/cors";

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const result = await disconnectGoogleCalendarForTherapist(auth.context.userId);
    return jsonWithCors(request, result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disconnect Google Calendar";
    console.error("[PayUp API][google/disconnect] local cleanup failed:", message);
    return jsonWithCors(
      request,
      {
        disconnected: false,
        error: "הניתוק לא הושלם. נסה שוב.",
        code: "GOOGLE_DISCONNECT_FAILED",
      },
      502,
    );
  }
}

export async function OPTIONS(request: Request) {
  return emptyCorsResponse(request, 204);
}
