export type PayupIntroDeliveryStatus = "sent" | "scheduled" | "failed" | "pending";

export type PayupIntroDeliveryRecord = {
  businessId: string;
  customerId: string;
  status: PayupIntroDeliveryStatus;
  attempts: number;
  lastError: string | null;
  scheduledFor: string | null;
  providerMessageId: string | null;
  messageText: string;
};

export interface PayupIntroDeliveryStore {
  get(businessId: string, customerId: string): Promise<PayupIntroDeliveryRecord | null>;
  save(record: PayupIntroDeliveryRecord): Promise<void>;
}

export function createMemoryPayupIntroDeliveryStore(): PayupIntroDeliveryStore {
  const rows = new Map<string, PayupIntroDeliveryRecord>();
  const keyOf = (businessId: string, customerId: string) => `${businessId}::${customerId}`;

  return {
    async get(businessId, customerId) {
      return rows.get(keyOf(businessId, customerId)) ?? null;
    },
    async save(record) {
      rows.set(keyOf(record.businessId, record.customerId), { ...record });
    },
  };
}
