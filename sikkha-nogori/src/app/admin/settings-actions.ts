"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity, requirePermission } from "@/lib/supabase/admin";

function field(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function safeUrl(value: string) {
  if (!value) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}
async function save(key: "general" | "seo", permission: "manage_settings" | "manage_seo", values: Record<string, unknown>) {
  const base = key === "seo" ? "/admin/seo" : "/admin/settings";
  const { supabase } = await requirePermission(permission, "/admin/dashboard");
  const { error } = await supabase.from("site_settings").upsert({
    key, value: values, updated_at: new Date().toISOString(),
  }, { onConflict: "key" });
  if (error) throw new Error("Unable to save website settings.", { cause: error });
  await logActivity(supabase, key === "seo" ? "seo_settings_updated" : "website_settings_updated", "site_settings", key);
  revalidatePath(base);
  revalidatePath("/");
  revalidatePath("/robots.txt");
  revalidatePath("/sitemap.xml");
  redirect(`${base}?status=saved`);
}

export async function saveGeneralSettings(form: FormData) {
  const siteName = field(form, "siteName");
  const tagline = field(form, "tagline");
  const email = field(form, "contactEmail");
  const phone = field(form, "contactPhone");
  const address = field(form, "address");
  const helpline = field(form, "helpline");
  const deliveryNote = field(form, "deliveryNote");
  const currency = field(form, "currency");
  const facebook = field(form, "facebook");
  const instagram = field(form, "instagram");
  const youtube = field(form, "youtube");
  if (siteName.length < 2 || siteName.length > 100 || tagline.length > 200 || email.length > 160 || phone.length > 40 || address.length > 300 || !["BDT","USD"].includes(currency) || ![facebook,instagram,youtube].every(safeUrl)) redirect("/admin/settings?status=invalid");
  if (helpline.length > 40 || deliveryNote.length > 120) redirect("/admin/settings?status=invalid");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/admin/settings?status=invalid");
  await save("general", "manage_settings", { site_name: siteName, tagline, contact_email: email, contact_phone: phone, helpline, delivery_note: deliveryNote, address, currency, social: { facebook, instagram, youtube } });
}

export async function saveSeoSettings(form: FormData) {
  const title = field(form, "title");
  const description = field(form, "description");
  const keywords = field(form, "keywords");
  const canonicalUrl = field(form, "canonicalUrl");
  const ogImage = field(form, "ogImage");
  const index = field(form, "index") === "true";
  const follow = field(form, "follow") === "true";
  if (title.length < 5 || title.length > 70 || description.length < 30 || description.length > 170 || keywords.length > 500 || !safeUrl(canonicalUrl) || !safeUrl(ogImage)) redirect("/admin/seo?status=invalid");
  await save("seo", "manage_seo", { title, description, keywords, canonical_url: canonicalUrl, og_image: ogImage, index, follow });
}
