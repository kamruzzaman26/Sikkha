import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeDestination(request: NextRequest): string {
  const next = request.nextUrl.searchParams.get("next");
  const type = request.nextUrl.searchParams.get("type");

  // Password recovery is the only flow allowed to leave the auth callback
  // for the password form. All other confirmation links go to the dashboard.
  return type === "recovery" && next === "/reset-password"
    ? "/reset-password"
    : "/dashboard";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const destination = getSafeDestination(request);

  if (code && code.length <= 2048) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL("/login?status=confirmation-failed", request.url),
      );
    }

    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (
    !tokenHash ||
    tokenHash.length > 512 ||
    (type !== "signup" && type !== "email" && type !== "recovery")
  ) {
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

  return NextResponse.redirect(new URL(destination, request.url));
}
