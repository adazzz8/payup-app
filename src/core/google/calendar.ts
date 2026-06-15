import {
  getGoogleCalendarApiBaseUrl,
  THERAPIST_CALENDAR_TIMEZONE,
} from "@/core/google/config";
import { isGoogleAuthRevokedError, refreshGoogleAccessToken } from "@/core/google/oauth";
import {
  deleteGoogleCalendarConnection,
  getGoogleCalendarConnection,
  type GoogleCalendarConnection,
} from "@/core/google/connections";

export type TodayCalendarEvent = {
  title: string;
  start: string;
  end: string;
};

type GoogleCalendarEventItem = {
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

type GoogleCalendarListResponse = {
  items?: GoogleCalendarEventItem[];
  error?: { message?: string };
};

function getJerusalemDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: THERAPIST_CALENDAR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getTimezoneOffsetMinutes(timeZone: string, date: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return (asUtc - date.getTime()) / 60_000;
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const mins = String(abs % 60).padStart(2, "0");
  return `${sign}${hours}:${mins}`;
}

function getJerusalemDayBounds(date = new Date()): { timeMin: string; timeMax: string } {
  const day = getJerusalemDateString(date);
  const probe = new Date(`${day}T12:00:00.000Z`);
  const offset = formatOffset(getTimezoneOffsetMinutes(THERAPIST_CALENDAR_TIMEZONE, probe));

  return {
    timeMin: `${day}T00:00:00${offset}`,
    timeMax: `${day}T23:59:59${offset}`,
  };
}

function normalizeEventDateTime(value?: { dateTime?: string; date?: string }): string {
  if (!value) {
    return "";
  }

  if (value.dateTime) {
    return value.dateTime.slice(0, 19);
  }

  if (value.date) {
    return `${value.date}T00:00:00`;
  }

  return "";
}

function mapGoogleEvent(item: GoogleCalendarEventItem): TodayCalendarEvent | null {
  const title = item.summary?.trim() || "ללא כותרת";
  const start = normalizeEventDateTime(item.start);
  const end = normalizeEventDateTime(item.end);

  if (!start) {
    return null;
  }

  return {
    title,
    start,
    end: end || start,
  };
}

async function fetchTodayEventsWithAccessToken(accessToken: string): Promise<TodayCalendarEvent[]> {
  const { timeMin, timeMax } = getJerusalemDayBounds();
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin,
    timeMax,
    timeZone: THERAPIST_CALENDAR_TIMEZONE,
    maxResults: "100",
  });

  const url = `${getGoogleCalendarApiBaseUrl()}/calendars/primary/events?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const json = (await response.json()) as GoogleCalendarListResponse;
  if (!response.ok) {
    const message = json.error?.message || `Google Calendar API failed (${response.status})`;
    throw new Error(message);
  }

  const events = (json.items ?? [])
    .map(mapGoogleEvent)
    .filter((event): event is TodayCalendarEvent => event !== null);

  return events.sort((a, b) => a.start.localeCompare(b.start));
}

async function getAccessTokenForConnection(connection: GoogleCalendarConnection): Promise<string> {
  const tokenResponse = await refreshGoogleAccessToken(connection.refreshToken);
  return tokenResponse.access_token;
}

export type TodayCalendarResult = {
  connected: boolean;
  events: TodayCalendarEvent[];
};

export async function getTodayCalendarForTherapist(therapistAccountId: string): Promise<TodayCalendarResult> {
  const connection = await getGoogleCalendarConnection(therapistAccountId);
  if (!connection) {
    return { connected: false, events: [] };
  }

  try {
    const accessToken = await getAccessTokenForConnection(connection);
    const events = await fetchTodayEventsWithAccessToken(accessToken);
    return { connected: true, events };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Calendar request failed";
    if (isGoogleAuthRevokedError(message)) {
      await deleteGoogleCalendarConnection(therapistAccountId);
      return { connected: false, events: [] };
    }
    throw error;
  }
}
