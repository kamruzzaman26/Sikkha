"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";

export async function setCustomerStatus(formData: FormData) {
  const { supabase } = await requireAdmin("admin");
  const userIdValue = formData.get("userId");
  const statusValue = formData.get("status");
  const userId = typeof userIdValue === "string" ? userIdValue.trim() : "";
  const status = typeof statusValue === "string" ? statusValue.trim() : "";

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId,
    ) ||
    !["active", "suspended"].includes(status)
  ) {
    redirect("/admin/users?status=invalid");
  }

  const { error } = await supabase.rpc("admin_set_customer_status", {
    p_user_id: userId,
    p_status: status,
  });
  if (error) {
    if (error.code === "42501") {
      redirect("/admin/users?status=forbidden");
    }
    if (error.code === "P0002") {
      redirect("/admin/users?status=not-found");
    }
    if (error.code === "23514") {
      redirect("/admin/users?status=invalid");
    }
    throw new Error("Unable to update customer access.", { cause: error });
  }

  revalidatePath("/admin/users");
  redirect(`/admin/users?status=${status}`);
}
