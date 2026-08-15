export const GOOGLE_CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export const THERAPIST_CALENDAR_TIMEZONE = "Asia/Jerusalem";

export function getGoogleClientId(): string {
  const value = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!value) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }
  return value;
}

export function getGoogleClientSecret(): string {
  const value = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!value) {
    throw new Error("GOOGLE_CLIENT_SECRET is not configured.");
  }
  return value;
}

export function getGoogleOAuthRedirectUri(): string {
  const value = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (!value) {
    throw new Error("GOOGLE_OAUTH_REDIRECT_URI is not configured.");
  }
  return value;
}

export function getGoogleOAuthSuccessRedirect(): string {
  const value = process.env.GOOGLE_OAUTH_SUCCESS_REDIRECT?.trim();
  if (!value) {
    throw new Error("GOOGLE_OAUTH_SUCCESS_REDIRECT is not configured.");
  }
  return value;
}

export function getGoogleOAuthAppBaseUrl(): string {
  const configured = process.env.GOOGLE_OAUTH_APP_BASE_URL?.trim();
  const fallback = getGoogleOAuthSuccessRedirect();
  const url = new URL(configured || fallback);
  if (url.protocol !== "https:") {
    throw new Error("GOOGLE_OAUTH_APP_BASE_URL must use https.");
  }
  return url.origin;
}

export function getGoogleAuthBaseUrl(): string {
  return GOOGLE_AUTH_BASE;
}

export function getGoogleTokenUrl(): string {
  return GOOGLE_TOKEN_URL;
}

export function getGoogleCalendarApiBaseUrl(): string {
  return GOOGLE_CALENDAR_API_BASE;
}
