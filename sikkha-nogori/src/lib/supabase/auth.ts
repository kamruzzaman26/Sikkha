import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireCustomer() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    throw new Error("Unable to verify the signed-in customer.", { cause: error });
  }
  if (!user) {
    redirect("/login?status=sign-in-required");
  }

  const { data: profile, error: profileError } = await supabase
    .from("customer_profiles")
    .select("account_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error("Unable to verify customer account status.", {
      cause: profileError,
    });
  }
  if (!profile) {
    throw new Error("Customer profile is not available.");
  }
  if (profile.account_status !== "active") {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      throw new Error("Unable to sign out a suspended customer.", {
        cause: signOutError,
      });
    }
    redirect("/login?status=suspended");
  }

  return { supabase, user };
}
