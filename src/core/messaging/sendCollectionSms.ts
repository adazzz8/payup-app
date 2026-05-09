import { buildCollectionMessage } from "@/core/messaging/buildCollectionMessage";
import type { BuildCollectionMessageInput, BuildCollectionMessageOutput } from "@/core/messaging/types";
import { sendSms } from "@/core/providers/twilio/sendSms";
import type { TwilioSendSmsResponse } from "@/core/providers/twilio/types";

export type SendCollectionSmsResponse = {
  message: BuildCollectionMessageOutput;
  delivery: TwilioSendSmsResponse;
};

export async function sendCollectionSms(input: BuildCollectionMessageInput): Promise<SendCollectionSmsResponse> {
  const message = buildCollectionMessage(input);
  const customerPhone = input.customer.phone;

  if (!customerPhone || customerPhone.trim().length === 0) {
    return {
      message,
      delivery: {
        success: false,
        provider: "twilio",
        sid: null,
        status: null,
        error: "Customer phone number is missing.",
      },
    };
  }

  const delivery = await sendSms({
    to: customerPhone,
    body: message.messageText,
  });

  return {
    message,
    delivery,
  };
}
