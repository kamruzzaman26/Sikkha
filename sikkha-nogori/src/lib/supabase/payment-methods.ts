import "server-only";

import { isCustomerVisiblePaymentMethod } from "@/lib/payment-methods.mjs";
import { createSupabasePublicServerClient } from "@/lib/supabase/server";

export type PublicPaymentMethod = {
  id: string;
  name: string;
  code: string;
  method_type: "manual" | "cod";
  description: string;
  instructions: string;
  sort_order: number;
};

export async function getEnabledPaymentMethods(): Promise<
  PublicPaymentMethod[] | null
> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .select(
      "id, name, code, method_type, description, instructions, sort_order, is_enabled",
    )
    .eq("is_enabled", true)
    .neq("method_type", "gateway")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code ?? "")) {
      console.error(
        "Payment-method migration is missing from the configured database.",
        error,
      );
      return null;
    }
    throw new Error("Unable to load enabled payment methods.", { cause: error });
  }

  return data
    .filter(isCustomerVisiblePaymentMethod)
    .map(
      ({
        id,
        name,
        code,
        method_type,
        description,
        instructions,
        sort_order,
      }) => ({
        id,
        name,
        code,
        method_type,
        description,
        instructions,
        sort_order,
      }),
    );
}
