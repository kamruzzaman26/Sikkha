"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidEmail } from "@/lib/email.mjs";

function getValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function withEmail(path: string, email: string): string {
  return `${path}?email=${encodeURIComponent(email)}`;
}

export async function requestPasswordReset(formData: FormData) {
  const email = getValue(formData, "email").toLowerCase();

  if (!isValidEmail(email)) {
    redirect("/forgot-password?status=invalid-email");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    redirect("/forgot-password?status=error");
  }

  // Keep the response generic to avoid revealing whether an account exists.
  redirect(`/forgot-password?status=sent&email=${encodeURIComponent(email)}`);
}

export async function verifyPasswordResetOtp(formData: FormData) {
  const email = getValue(formData, "email").toLowerCase();
  const token = getValue(formData, "token");

  if (!isValidEmail(email) || !/^\d{6}$/.test(token)) {
    redirect(`${withEmail("/forgot-password?status=invalid-code", email)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "recovery",
  });

  if (error) {
    redirect(withEmail("/forgot-password?status=invalid-code", email));
  }

  redirect("/reset-password");
}
