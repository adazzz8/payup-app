/**
 * Copy/adapt into your Base44 therapist app entry (e.g. app bootstrap).
 * This file is documentation + wiring example — not executed by Railway Core.
 */

import { configurePayUpBridgeInvoker } from "../client/payupAuth";
import { sendCollectionReminderToRailway } from "../client/sendCollectionReminder";
import { getPayUpAccessToken } from "../server/getPayUpAccessToken";

// --- 1) Register Base44 server function named `getPayUpAccessToken` that exports:
//     export { getPayUpAccessToken } from './path/to/getPayUpAccessToken';

// --- 2) Client: wire bridge invoker at startup (use your Base44 client SDK):
export function wirePayUpAuthForBase44(invokeServerFunction: (name: string, data: unknown) => Promise<unknown>) {
  configurePayUpBridgeInvoker(async () => {
    const result = await invokeServerFunction("getPayUpAccessToken", {});
    return result as Awaited<ReturnType<typeof getPayUpAccessToken>>;
  });
}

// --- 3) Replace existing SMS Railway call:
export async function sendCollectionReminder(existingDebtId: string, existingPayload: unknown) {
  return sendCollectionReminderToRailway({
    debtId: existingDebtId,
    payload: existingPayload,
  });
}

// Do NOT send { base44UserId } to the bridge.
// Do NOT set x-user-id on Railway requests for authentication.
