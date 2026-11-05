"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidEmail } from "@/lib/email.mjs";

function getValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
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

  const cookieStore = await cookies();
  cookieStore.set("password-reset-email", email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  // Keep the response generic to avoid revealing whether an account exists.
  redirect("/forgot-password?status=sent");
}

export async function verifyPasswordResetOtp(formData: FormData) {
  const token = getValue(formData, "token");
  const cookieStore = await cookies();
  const email = cookieStore.get("password-reset-email")?.value ?? "";

  if (!isValidEmail(email) || !/^\d{6}$/.test(token)) {
    redirect("/forgot-password?status=invalid-code");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "recovery",
  });

  if (error) {
    redirect("/forgot-password?status=invalid-code");
  }

  cookieStore.set("password-reset-email", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  redirect("/reset-password");
}
