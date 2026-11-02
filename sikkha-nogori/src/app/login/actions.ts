"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value: string): string | null {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^01[3-9]\d{8}$/.test(compact)) return \`+88\${compact}\`;
  if (/^8801[3-9]\d{8}$/.test(compact)) return \`+\${compact}\`;
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  return null;
}

function getContact(value: string):
  | { kind: "email"; value: string }
  | { kind: "phone"; value: string }
  | null {
  const normalized = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && normalized.length <= 254) {
    return { kind: "email", value: normalized.toLowerCase() };
  }
  const phone = normalizePhone(normalized);
  return phone ? { kind: "phone", value: phone } : null;
}

export async function signInCustomer(formData: FormData) {
  const contact = getContact(getFormValue(formData, "identifier"));
  const passwordValue = formData.get("password");
  const password = typeof passwordValue === "string" ? passwordValue : "";
  if (!contact || !password || password.length > 128) redirect("/login?status=invalid");

  const supabase = await createSupabaseServerClient();
  const credentials = contact.kind === "email"
    ? { email: contact.value, password }
    : { phone: contact.value, password };
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) redirect("/login?status=invalid");
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
  const contact = getContact(getFormValue(formData, "identifier"));
  const passwordValue = formData.get("password");
  const password = typeof passwordValue === "string" ? passwordValue : "";
  if (!displayName || displayName.length > 100 || !contact || password.length < 8 || password.length > 128) {
    redirect(\`\${returnPath}?status=invalid\`);
  }

  const supabase = await createSupabaseServerClient();
  const options = { data: { display_name: displayName } };
  const result = contact.kind === "email"
    ? await supabase.auth.signUp({ email: contact.value, password, options })
    : await supabase.auth.signUp({ phone: contact.value, password, options });

  if (result.error) {
    redirect(contact.kind === "phone"
      ? \`\${returnPath}?status=phone-signup-unavailable\`
      : \`\${returnPath}?status=signup-failed\`);
  }
  if (contact.kind === "phone") {
    if (result.data.session) redirect("/dashboard");
    redirect(\`/verify-phone?phone=\${encodeURIComponent(contact.value)}\`);
  }
  if (!result.data.session) redirect(\`/verify-email?email=\${encodeURIComponent(contact.value)}\`);
  redirect("/dashboard");
}

export async function verifyEmailSignup(formData: FormData) {
  const email = getFormValue(formData, "email").toLowerCase();
  const token = getFormValue(formData, "token");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !/^\d{6}$/.test(token)) {
    redirect(\`/verify-email?status=invalid&email=\${encodeURIComponent(email)}\`);
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) redirect(\`/verify-email?status=invalid&email=\${encodeURIComponent(email)}\`);
  redirect("/dashboard");
}

export async function resendEmailSignupCode(formData: FormData) {
  const email = getFormValue(formData, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) redirect("/register?status=invalid");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) redirect(\`/verify-email?status=resend-failed&email=\${encodeURIComponent(email)}\`);
  redirect(\`/verify-email?status=resent&email=\${encodeURIComponent(email)}\`);
}

export async function verifyPhoneSignup(formData: FormData) {
  const phone = normalizePhone(getFormValue(formData, "phone"));
  const token = getFormValue(formData, "token");
  if (!phone || !/^\d{6,8}$/.test(token)) redirect("/verify-phone?status=invalid");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) redirect(\`/verify-phone?status=invalid&phone=\${encodeURIComponent(phone)}\`);
  redirect("/dashboard");
}

export async function signOutCustomer() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Unable to sign out.", { cause: error });
  redirect("/login?status=signed-out");
}
