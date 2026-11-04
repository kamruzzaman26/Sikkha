"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity, requirePermission } from "@/lib/supabase/admin";

type SettingsKey = "pages" | "navigation" | "marketing";
function textValue(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function parseJson<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
function slugIsValid(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
async function persist(key: SettingsKey, permission: "manage_homepage" | "manage_marketing", value: unknown, event: string) {
  const base = key === "pages" ? "/admin/pages" : key === "navigation" ? "/admin/navigation" : "/admin/marketing";
  const { supabase } = await requirePermission(permission, "/admin/dashboard");
  const { error } = await supabase.from("site_settings").upsert({
    key, value, updated_at: new Date().toISOString(),
  }, { onConflict: "key" });
  if (error) throw new Error("Unable to save this module.", { cause: error });
  await logActivity(supabase, event, "site_settings", key);
  revalidatePath(base);
  revalidatePath("/");
  revalidatePath("/page/[slug]", "page");
  redirect(base + "?status=saved");
}

export async function savePages(form: FormData) {
  const rows = parseJson<Array<Record<string, unknown>>>(textValue(form, "pages"), []);
  if (!Array.isArray(rows) || rows.length > 50) redirect("/admin/pages?status=invalid");
  const pages = rows.map((row) => ({
    title: String(row.title ?? "").trim(),
    slug: String(row.slug ?? "").trim().toLowerCase(),
    content: String(row.content ?? "").trim(),
    status: row.status === "published" ? "published" : "draft",
    updated_at: new Date().toISOString(),
  }));
  const seen = new Set<string>();
  for (const page of pages) {
    if (page.title.length < 2 || page.title.length > 120 || !slugIsValid(page.slug) ||
      ["admin", "api", "blog", "books", "products", "login", "page"].includes(page.slug) ||
      page.content.length > 30000 || seen.has(page.slug)) redirect("/admin/pages?status=invalid");
    seen.add(page.slug);
  }
  await persist("pages", "manage_homepage", pages, "website_pages_updated");
}

export async function saveNavigation(form: FormData) {
  const rows = parseJson<Array<Record<string, unknown>>>(textValue(form, "items"), []);
  if (!Array.isArray(rows) || rows.length > 20) redirect("/admin/navigation?status=invalid");
  const items = rows.map((row) => ({
    label: String(row.label ?? "").trim(),
    href: String(row.href ?? "").trim(),
    active: row.active !== false,
  }));
  for (const item of items) {
    if (!item.label || item.label.length > 50 ||
      !item.href.startsWith("/") || item.href.startsWith("//") ||
      item.href.length > 200) redirect("/admin/navigation?status=invalid");
  }
  await persist("navigation", "manage_homepage", items, "website_navigation_updated");
}

export async function saveMarketing(form: FormData) {
  const rows = parseJson<Array<Record<string, unknown>>>(textValue(form, "campaigns"), []);
  if (!Array.isArray(rows) || rows.length > 50) redirect("/admin/marketing?status=invalid");
  const campaigns = rows.map((row) => ({
    name: String(row.name ?? "").trim(),
    channel: String(row.channel ?? "Website").trim(),
    message: String(row.message ?? "").trim(),
    status: ["draft", "ready", "archived"].includes(String(row.status)) ? String(row.status) : "draft",
    updated_at: new Date().toISOString(),
  }));
  for (const item of campaigns) {
    if (item.name.length < 2 || item.name.length > 120 || item.message.length > 5000 ||
      !["Website", "Facebook", "Email", "Other"].includes(item.channel)) redirect("/admin/marketing?status=invalid");
  }
  await persist("marketing", "manage_marketing", campaigns, "marketing_campaigns_updated");
}
