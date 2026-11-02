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

  return { supabase, user };
}
