import {
  GoogleCalendarError,
  listGoogleCalendarsForTherapist,
  selectGoogleCalendarForTherapist,
} from "@/core/google/calendar";
import { requireAuth } from "@/core/auth/requireAuth";
import { emptyCorsResponse, jsonWithCors } from "@/core/http/cors";

function errorResponse(request: Request, error: unknown) {
  if (error instanceof GoogleCalendarError) {
    const status = error.code === "NOT_CONNECTED" ? 409 : error.code === "AUTHORIZATION_EXPIRED" ? 401 : 502;
    return jsonWithCors(request, { error: error.message, code: error.code }, status);
  }
  const message = error instanceof Error ? error.message : "Failed to load calendars";
  return jsonWithCors(request, { error: message, code: "GOOGLE_API_FAILED" }, 502);
}

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;
  try {
    const calendars = await listGoogleCalendarsForTherapist(auth.context.userId);
    return jsonWithCors(request, { calendars }, 200);
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;
  let body: { calendarId?: unknown };
  try {
    body = (await request.json()) as { calendarId?: unknown };
  } catch {
    return jsonWithCors(request, { error: "Invalid JSON body", code: "INVALID_PAYLOAD" }, 400);
  }
  if (typeof body.calendarId !== "string" || body.calendarId.trim().length === 0) {
    return jsonWithCors(request, { error: "calendarId is required", code: "INVALID_PAYLOAD" }, 400);
  }
  try {
    const calendar = await selectGoogleCalendarForTherapist(auth.context.userId, body.calendarId.trim());
    return jsonWithCors(request, { calendar }, 200);
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request: Request) {
  return emptyCorsResponse(request, 204);
}
