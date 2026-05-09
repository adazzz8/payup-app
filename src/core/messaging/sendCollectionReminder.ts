import { buildCollectionMessage } from "@/core/messaging/buildCollectionMessage";
import { sendSms } from "@/core/messaging/sms/sendSms";
import type { BuildCollectionMessageInput, BuildCollectionMessageOutput } from "@/core/messaging/types";

export type SendCollectionReminderResult = {
  message: BuildCollectionMessageOutput;
  delivery: {
    success: boolean;
    providerMessageId: string | null;
    error: string | null;
  };
};

export async function sendCollectionReminder(input: BuildCollectionMessageInput): Promise<SendCollectionReminderResult> {
  const message = buildCollectionMessage(input);

  const customerPhone = input.customer.phone;
  if (!customerPhone || customerPhone.trim().length === 0) {
    return {
      message,
      delivery: {
        success: false,
        providerMessageId: null,
        error: "Customer phone number is missing.",
      },
    };
  }

  const delivery = await sendSms({
    toPhone: customerPhone,
    messageText: message.messageText,
  });

  return {
    message,
    delivery,
  };
}
