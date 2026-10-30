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
  const phone = getValue(formData, "phone");

  if (
    displayName.length > 100 ||
    phone.length > 25 ||
    (phone !== "" && !/^[+0-9][0-9+ ()-]{6,24}$/.test(phone))
  ) {
    redirect("/dashboard/profile?status=invalid");
  }

  const { error } = await supabase
    .from("customer_profiles")
    .update({
      display_name: displayName,
      phone,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    throw new Error("Unable to update your profile.", { cause: error });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  redirect("/dashboard/profile?status=saved");
}
