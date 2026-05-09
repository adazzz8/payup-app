import type { BuildCollectionMessageInput } from "@/core/messaging/types";

export type MessageProvider = "twilio";

export type MessageEvent = {
  debtId: string;
  customerId: string;
  businessId: string;
  provider: MessageProvider;
  providerMessageId: string | null;
  status: "queued" | "sent" | "failed";
  messageText: string;
  metadata: BuildCollectionMessageInput["paymentMethods"];
  error: string | null;
  createdAt: string;
};

export type MessageEventPersistence = {
  save: (event: MessageEvent) => Promise<void>;
};
