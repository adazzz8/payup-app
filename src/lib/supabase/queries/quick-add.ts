import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getQuickAddAutofillProduct(productId: string) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, default_price")
    .eq("id", productId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
