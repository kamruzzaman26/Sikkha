"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity, requireSuperAdmin } from "@/lib/supabase/admin";

export async function reviewLibraryApplication(formData: FormData) {
  const { supabase } = await requireSuperAdmin();
  const id = String(formData.get("applicationId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("adminNote") ?? "").trim().slice(0, 2000);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["approved", "rejected"].includes(decision)) {
    redirect("/admin/partners/applications?status=invalid");
  }
  const { data: row, error: readError } = await supabase
    .from("library_partners").select("id,library_name,status").eq("id", id).maybeSingle();
  if (readError || !row || row.status !== "pending") {
    redirect("/admin/partners/applications?status=not-pending");
  }
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("library_partners").update({
    status: decision,
    admin_note: note || null,
    reviewed_by: user?.id ?? null,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("status", "pending");
  if (error) redirect("/admin/partners/applications?status=error");
  await logActivity(supabase, `library_application_${decision}`, "library_partner", id, { library_name: row.library_name, note });
  revalidatePath("/admin/partners/applications");
  redirect("/admin/partners/applications?status=reviewed");
}
