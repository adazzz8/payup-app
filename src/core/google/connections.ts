import { GOOGLE_CALENDAR_READONLY_SCOPE } from "@/core/google/config";
import {
  decryptAccessToken,
  decryptRefreshToken,
  encryptAccessToken,
  encryptRefreshToken,
} from "@/core/google/oauth";
import { normalizeIncomingRefreshToken } from "@/core/google/tokenPersistence";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type GoogleCalendarConnection = {
  therapistAccountId: string;
  googleEmail: string | null;
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  scopes: string;
  connectedAt: string;
  selectedCalendarId: string;
  selectedCalendarSummary: string | null;
};

type ConnectionRow = {
  therapist_account_id: string;
  google_email: string | null;
  refresh_token_encrypted: string;
  access_token_encrypted: string | null;
  access_token_expires_at: string | null;
  scopes: string;
  connected_at: string;
  selected_calendar_id: string;
  selected_calendar_summary: string | null;
};

function mapRow(row: ConnectionRow): GoogleCalendarConnection {
  return {
    therapistAccountId: row.therapist_account_id,
    googleEmail: row.google_email,
    refreshToken: decryptRefreshToken(row.refresh_token_encrypted),
    accessToken: row.access_token_encrypted ? decryptAccessToken(row.access_token_encrypted) : null,
    accessTokenExpiresAt: row.access_token_expires_at,
    scopes: row.scopes,
    connectedAt: row.connected_at,
    selectedCalendarId: row.selected_calendar_id,
    selectedCalendarSummary: row.selected_calendar_summary,
  };
}

export async function getGoogleCalendarConnection(
  therapistAccountId: string,
): Promise<GoogleCalendarConnection | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("google_calendar_connections")
    .select(
      "therapist_account_id, google_email, refresh_token_encrypted, access_token_encrypted, access_token_expires_at, scopes, connected_at, selected_calendar_id, selected_calendar_summary",
    )
    .eq("therapist_account_id", therapistAccountId)
    .maybeSingle();

  if (error) {
    throw new Error(`google_calendar_connections read failed: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapRow(data as ConnectionRow);
}

export async function upsertGoogleCalendarConnection(input: {
  therapistAccountId: string;
  refreshToken: string;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
  googleEmail?: string | null;
  scopes?: string;
}): Promise<void> {
  const refreshToken = normalizeIncomingRefreshToken(input.refreshToken);
  if (!refreshToken) {
    throw new Error("Refusing to upsert Google connection without a non-empty refresh token.");
  }

  const row: Record<string, unknown> = {
    therapist_account_id: input.therapistAccountId,
    google_email: input.googleEmail ?? null,
    refresh_token_encrypted: encryptRefreshToken(refreshToken),
    scopes: input.scopes ?? GOOGLE_CALENDAR_READONLY_SCOPE,
  };

  if (input.accessToken !== undefined) {
    const accessToken = normalizeIncomingRefreshToken(input.accessToken);
    row.access_token_encrypted = accessToken ? encryptAccessToken(accessToken) : null;
    row.access_token_expires_at = accessToken ? input.accessTokenExpiresAt ?? null : null;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("google_calendar_connections").upsert(row, {
    onConflict: "therapist_account_id",
  });

  if (error) {
    throw new Error(`google_calendar_connections upsert failed: ${error.message}`);
  }
}

/**
 * Persist tokens after a successful access-token refresh.
 * Updates access token + expiry always; updates refresh token only when a new non-empty one is provided.
 */
export async function persistGoogleTokensAfterRefresh(input: {
  therapistAccountId: string;
  existingRefreshToken: string;
  accessToken: string;
  accessTokenExpiresAt: string | null;
  incomingRefreshToken?: string | null;
}): Promise<string> {
  const existing = normalizeIncomingRefreshToken(input.existingRefreshToken);
  if (!existing) {
    throw new Error("Cannot persist Google tokens without an existing refresh token.");
  }

  const incoming = normalizeIncomingRefreshToken(input.incomingRefreshToken);
  const refreshToStore = incoming ?? existing;
  const accessToken = normalizeIncomingRefreshToken(input.accessToken);
  if (!accessToken) {
    throw new Error("Cannot persist Google tokens without an access token.");
  }

  const patch: Record<string, unknown> = {
    access_token_encrypted: encryptAccessToken(accessToken),
    access_token_expires_at: input.accessTokenExpiresAt,
  };

  if (incoming && incoming !== existing) {
    patch.refresh_token_encrypted = encryptRefreshToken(incoming);
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("google_calendar_connections")
    .update(patch)
    .eq("therapist_account_id", input.therapistAccountId);

  if (error) {
    throw new Error(`google_calendar_connections token update failed: ${error.message}`);
  }

  return refreshToStore;
}

export async function deleteGoogleCalendarConnection(therapistAccountId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("google_calendar_connections")
    .delete()
    .eq("therapist_account_id", therapistAccountId);

  if (error) {
    throw new Error(`google_calendar_connections delete failed: ${error.message}`);
  }
}

export async function setSelectedGoogleCalendar(input: {
  therapistAccountId: string;
  calendarId: string;
  calendarSummary: string | null;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("google_calendar_connections")
    .update({
      selected_calendar_id: input.calendarId,
      selected_calendar_summary: input.calendarSummary,
    })
    .eq("therapist_account_id", input.therapistAccountId);

  if (error) {
    throw new Error(`google_calendar_connections calendar update failed: ${error.message}`);
  }
}
