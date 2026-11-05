"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicSiteOrigin } from "@/lib/supabase/env";

function getEmail(formData: FormData): string {
  const value = formData.get("email");
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function requestPasswordReset(formData: FormData) {
  const email = getEmail(formData);
  if (
    !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) ||
    email.length > 254
  ) {
    redirect("/forgot-password?status=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const redirectTo = `${getPublicSiteOrigin()}/auth/confirm?next=/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    redirect("/forgot-password?status=error");
  }

  // Use the same response whether or not the address belongs to an account.
  redirect("/forgot-password?status=sent");
}
