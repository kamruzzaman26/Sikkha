import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (code && code.length <= 2048) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL("/login?status=confirmation-failed", request.url),
      );
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!tokenHash || tokenHash.length > 512 || (type !== "signup" && type !== "email")) {
    return NextResponse.redirect(new URL("/login?status=confirmation-failed", request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    return NextResponse.redirect(new URL("/login?status=confirmation-failed", request.url));
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
