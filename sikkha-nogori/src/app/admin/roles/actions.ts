"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/supabase/admin";

const roles = ["super_admin", "admin", "editor"] as const;

export async function setStaffRole(formData: FormData) {
  const { supabase } = await requirePermission(
    "manage_users",
    "/admin/roles?status=forbidden",
  );
  const userIdValue = formData.get("userId");
  const roleValue = formData.get("role");
  const userId = typeof userIdValue === "string" ? userIdValue.trim() : "";
  const role = typeof roleValue === "string" ? roleValue.trim() : "";

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId,
    ) ||
    !roles.some((value) => value === role)
  ) {
    redirect("/admin/roles?status=invalid");
  }

  // The database function re-checks that the caller is a super admin, blocks
  // removing the last one, and writes the audit entry.
  const { error } = await supabase.rpc("admin_set_staff_role", {
    p_user: userId,
    p_role: role,
  });
  if (error) {
    redirect("/admin/roles?status=rejected");
  }

  revalidatePath("/admin/roles");
  redirect("/admin/roles?status=updated");
}
