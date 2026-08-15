import { GOOGLE_CALENDAR_READONLY_SCOPE } from "@/core/google/config";
import { decryptRefreshToken, encryptRefreshToken } from "@/core/google/oauth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type GoogleCalendarConnection = {
  therapistAccountId: string;
  googleEmail: string | null;
  refreshToken: string;
  scopes: string;
  connectedAt: string;
  selectedCalendarId: string;
  selectedCalendarSummary: string | null;
};

type ConnectionRow = {
  therapist_account_id: string;
  google_email: string | null;
  refresh_token_encrypted: string;
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
      "therapist_account_id, google_email, refresh_token_encrypted, scopes, connected_at, selected_calendar_id, selected_calendar_summary",
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
  googleEmail?: string | null;
  scopes?: string;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("google_calendar_connections").upsert(
    {
      therapist_account_id: input.therapistAccountId,
      google_email: input.googleEmail ?? null,
      refresh_token_encrypted: encryptRefreshToken(input.refreshToken),
      scopes: input.scopes ?? GOOGLE_CALENDAR_READONLY_SCOPE,
    },
    { onConflict: "therapist_account_id" },
  );

  if (error) {
    throw new Error(`google_calendar_connections upsert failed: ${error.message}`);
  }
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
