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

  return { supabase, user };
}
