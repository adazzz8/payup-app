import { sendSms } from "@/core/providers/twilio/sendSms";

export type SendCustomSmsInput = {
  phone: string;
  messageText: string;
  businessId: string;
  externalId?: string | null;
};

export type SendCustomSmsOutput = {
  success: boolean;
  deliveryStatus: string | null;
  provider: "twilio";
  sid: string | null;
  error: string | null;
};

/**
 * Sends an arbitrary SMS body as-is via Twilio.
 * No debt, payment link, or collection template involved.
 */
export async function sendCustomSms(input: SendCustomSmsInput): Promise<SendCustomSmsOutput> {
  const delivery = await sendSms({
    to: input.phone,
    body: input.messageText,
  });

  return {
    success: delivery.success,
    deliveryStatus: delivery.status,
    provider: delivery.provider,
    sid: delivery.sid,
    error: delivery.error,
  };
}
