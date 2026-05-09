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

function shouldRetry(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase();
  return lower.includes("timeout") || lower.includes("network") || lower.includes("429") || lower.includes("5");
}

export async function sendSms(input: TwilioSendSmsInput): Promise<TwilioSendSmsResponse> {
  const toPhone = normalizeIsraeliPhone(input.to);

  let attempts = 0;
  let lastError: string | null = null;

  while (attempts < 3) {
    attempts += 1;

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
      lastError = message;
      console.error("[PayUp Core][Twilio] sendSms failed", { attempts, message });

      if (!shouldRetry(message) || attempts >= 3) {
        break;
      }
    }
  }

  return {
    success: false,
    provider: "twilio",
    sid: null,
    status: null,
    error: lastError ?? "Twilio SMS sending failed.",
  };
}
