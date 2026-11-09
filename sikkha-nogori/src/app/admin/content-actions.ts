"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity, requirePermission } from "@/lib/supabase/admin";

const clean = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};
const safePath = (value: string) => value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !/[\r\n]/.test(value);
const saveSetting = async (key: "homepage" | "banners", value: Record<string, unknown>) => {
  const { supabase } = await requirePermission("manage_homepage", "/admin/dashboard");
  const { error } = await supabase.from("site_settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error("Unable to save website content.", { cause: error });
  await logActivity(supabase, key + "_updated", "site_settings", key);
  revalidatePath("/");
  revalidatePath(key === "banners" ? "/admin/banners" : "/admin/homepage");
};

export async function saveHomepageBuilder(form: FormData) {
  const heroTitle = clean(form, "heroTitle");
  const heroText = clean(form, "heroText");
  const categoriesTitle = clean(form, "categoriesTitle");
  const newArrivalsTitle = clean(form, "newArrivalsTitle");
  const dealsTitle = clean(form, "dealsTitle");
  if (heroTitle.length > 100 || heroText.length > 220 || categoriesTitle.length > 70 || newArrivalsTitle.length > 70 || dealsTitle.length > 70) redirect("/admin/homepage?status=invalid");
  await saveSetting("homepage", {
    hero_title: heroTitle, hero_text: heroText, categories_title: categoriesTitle,
    new_arrivals_title: newArrivalsTitle, deals_title: dealsTitle,
    show_categories: form.get("showCategories") === "on",
    show_new_arrivals: form.get("showNewArrivals") === "on",
    show_deals: form.get("showDeals") === "on",
  });
  redirect("/admin/homepage?status=saved");
}

export async function saveBanners(form: FormData) {
  const banners = [1,2,3].map((i) => ({
    title: clean(form, "title"+i), text: clean(form, "text"+i),
    cta: clean(form, "cta"+i), href: clean(form, "href"+i),
    tone: clean(form, "tone"+i), active: form.get("active"+i) === "on",
  })).filter((b) => b.title || b.text || b.cta || b.href);
  const valid = banners.length <= 3 && banners.every((b) =>
    b.title.length > 0 && b.title.length <= 100 && b.text.length <= 220 &&
    b.cta.length <= 40 && safePath(b.href) && b.tone.length <= 80 &&
    ["from-brand-700 to-brand-950","from-brand-700 to-brand-950","from-slate-700 to-brand-950","from-blue-700 to-slate-950","from-amber-700 to-rose-950"].includes(b.tone)
  );
  if (!valid) redirect("/admin/banners?status=invalid");
  await saveSetting("banners", { items: banners });
  redirect("/admin/banners?status=saved");
}
