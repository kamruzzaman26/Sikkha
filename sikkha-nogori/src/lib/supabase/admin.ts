import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isNoActiveSessionError } from "@/lib/supabase/auth-errors";

export type AdminRole = "admin";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

export async function verifyCurrentUserIsAdmin(
  supabase: SupabaseServerClient,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");

  if (error) {
    throw new Error("Unable to verify admin permissions.", { cause: error });
  }

  return data === true;
}

export async function requireAdmin(requiredRole: AdminRole = "admin") {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError && !isNoActiveSessionError(userError)) {
    throw new Error("Unable to verify the signed-in user.", {
      cause: userError,
    });
  }

  if (!user) {
    redirect("/admin/login");
  }

  if (requiredRole !== "admin") {
    redirect("/admin?status=forbidden");
  }

  const isAdmin = await verifyCurrentUserIsAdmin(supabase);
  if (!isAdmin) {
    redirect("/admin/login?error=unauthorized");
  }

  return { supabase, role: "admin" as const };
}

export type AdminPermission =
  | "manage_products"
  | "manage_categories"
  | "manage_orders"
  | "manage_customers"
  | "manage_payments"
  | "manage_homepage"
  | "manage_blog"
  | "manage_marketing"
  | "manage_seo"
  | "manage_media"
  | "manage_users"
  | "manage_settings"
  | "view_reports"
  | "view_activity_logs";

/**
 * Server-side permission check. The caller must already pass the existing
 * admin gate (is_admin). Permissions then come from staff_roles. An admin who
 * has no staff_roles row yet is treated as a legacy "admin" (everything except
 * manage_users) so nobody is locked out by the role rollout.
 */
export async function requirePermission(
  permission: AdminPermission,
  forbiddenPath = "/admin?status=forbidden",
) {
  const context = await requireAdmin("admin");
  const { supabase } = context;

  const { data: allowed, error } = await supabase.rpc("has_permission", {
    p_permission: permission,
  });
  if (error) {
    throw new Error("Unable to verify permissions.", { cause: error });
  }
  if (allowed === true) {
    return context;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: staff, error: staffError } = await supabase
    .from("staff_roles")
    .select("staff_role")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  if (staffError) {
    throw new Error("Unable to verify staff role.", { cause: staffError });
  }
  if (!staff && permission !== "manage_users") {
    return context;
  }

  redirect(forbiddenPath);
}

/** Best-effort audit entry. Never blocks the action it describes. */
export async function logActivity(
  supabase: SupabaseServerClient,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {},
) {
  const { error } = await supabase.rpc("log_admin_activity", {
    p_action: action,
    p_target_type: targetType,
    p_target_id: targetId,
    p_details: details,
  });
  if (error) {
    console.error("Unable to write the activity log.", error);
  }
}


/** Partner approvals and settlement controls are restricted to Super Admins. */
export async function requireSuperAdmin() {
  const context = await requireAdmin("admin");
  const { data: { user } } = await context.supabase.auth.getUser();
  const { data: staff, error } = await context.supabase
    .from("staff_roles")
    .select("staff_role")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  if (error) throw new Error("Unable to verify Super Admin role.", { cause: error });
  if (staff?.staff_role !== "super_admin") redirect("/admin/dashboard?status=forbidden");
  return context;
}
