import { requireAuth } from "@/core/auth/requireAuth";
import { getCalendarEventsForTherapist, GoogleCalendarError } from "@/core/google/calendar";
import { emptyCorsResponse, jsonWithCors } from "@/core/http/cors";

type EventsBody = {
  startDate?: unknown;
  endDate?: unknown;
};

function parseIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const trimmed = value.trim();
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return trimmed;
}

function parseDateRange(body: EventsBody): { startDate: string; endDate: string } | { error: string } {
  const startDate = parseIsoDate(body.startDate);
  const endDate = parseIsoDate(body.endDate);

  if (!startDate || !endDate) {
    return { error: "startDate and endDate are required ISO date strings." };
  }

  if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
    return { error: "startDate must be before or equal to endDate." };
  }

  return { startDate, endDate };
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: EventsBody;
  try {
    body = (await request.json()) as EventsBody;
  } catch {
    return jsonWithCors(request, { error: "Invalid JSON body", code: "INVALID_PAYLOAD" }, 400);
  }

  const range = parseDateRange(body);
  if ("error" in range) {
    return jsonWithCors(request, { error: range.error, code: "INVALID_PAYLOAD" }, 400);
  }

  try {
    const result = await getCalendarEventsForTherapist(
      auth.context.userId,
      range.startDate,
      range.endDate,
    );
    return jsonWithCors(request, result, 200);
  } catch (error) {
    if (error instanceof GoogleCalendarError) {
      const status = error.code === "NOT_CONNECTED" ? 409 : error.code === "AUTHORIZATION_EXPIRED" ? 401 : 502;
      return jsonWithCors(request, { error: error.message, code: error.code }, status);
    }
    const message = error instanceof Error ? error.message : "Failed to load calendar";
    console.error("[PayUp API][calendar/events] failed:", message);
    return jsonWithCors(request, { error: message, code: "CALENDAR_UNAVAILABLE" }, 502);
  }
}

export async function OPTIONS(request: Request) {
  return emptyCorsResponse(request, 204);
}
