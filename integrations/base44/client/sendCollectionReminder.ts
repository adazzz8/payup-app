import { railwayFetch } from "./railwayFetch";

/**
 * Payload shape matches Railway Core validation — see
 * integrations/base44-send-collection-reminder.payload.example.json
 */
export type SendCollectionReminderRequest = {
  debtId: string;
  payload: unknown;
};

export type SendCollectionReminderResponse = {
  success?: boolean;
  deliveryStatus?: string | null;
  provider?: string;
  sid?: string | null;
  messageText?: string;
  error?: string | null;
  code?: string;
};

/**
 * Replaces direct fetch() to /api/send-collection-reminder.
 * Uses railwayFetch (Bearer JWT). Do not pass x-user-id for auth.
 */
export async function sendCollectionReminderToRailway(
  input: SendCollectionReminderRequest,
): Promise<SendCollectionReminderResponse> {
  const response = await railwayFetch("/api/send-collection-reminder", {
    method: "POST",
    body: JSON.stringify(input),
  });

  const body = (await response.json()) as SendCollectionReminderResponse;

  if (!response.ok) {
    const message = body.error ?? `Railway send-collection-reminder failed (${response.status})`;
    throw new Error(message);
  }

  return body;
}
