import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getDashboardSnapshot() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.from("debts").select("id, amount, status, due_date");

  if (error) {
    throw error;
  }

  return data;
}
