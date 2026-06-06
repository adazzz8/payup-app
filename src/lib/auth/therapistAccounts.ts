import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type TherapistAccount = {
  id: string;
  base44UserId: string;
};

export async function upsertTherapistAccountByBase44UserId(base44UserId: string): Promise<TherapistAccount> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("therapist_accounts")
    .upsert({ base44_user_id: base44UserId }, { onConflict: "base44_user_id" })
    .select("id, base44_user_id")
    .single();

  if (error || !data) {
    throw new Error(`therapist_accounts upsert failed: ${error?.message ?? "unknown"}`);
  }

  return { id: data.id, base44UserId: data.base44_user_id };
}
