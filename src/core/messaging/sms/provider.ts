import type { SmsDeliveryResult, SmsProvider, SmsSendInput } from "@/core/messaging/sms/types";

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

export function normalizeIsraeliPhone(phone: string): string {
  const digitsOnly = phone.replace(/[^\d+]/g, "");

  if (digitsOnly.startsWith("+972")) {
    return `972${digitsOnly.slice(4)}`;
  }

  if (digitsOnly.startsWith("972")) {
    return digitsOnly;
  }

  if (digitsOnly.startsWith("0")) {
    return `972${digitsOnly.slice(1)}`;
  }

  return digitsOnly.replace(/^\+/, "");
}

function buildTwilioAuthHeader(accountSid: string, authToken: string): string {
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  return `Basic ${credentials}`;
}

export function createTwilioSmsProvider(): SmsProvider {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  return {
    async send(input: SmsSendInput): Promise<SmsDeliveryResult> {
      if (!accountSid || !authToken || !fromPhone) {
        return {
          success: false,
          providerMessageId: null,
          error: "Twilio credentials are missing in environment variables.",
        };
      }

      const toNormalized = normalizeIsraeliPhone(input.toPhone);
      if (!toNormalized) {
        return {
          success: false,
          providerMessageId: null,
          error: "Invalid destination phone number.",
        };
      }

      const formData = new URLSearchParams();
      formData.set("To", `+${toNormalized}`);
      formData.set("From", fromPhone);
      formData.set("Body", input.messageText);

      try {
        const response = await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: buildTwilioAuthHeader(accountSid, authToken),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        const data = (await response.json()) as { sid?: string; message?: string };
        if (!response.ok) {
          return {
            success: false,
            providerMessageId: null,
            error: data.message ?? "Twilio SMS request failed.",
          };
        }

        return {
          success: true,
          providerMessageId: data.sid ?? null,
          error: null,
        };
      } catch (error) {
        return {
          success: false,
          providerMessageId: null,
          error: error instanceof Error ? error.message : "Unknown SMS provider error.",
        };
      }
    },
  };
}
