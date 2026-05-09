import { createTwilioSmsProvider } from "@/core/messaging/sms/provider";
import type { SmsDeliveryResult, SmsSendInput } from "@/core/messaging/sms/types";

export async function sendSms(input: SmsSendInput): Promise<SmsDeliveryResult> {
  const provider = createTwilioSmsProvider();

  console.log("[PayUp Core][SMS] Sending SMS attempt");
  const result = await provider.send(input);

  if (result.success) {
    console.log("[PayUp Core][SMS] SMS sent successfully", {
      providerMessageId: result.providerMessageId,
    });
  } else {
    console.error("[PayUp Core][SMS] SMS sending failed", {
      error: result.error,
    });
  }

  return result;
}
