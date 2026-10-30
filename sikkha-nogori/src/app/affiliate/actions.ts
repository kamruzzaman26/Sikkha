"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/supabase/auth";

export async function applyForAffiliate() {
  const { supabase, user } = await requireCustomer();
  const { error } = await supabase
    .from("affiliate_applications")
    .insert({ user_id: user.id });

  if (error) {
    if (error.code === "23505") {
      redirect("/affiliate?status=already-applied");
    }
    throw new Error("Unable to submit your affiliate application.", {
      cause: error,
    });
  }

  revalidatePath("/affiliate");
  redirect("/affiliate?status=application-submitted");
}
