import type { MessageEvent, MessageEventPersistence } from "@/core/messages/types";

/**
 * Temporary persistence adapter.
 * Replace with real DB persistence into `messages` table later.
 */
export const inMemoryMessageEventPersistence: MessageEventPersistence = {
  async save(event: MessageEvent) {
    console.log("[PayUp Core][MessageEvent] persisted (temporary)", event);
  },
};
