import { NextResponse } from "next/server";
import { getShippingCharges } from "@/lib/shipping-fee.mjs";
import { createSupabasePublicServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "general")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ charges: getShippingCharges(null) }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const value = data?.value && typeof data.value === "object"
    ? (data.value as Record<string, unknown>).delivery_charges
    : null;

  return NextResponse.json({ charges: getShippingCharges(value) }, {
    headers: { "Cache-Control": "no-store" },
  });
}
