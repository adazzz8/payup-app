import { requireAuth } from "@/core/auth/requireAuth";
import { disconnectGoogleCalendarForTherapist, GoogleCalendarError } from "@/core/google/calendar";
import { emptyCorsResponse, jsonWithCors } from "@/core/http/cors";

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    await disconnectGoogleCalendarForTherapist(auth.context.userId);
    return jsonWithCors(request, { disconnected: true }, 200);
  } catch (error) {
    if (error instanceof GoogleCalendarError) {
      const status = error.code === "NOT_CONNECTED" ? 409 : 502;
      return jsonWithCors(request, { error: error.message, code: error.code }, status);
    }
    const message = error instanceof Error ? error.message : "Failed to disconnect Google Calendar";
    return jsonWithCors(request, { error: message, code: "GOOGLE_DISCONNECT_FAILED" }, 502);
  }
}

export async function OPTIONS(request: Request) {
  return emptyCorsResponse(request, 204);
}
