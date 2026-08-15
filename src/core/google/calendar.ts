import {
  getGoogleCalendarApiBaseUrl,
  THERAPIST_CALENDAR_TIMEZONE,
} from "@/core/google/config";
import { isGoogleAuthRevokedError, refreshGoogleAccessToken } from "@/core/google/oauth";
import {
  deleteGoogleCalendarConnection,
  getGoogleCalendarConnection,
  setSelectedGoogleCalendar,
  type GoogleCalendarConnection,
} from "@/core/google/connections";
import { revokeGoogleRefreshToken } from "@/core/google/oauth";

export class GoogleCalendarError extends Error {
  constructor(
    public readonly code: "NOT_CONNECTED" | "AUTHORIZATION_EXPIRED" | "REFRESH_FAILED" | "GOOGLE_API_FAILED",
    message: string,
  ) {
    super(message);
  }
}

export type AccessibleGoogleCalendar = {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string;
};

export type TodayCalendarEvent = {
  title: string;
  start: string;
  end: string;
};

export type CalendarEventDateTime = {
  dateTime?: string;
  date?: string;
  timeZone?: string;
};

export type CalendarEventAttendee = {
  id?: string;
  email?: string;
  displayName?: string;
  optional?: boolean;
  responseStatus?: string;
  self?: boolean;
  organizer?: boolean;
};

export type CalendarRangeEvent = {
  id: string;
  status: string;
  updated: string;
  etag: string;
  summary: string;
  description: string | null;
  start: CalendarEventDateTime;
  end: CalendarEventDateTime;
  recurringEventId: string | null;
  originalStartTime: CalendarEventDateTime | null;
  attendees: CalendarEventAttendee[];
  calendarId: string;
};

type GoogleCalendarEventItem = {
  id?: string;
  status?: string;
  updated?: string;
  etag?: string;
  summary?: string;
  description?: string;
  start?: CalendarEventDateTime;
  end?: CalendarEventDateTime;
  recurringEventId?: string;
  originalStartTime?: CalendarEventDateTime;
  attendees?: CalendarEventAttendee[];
};

type GoogleCalendarListResponse = {
  items?: GoogleCalendarEventItem[];
  nextPageToken?: string;
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

async function fetchTodayEventsWithAccessToken(
  accessToken: string,
  calendarId: string,
): Promise<TodayCalendarEvent[]> {
  const { timeMin, timeMax } = getJerusalemDayBounds();
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin,
    timeMax,
    timeZone: THERAPIST_CALENDAR_TIMEZONE,
    maxResults: "100",
  });

  const url = `${getGoogleCalendarApiBaseUrl()}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const json = (await response.json()) as GoogleCalendarListResponse;
  if (!response.ok) {
    const message = json.error?.message || `Google Calendar API failed (${response.status})`;
    throw new GoogleCalendarError("GOOGLE_API_FAILED", message);
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
    throw new GoogleCalendarError("NOT_CONNECTED", "Not Connected");
  }

  try {
    const accessToken = await getAccessTokenForConnection(connection);
    const events = await fetchTodayEventsWithAccessToken(accessToken, connection.selectedCalendarId);
    return { connected: true, events };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Calendar request failed";
    if (isGoogleAuthRevokedError(message)) {
      await deleteGoogleCalendarConnection(therapistAccountId);
      throw new GoogleCalendarError("AUTHORIZATION_EXPIRED", "Google authorization expired");
    }
    throw error;
  }
}

function mapGoogleRangeEvent(item: GoogleCalendarEventItem, calendarId: string): CalendarRangeEvent | null {
  if (!item.id) {
    return null;
  }

  return {
    id: item.id,
    status: item.status ?? "confirmed",
    updated: item.updated ?? "",
    etag: item.etag ?? "",
    summary: item.summary ?? "",
    description: item.description ?? null,
    start: item.start ?? {},
    end: item.end ?? {},
    recurringEventId: item.recurringEventId ?? null,
    originalStartTime: item.originalStartTime ?? null,
    attendees: item.attendees ?? [],
    calendarId,
  };
}

async function fetchCalendarEventsWithAccessToken(
  accessToken: string,
  calendarId: string,
  startDate: string,
  endDate: string,
): Promise<CalendarRangeEvent[]> {
  const events: CalendarRangeEvent[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      timeMin: startDate,
      timeMax: endDate,
      timeZone: THERAPIST_CALENDAR_TIMEZONE,
      maxResults: "250",
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const url = `${getGoogleCalendarApiBaseUrl()}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const json = (await response.json()) as GoogleCalendarListResponse;
    if (!response.ok) {
      const message = json.error?.message || `Google Calendar API failed (${response.status})`;
      throw new GoogleCalendarError("GOOGLE_API_FAILED", message);
    }

    for (const item of json.items ?? []) {
      const mapped = mapGoogleRangeEvent(item, calendarId);
      if (mapped) {
        events.push(mapped);
      }
    }

    pageToken = json.nextPageToken;
  } while (pageToken);

  return events;
}

export type CalendarRangeEventsResult = {
  connected: boolean;
  startDate: string;
  endDate: string;
  events: CalendarRangeEvent[];
};

export async function getCalendarEventsForTherapist(
  therapistAccountId: string,
  startDate: string,
  endDate: string,
): Promise<CalendarRangeEventsResult> {
  const connection = await getGoogleCalendarConnection(therapistAccountId);
  if (!connection) {
    throw new GoogleCalendarError("NOT_CONNECTED", "Not Connected");
  }

  try {
    const accessToken = await getAccessTokenForConnection(connection);
    const events = await fetchCalendarEventsWithAccessToken(
      accessToken,
      connection.selectedCalendarId,
      startDate,
      endDate,
    );
    return { connected: true, startDate, endDate, events };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Calendar request failed";
    if (isGoogleAuthRevokedError(message)) {
      await deleteGoogleCalendarConnection(therapistAccountId);
      throw new GoogleCalendarError("AUTHORIZATION_EXPIRED", "Google authorization expired");
    }
    throw error;
  }
}

async function getConnectedAccessToken(therapistAccountId: string): Promise<{
  connection: GoogleCalendarConnection;
  accessToken: string;
}> {
  const connection = await getGoogleCalendarConnection(therapistAccountId);
  if (!connection) {
    throw new GoogleCalendarError("NOT_CONNECTED", "Not Connected");
  }

  try {
    return { connection, accessToken: await getAccessTokenForConnection(connection) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google token refresh failed";
    if (isGoogleAuthRevokedError(message)) {
      await deleteGoogleCalendarConnection(therapistAccountId);
      throw new GoogleCalendarError("AUTHORIZATION_EXPIRED", "Google authorization expired");
    }
    throw new GoogleCalendarError("REFRESH_FAILED", message);
  }
}

export async function listGoogleCalendarsForTherapist(
  therapistAccountId: string,
): Promise<AccessibleGoogleCalendar[]> {
  const { accessToken } = await getConnectedAccessToken(therapistAccountId);
  const response = await fetch(`${getGoogleCalendarApiBaseUrl()}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  const json = (await response.json()) as {
    items?: Array<{ id?: string; summary?: string; primary?: boolean; accessRole?: string }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new GoogleCalendarError(
      "GOOGLE_API_FAILED",
      json.error?.message || `Google Calendar API failed (${response.status})`,
    );
  }
  return (json.items ?? [])
    .filter((calendar): calendar is Required<Pick<AccessibleGoogleCalendar, "id" | "summary">> & AccessibleGoogleCalendar =>
      Boolean(calendar.id && calendar.summary),
    )
    .map((calendar) => ({
      id: calendar.id,
      summary: calendar.summary,
      primary: Boolean(calendar.primary),
      accessRole: calendar.accessRole ?? "none",
    }));
}

export async function selectGoogleCalendarForTherapist(
  therapistAccountId: string,
  calendarId: string,
): Promise<AccessibleGoogleCalendar> {
  const calendars = await listGoogleCalendarsForTherapist(therapistAccountId);
  const selected = calendars.find((calendar) => calendar.id === calendarId);
  if (!selected) {
    throw new GoogleCalendarError("GOOGLE_API_FAILED", "Selected calendar is not accessible.");
  }
  await setSelectedGoogleCalendar({
    therapistAccountId,
    calendarId: selected.id,
    calendarSummary: selected.summary,
  });
  return selected;
}

export async function disconnectGoogleCalendarForTherapist(therapistAccountId: string): Promise<void> {
  const connection = await getGoogleCalendarConnection(therapistAccountId);
  if (!connection) {
    throw new GoogleCalendarError("NOT_CONNECTED", "Not Connected");
  }
  try {
    await revokeGoogleRefreshToken(connection.refreshToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google token revocation failed";
    if (!isGoogleAuthRevokedError(message)) {
      throw new GoogleCalendarError("GOOGLE_API_FAILED", message);
    }
  }
  await deleteGoogleCalendarConnection(therapistAccountId);
}
