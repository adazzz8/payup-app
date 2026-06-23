import type { MessageEvent, MessageEventPersistence } from "@/core/messages/types";

/**
 * Temporary persistence adapter.
 * Replace with real DB persistence into `messages` table later.
 */
export const inMemoryMessageEventPersistence: MessageEventPersistence = {
  async save(event: MessageEvent) {
    console.info("[PayUp Core][MessageEvent] persisted (temporary)", {
      debtId: event.debtId,
      customerId: event.customerId,
      businessId: event.businessId,
      provider: event.provider,
      providerMessageId: event.providerMessageId,
      status: event.status,
      success: event.status === "sent",
      errorCode: event.error,
      createdAt: event.createdAt,
    });
  },
};
