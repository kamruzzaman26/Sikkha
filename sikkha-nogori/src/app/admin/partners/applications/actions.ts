"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin, logActivity } from "@/lib/supabase/admin";

function value(data: FormData, key: string) {
  const item = data.get(key);
  return typeof item === "string" ? item.trim() : "";
}

export async function reviewLibraryApplication(data: FormData) {
  const { supabase } = await requireSuperAdmin();
  const id = value(data, "partnerId");
  const decision = value(data, "decision");
  const note = value(data, "adminNote");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["approved", "rejected"].includes(decision) || note.length > 1000) {
    redirect("/admin/partners/applications?status=invalid");
  }
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("library_partners").update({
    status: decision, admin_note: note || null, reviewed_by: user?.id ?? null,
    reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", id).eq("status", "pending");
  if (error) throw new Error("Unable to review library application.", { cause: error });
  await logActivity(supabase, "library_application_" + decision, "library_partner", id);
  revalidatePath("/admin/partners/applications");
  redirect("/admin/partners/applications?status=" + decision);
}
