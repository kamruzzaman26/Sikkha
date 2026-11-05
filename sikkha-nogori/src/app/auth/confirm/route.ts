import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = request.nextUrl.searchParams.get("next");

  if (code && code.length <= 2048) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) return redirectTo(request, "/login?status=confirmation-failed");

    // PKCE callbacks commonly return only ?code=...; the fixed local path
    // is safe to honor without trusting an arbitrary redirect URL.
    return redirectTo(request, next === "/reset-password" ? "/reset-password" : "/dashboard");
  }

  if (
    !tokenHash ||
    tokenHash.length > 512 ||
    (type !== "signup" && type !== "email" && type !== "recovery")
  ) {
    return redirectTo(request, "/login?status=confirmation-failed");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) return redirectTo(request, "/login?status=confirmation-failed");

  return redirectTo(request, type === "recovery" && next === "/reset-password" ? "/reset-password" : "/dashboard");
}
