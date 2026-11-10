"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/supabase/auth";

function getValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateCustomerProfile(formData: FormData) {
  const { supabase, user } = await requireCustomer();
  const displayName = getValue(formData, "displayName");
  const dateOfBirth = getValue(formData, "dateOfBirth");
  const gender = getValue(formData, "gender");
  const validGender = !gender || ["Male", "Female", "Prefer not to say"].includes(gender);
  const validDate = !dateOfBirth || (/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) && !Number.isNaN(Date.parse(`${dateOfBirth}T00:00:00.000Z`)) && new Date(`${dateOfBirth}T00:00:00.000Z`).toISOString().slice(0, 10) === dateOfBirth && dateOfBirth <= new Date().toISOString().slice(0, 10));
  if (!displayName || displayName.length > 100 || !validDate || !validGender) redirect("/dashboard/profile?status=invalid");

  const { data: updatedProfile, error } = await supabase.from("profiles").update({
    display_name: displayName,
    date_of_birth: dateOfBirth || null,
    gender: gender || null,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id).select("id, date_of_birth, gender").maybeSingle();

  if (error) throw new Error("Unable to update your profile.", { cause: error });
  if (!updatedProfile) throw new Error("Your profile record was not found, so the changes could not be saved.");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  redirect("/dashboard/profile?status=saved");
}

export async function updateCustomerPassword(formData: FormData) {
  const { supabase } = await requireCustomer();
  const newPassword = getValue(formData, "newPassword");
  const confirmPassword = getValue(formData, "confirmPassword");
  if (newPassword.length < 8) redirect("/dashboard/profile?status=passwordInvalid");
  if (newPassword !== confirmPassword) redirect("/dashboard/profile?status=passwordMismatch");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error("Unable to update your password.", { cause: error });
  revalidatePath("/dashboard/profile");
  redirect("/dashboard/profile?status=password");
}
