"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function updateCustomerPassword(formData: FormData) {
  const password = getValue(formData, "password");
  const confirmPassword = getValue(formData, "confirmPassword");

  if (password.length < 8 || password.length > 128) {
    redirect("/reset-password?status=weak");
  }
  if (password !== confirmPassword) {
    redirect("/reset-password?status=mismatch");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/forgot-password?status=error");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect("/reset-password?status=error");
  }

  redirect("/login?status=password-updated");
}
