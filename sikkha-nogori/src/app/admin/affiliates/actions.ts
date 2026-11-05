"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";

const reviewStatuses = ["approved", "rejected", "suspended"] as const;

function getValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function reviewAffiliate(formData: FormData) {
  const { supabase } = await requireAdmin("admin");
  const userId = getValue(formData, "userId");
  const status = getValue(formData, "status");

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId,
    ) ||
    !reviewStatuses.some((value) => value === status)
  ) {
    redirect("/admin/affiliates?status=invalid");
  }

  const { error } = await supabase.rpc("admin_review_affiliate", {
    p_user_id: userId,
    p_status: status,
  });

  if (error) {
    if (error.code === "42501") {
      redirect("/admin/affiliates?status=forbidden");
    }
    if (error.code === "P0002") {
      redirect("/admin/affiliates?status=not-found");
    }
    if (error.code === "23514") {
      redirect("/admin/affiliates?status=invalid");
    }
    throw new Error("Unable to update affiliate permissions.", {
      cause: error,
    });
  }

  revalidatePath("/admin/affiliates");
  revalidatePath("/affiliate");
  redirect(`/admin/affiliates?status=${status}`);
}
