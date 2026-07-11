import type { MessageEvent, MessageEventPersistence } from "@/core/messages/types";

/** In-memory persistence adapter until message events are stored in Supabase. */
export const inMemoryMessageEventPersistence: MessageEventPersistence = {
  async save(event: MessageEvent) {
    console.info("[PayUp Core][MessageEvent] persisted", {
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
