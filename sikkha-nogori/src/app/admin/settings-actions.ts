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
// Internal path ("/books") or https link.
function safeLink(value: string) {
  return !value || value.startsWith("/") && !value.startsWith("//") || safeUrl(value);
}

async function save(key: "general" | "seo", permission: "manage_settings" | "manage_seo", values: Record<string, unknown>) {
  const base = key === "seo" ? "/admin/seo" : "/admin/settings";
  const { supabase } = await requirePermission(permission, "/admin/dashboard");
  // Merge with what is stored so fields this form does not know about survive.
  const { data: existing } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
  const merged = { ...((existing?.value ?? {}) as Record<string, unknown>), ...values };
  const { error } = await supabase.from("site_settings").upsert({
    key, value: merged, updated_at: new Date().toISOString(),
  }, { onConflict: "key" });
  if (error) throw new Error("Unable to save website settings.", { cause: error });
  await logActivity(supabase, key === "seo" ? "seo_settings_updated" : "website_settings_updated", "site_settings", key);
  revalidatePath(base);
  revalidatePath("/", "layout");
  redirect(`${base}?status=saved`);
}

export async function saveGeneralSettings(form: FormData) {
  const invalid = () => redirect("/admin/settings?status=invalid");
  const text = (key: string, max: number) => { const v = field(form, key); if (v.length > max) invalid(); return v; };
  const siteName = field(form, "siteName");
  if (siteName.length < 2 || siteName.length > 100) invalid();
  const currency = field(form, "currency");
  if (!["BDT", "USD"].includes(currency)) invalid();

  const email = text("contactEmail", 160);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalid();

  const urlFields = { logo_url: field(form, "logoUrl"), favicon_url: field(form, "faviconUrl") };
  const social = {
    facebook: field(form, "facebook"), instagram: field(form, "instagram"), youtube: field(form, "youtube"),
    tiktok: field(form, "tiktok"), x: field(form, "x"),
  };
  if (![...Object.values(urlFields), ...Object.values(social)].every(safeUrl)) invalid();
  const announcementLink = field(form, "announcementLink");
  if (!safeLink(announcementLink)) invalid();

  const whatsapp = text("whatsapp", 40);
  if (whatsapp && !/^[+\d\s-]{6,40}$/.test(whatsapp)) invalid();

  const deliveryDaysRaw = field(form, "deliveryDays");
  const deliveryDays = deliveryDaysRaw === "" ? 7 : Number(deliveryDaysRaw);
  const zoneDays = (key: string, fallback: number) => { const raw = field(form, key); return raw === "" ? fallback : Number(raw); };
  const daysDhaka = zoneDays("deliveryDaysDhaka", 2);
  const daysOutside = zoneDays("deliveryDaysOutside", 3);
  if (!Number.isInteger(deliveryDays) || deliveryDays < 0 || deliveryDays > 60) invalid();
  if (![daysDhaka, daysOutside].every((d) => Number.isInteger(d) && d >= 1 && d <= 60)) invalid();

  await save("general", "manage_settings", {
    site_name: siteName,
    tagline: text("tagline", 200),
    ...urlFields,
    contact_email: email,
    contact_phone: text("contactPhone", 40),
    helpline: text("helpline", 40),
    whatsapp,
    business_hours: text("businessHours", 200),
    address: text("address", 300),
    currency,
    delivery_note: text("deliveryNote", 120),
    announcement_text: text("announcementText", 200),
    announcement_link: announcementLink,
    footer_about: text("footerAbout", 400),
    return_policy: text("returnPolicy", 500),
    delivery_days: deliveryDays,
    delivery_days_dhaka: daysDhaka,
    delivery_days_outside: daysOutside,
    delivery_delay_note: text("deliveryDelayNote", 300),
    social,
  });
}

export async function saveSeoSettings(form: FormData) {
  const invalid = () => redirect("/admin/seo?status=invalid");
  const title = field(form, "title");
  const description = field(form, "description");
  const keywords = field(form, "keywords");
  const preferredDomain = field(form, "canonicalUrl");
  const ogImage = field(form, "ogImage");
  const twitter = field(form, "twitterHandle").replace(/^@/, "");
  const google = field(form, "googleVerification");
  const bing = field(form, "bingVerification");
  const analytics = field(form, "analyticsId").toUpperCase();

  if (title.length < 5 || title.length > 70 || description.length < 30 || description.length > 170 || keywords.length > 500) invalid();
  if (!safeUrl(preferredDomain) || !safeUrl(ogImage)) invalid();
  if (preferredDomain) {
    const url = new URL(preferredDomain);
    if (url.pathname !== "/" || url.search || url.hash) invalid();
  }
  if (twitter && !/^\w{1,15}$/.test(twitter)) invalid();
  if ((google && !/^[\w-]{10,200}$/.test(google)) || (bing && !/^[\w-]{10,200}$/.test(bing))) invalid();
  if (analytics && !/^(G-[A-Z0-9]{4,20}|GTM-[A-Z0-9]{4,20})$/.test(analytics)) invalid();

  await save("seo", "manage_seo", {
    title, description, keywords,
    canonical_url: preferredDomain ? new URL(preferredDomain).origin : "",
    og_image: ogImage, twitter_handle: twitter,
    google_verification: google, bing_verification: bing, analytics_id: analytics,
    index: field(form, "index") === "true",
    follow: field(form, "follow") === "true",
  });
}
