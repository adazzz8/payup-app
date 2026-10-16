import { deliverStoredPayupIntro, type PayupIntroSendResult } from "@/core/messaging/payupIntroDelivery";
import { resolvePayupIntroTiming } from "@/core/messaging/payupIntroDeliveryPolicy";
import { isPreviewOnlyCustomerId } from "@/core/messaging/payupIntroRequest";
import type { PayupIntroDeliveryStore } from "@/core/messaging/payupIntroDeliveryStore";
import { createSupabasePayupIntroDeliveryStore } from "@/core/messaging/payupIntroDeliveryStoreSupabase";
import { sendSms } from "@/core/providers/twilio/sendSms";

const TICK_MS = 60_000;

export function payupIntroRowCanAutoSend(row: { customerId: string; phone: string | null }): boolean {
  return !isPreviewOnlyCustomerId(row.customerId) && Boolean(row.phone?.trim());
}

/**
 * Picks up due payup_intro rows and sends them.
 * Runs only inside the allowed window. Rows stay scheduled until then.
 * customer id "preview" and rows without a phone are never sent.
 */
export async function processDuePayupIntros(input: {
  now?: Date;
  store: PayupIntroDeliveryStore;
  send: (message: { to: string; body: string }) => Promise<PayupIntroSendResult>;
}): Promise<{ picked: number }> {
  const now = input.now ?? new Date();
  if (!resolvePayupIntroTiming(now).eligibleNow) {
    return { picked: 0 };
  }

  const due = await input.store.listDue(now);
  let picked = 0;
  for (const row of due) {
    if (!payupIntroRowCanAutoSend(row)) continue;
    const claimed = await input.store.claimScheduled(row.businessId, row.customerId);
    if (!claimed) continue;
    picked += 1;
    await deliverStoredPayupIntro({ record: claimed, store: input.store, send: input.send });
  }
  return { picked };
}

let schedulerStarted = false;

export function startPayupIntroScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const run = () => {
    void processDuePayupIntros({
      store: createSupabasePayupIntroDeliveryStore(),
      send: async ({ to, body }) => {
        const sms = await sendSms({ to, body });
        return { success: sms.success, sid: sms.sid, error: sms.error };
      },
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "payup_intro scheduler failed";
      console.error("[PayUp intro scheduler]", message);
    });
  };

  run();
  const timer = setInterval(run, TICK_MS);
  timer.unref?.();
}
