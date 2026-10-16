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
  phone: string | null;
};

export interface PayupIntroDeliveryStore {
  get(businessId: string, customerId: string): Promise<PayupIntroDeliveryRecord | null>;
  save(record: PayupIntroDeliveryRecord): Promise<void>;
  listDue(now: Date): Promise<PayupIntroDeliveryRecord[]>;
  claimScheduled(businessId: string, customerId: string): Promise<PayupIntroDeliveryRecord | null>;
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
    async listDue(now) {
      return [...rows.values()].filter((row) => {
        if (row.status !== "scheduled" || !row.scheduledFor) return false;
        return new Date(row.scheduledFor).getTime() <= now.getTime();
      });
    },
    async claimScheduled(businessId, customerId) {
      const row = rows.get(keyOf(businessId, customerId));
      if (!row || row.status !== "scheduled") return null;
      const claimed: PayupIntroDeliveryRecord = { ...row, status: "pending" };
      rows.set(keyOf(businessId, customerId), claimed);
      return claimed;
    },
  };
}
