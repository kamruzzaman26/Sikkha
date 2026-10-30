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

  if (displayName.length > 100) {
    redirect("/dashboard/profile?status=invalid");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    throw new Error("Unable to update your profile.", { cause: error });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  redirect("/dashboard/profile?status=saved");
}
