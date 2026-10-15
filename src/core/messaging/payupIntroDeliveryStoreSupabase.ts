import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  PayupIntroDeliveryRecord,
  PayupIntroDeliveryStore,
} from "@/core/messaging/payupIntroDeliveryStore";

type Row = {
  business_id: string;
  customer_id: string;
  status: PayupIntroDeliveryRecord["status"];
  attempts: number;
  last_error: string | null;
  scheduled_for: string | null;
  provider_message_id: string | null;
  message_text: string;
};

function mapRow(row: Row): PayupIntroDeliveryRecord {
  return {
    businessId: row.business_id,
    customerId: row.customer_id,
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error,
    scheduledFor: row.scheduled_for,
    providerMessageId: row.provider_message_id,
    messageText: row.message_text,
  };
}

export function createSupabasePayupIntroDeliveryStore(): PayupIntroDeliveryStore {
  return {
    async get(businessId, customerId) {
      const supabase = createSupabaseAdminClient();
      const { data, error } = await supabase
        .from("payup_intro_deliveries")
        .select(
          "business_id, customer_id, status, attempts, last_error, scheduled_for, provider_message_id, message_text",
        )
        .eq("business_id", businessId)
        .eq("customer_id", customerId)
        .maybeSingle();

      if (error) {
        throw new Error(`payup_intro_deliveries read failed: ${error.message}`);
      }
      if (!data) return null;
      return mapRow(data as Row);
    },
    async save(record) {
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase.from("payup_intro_deliveries").upsert(
        {
          business_id: record.businessId,
          customer_id: record.customerId,
          status: record.status,
          attempts: record.attempts,
          last_error: record.lastError,
          scheduled_for: record.scheduledFor,
          provider_message_id: record.providerMessageId,
          message_text: record.messageText,
        },
        { onConflict: "business_id,customer_id" },
      );

      if (error) {
        throw new Error(`payup_intro_deliveries upsert failed: ${error.message}`);
      }
    },
  };
}
