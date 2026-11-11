import { NextRequest, NextResponse } from "next/server";
import { createSupabasePublicServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").normalize("NFKC").trim().slice(0, 80);
  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("title, slug, author")
    .eq("product_type", "book")
    .eq("status", "published")
    .eq("is_published", true)
    .is("archived_at", null)
    .not("commerce_mode", "is", null)
    .ilike("title", `%${query.replace(/[\\%_]/g, "\\$&")}%`)
    .order("title", { ascending: true })
    .limit(8);

  if (error) {
    return NextResponse.json({ suggestions: [] }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json({ suggestions: data ?? [] }, {
    headers: { "Cache-Control": "no-store" },
  });
}
