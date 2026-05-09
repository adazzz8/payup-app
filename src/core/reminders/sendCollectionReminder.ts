import { inMemoryMessageEventPersistence } from "@/core/messages/persistMessageEvent";
import type { MessageEventPersistence } from "@/core/messages/types";
import { buildCollectionMessage } from "@/core/messaging/buildCollectionMessage";
import { sendCollectionSms } from "@/core/messaging/sendCollectionSms";
import type { BuildCollectionMessageInput } from "@/core/messaging/types";

export type SendCollectionReminderInput = {
  debtId: string;
  payload?: BuildCollectionMessageInput;
};

export type SendCollectionReminderOutput = {
  success: boolean;
  deliveryStatus: string | null;
  provider: "twilio";
  sid: string | null;
  messageText: string;
  error: string | null;
};

async function loadReminderPayload(input: SendCollectionReminderInput): Promise<BuildCollectionMessageInput> {
  if (input.payload) {
    return input.payload;
  }

  // Temporary fake DB access path for integration wiring.
  // Replace with real repository query by debtId once DB layer is connected.
  return {
    business: {
      id: "business_temp",
      businessName: "PayUp Demo Business",
    },
    customer: {
      id: "customer_temp",
      fullName: "לקוח/ת דמו",
      phone: "0500000000",
    },
    debt: {
      id: input.debtId,
      totalAmount: 120,
      currency: "ILS",
      items: [
        {
          productName: "מוצר לדוגמה",
          quantity: 1,
          lineTotal: 120,
        },
      ],
    },
    paymentMethods: [
      { type: "bit", isActive: true, value: "0500000000" },
      { type: "paybox", isActive: true, value: "https://payboxapp.page.link/example" },
    ],
  };
}

export async function sendCollectionReminder(
  input: SendCollectionReminderInput,
  persistence: MessageEventPersistence = inMemoryMessageEventPersistence,
): Promise<SendCollectionReminderOutput> {
  const reminderPayload = await loadReminderPayload(input);

  // Explicit message generation step for integration visibility/audit.
  const generatedMessage = buildCollectionMessage(reminderPayload);

  // Delivery step through provider-integrated SMS service.
  const smsResult = await sendCollectionSms(reminderPayload);

  await persistence.save({
    debtId: reminderPayload.debt.id,
    customerId: reminderPayload.customer.id,
    businessId: reminderPayload.business.id,
    provider: "twilio",
    providerMessageId: smsResult.delivery.sid,
    status: smsResult.delivery.success ? "sent" : "failed",
    messageText: generatedMessage.messageText,
    metadata: reminderPayload.paymentMethods,
    error: smsResult.delivery.error,
    createdAt: new Date().toISOString(),
  });

  /**
   * Future architecture hooks:
   * - Retries: failed sends should enqueue a retry job with backoff.
   * - Queue: reminder dispatch should move into worker/queue execution.
   * - Scheduler: scheduled reminders should trigger this service asynchronously.
   * - Webhooks: provider delivery callbacks should update final message status.
   */
  return {
    success: smsResult.delivery.success,
    deliveryStatus: smsResult.delivery.status,
    provider: smsResult.delivery.provider,
    sid: smsResult.delivery.sid,
    messageText: generatedMessage.messageText,
    error: smsResult.delivery.error,
  };
}
