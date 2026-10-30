"use server";

import { redirect } from "next/navigation";
import { getPublicSiteOrigin } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function signInCustomer(formData: FormData) {
  const email = getFormValue(formData, "email").toLowerCase();
  const passwordValue = formData.get("password");
  const password = typeof passwordValue === "string" ? passwordValue : "";

  if (!isValidEmail(email) || !password || password.length > 128) {
    redirect("/login?status=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !user) {
    redirect("/login?status=invalid");
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
  if (!profile || profile.account_status !== "active") {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      throw new Error("Unable to sign out an unavailable customer account.", {
        cause: signOutError,
      });
    }
    redirect("/login?status=suspended");
  }

  redirect("/dashboard");
}

export async function signUpCustomer(formData: FormData) {
  await createCustomerAccount(formData, "/login");
}

export async function registerCustomer(formData: FormData) {
  await createCustomerAccount(formData, "/register");
}

async function createCustomerAccount(formData: FormData, returnPath: string) {
  const displayName = getFormValue(formData, "displayName");
  const email = getFormValue(formData, "email").toLowerCase();
  const passwordValue = formData.get("password");
  const password = typeof passwordValue === "string" ? passwordValue : "";

  if (
    displayName.length > 100 ||
    !isValidEmail(email) ||
    password.length < 12 ||
    password.length > 128
  ) {
    redirect(`${returnPath}?status=invalid`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: new URL("/auth/confirm", getPublicSiteOrigin()).toString(),
    },
  });

  if (error) {
    redirect(`${returnPath}?status=signup-failed`);
  }
  if (!session) {
    redirect(`${returnPath}?status=check-email`);
  }

  redirect("/dashboard");
}

export async function signOutCustomer() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("Unable to sign out.", { cause: error });
  }

  redirect("/login?status=signed-out");
}
