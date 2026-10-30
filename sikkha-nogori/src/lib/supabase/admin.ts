import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  if (userError && userError.name !== "AuthSessionMissingError") {
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
