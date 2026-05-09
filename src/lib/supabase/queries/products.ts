import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getRecentProducts(limit = 8) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, default_price, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data;
}
