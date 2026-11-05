import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isNoActiveSessionError } from "@/lib/supabase/auth-errors";

export async function requireCustomer() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && !isNoActiveSessionError(error)) {
    throw new Error("Unable to verify the signed-in customer.", { cause: error });
  }
  if (!user) {
    redirect("/login?status=sign-in-required");
  }

  const { data: customerProfile, error: profileError } = await supabase
    .from("customer_profiles")
    .select("account_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error("Unable to verify customer account status.", {
      cause: profileError,
    });
  }
  if (customerProfile?.account_status === "suspended") {
    await supabase.auth.signOut();
    redirect("/login?status=suspended");
  }

  return { supabase, user };
}
