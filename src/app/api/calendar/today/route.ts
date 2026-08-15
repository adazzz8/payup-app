import { requireAuth } from "@/core/auth/requireAuth";
import { getTodayCalendarForTherapist, GoogleCalendarError } from "@/core/google/calendar";
import { emptyCorsResponse, jsonWithCors } from "@/core/http/cors";

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const result = await getTodayCalendarForTherapist(auth.context.userId);
    return jsonWithCors(request, result, 200);
  } catch (error) {
    if (error instanceof GoogleCalendarError) {
      const status = error.code === "NOT_CONNECTED" ? 409 : error.code === "AUTHORIZATION_EXPIRED" ? 401 : 502;
      return jsonWithCors(request, { error: error.message, code: error.code }, status);
    }
    const message = error instanceof Error ? error.message : "Failed to load calendar";
    console.error("[PayUp API][calendar/today] failed:", message);
    return jsonWithCors(request, { error: message, code: "CALENDAR_UNAVAILABLE" }, 502);
  }
}

export async function OPTIONS(request: Request) {
  return emptyCorsResponse(request, 204);
}
