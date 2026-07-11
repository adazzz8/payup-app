import { createTwilioClient } from "@/core/providers/twilio/client";
import type { TwilioSendSmsInput, TwilioSendSmsResponse } from "@/core/providers/twilio/types";

function normalizeIsraeliPhone(phone: string): string {
  const digitsOnly = phone.replace(/[^\d+]/g, "");

  if (digitsOnly.startsWith("+972")) {
    return `+972${digitsOnly.slice(4)}`;
  }

  if (digitsOnly.startsWith("972")) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith("0")) {
    return `+972${digitsOnly.slice(1)}`;
  }

  return digitsOnly.startsWith("+") ? digitsOnly : `+${digitsOnly}`;
}

export async function sendSms(input: TwilioSendSmsInput): Promise<TwilioSendSmsResponse> {
  const toPhone = normalizeIsraeliPhone(input.to);

  try {
    const { client, fromPhone } = createTwilioClient();
    const response = await client.messages.create({
      to: toPhone,
      from: fromPhone,
      body: input.body,
    });

    return {
      success: true,
      provider: "twilio",
      sid: response.sid ?? null,
      status: response.status ?? null,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Twilio error";
    console.error("[PayUp Core][Twilio] sendSms failed", {
      success: false,
      errorCode: message,
    });

    return {
      success: false,
      provider: "twilio",
      sid: null,
      status: null,
      error: message,
    };
  }
}
