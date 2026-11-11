"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity, requirePermission } from "@/lib/supabase/admin";

type Kind = "collections" | "curated_lists";

const CONFIG: Record<Kind, { join: string; fk: string; titleField: string; path: string; label: string }> = {
  collections: { join: "product_collections", fk: "collection_id", titleField: "name", path: "/admin/collections", label: "collection" },
  curated_lists: { join: "curated_list_products", fk: "list_id", titleField: "title", path: "/admin/curated-lists", label: "curated_list" },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function kindOf(form: FormData): Kind {
  const kind = text(form, "kind");
  if (kind !== "collections" && kind !== "curated_lists") redirect("/admin/dashboard");
  return kind;
}

function slugify(value: string) {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function dhakaDate(value: string): string | null | undefined {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}:00+06:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function httpsUrl(value: string): string | null | undefined {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/* ---------------------------------- Tags ---------------------------------- */

export async function saveTag(form: FormData) {
  const { supabase } = await requirePermission("manage_products");
  const id = text(form, "id");
  const name = text(form, "name");
  const slug = slugify(text(form, "slug") || name);
  if (!name || name.length > 80 || !slug || (id && !UUID.test(id))) redirect("/admin/tags?status=invalid");
  const row = { name, slug, is_active: text(form, "is_active") !== "false" };
  const { error } = id
    ? await supabase.from("tags").update(row).eq("id", id)
    : await supabase.from("tags").insert(row);
  if (error) redirect(`/admin/tags?status=${error.code === "23505" ? "duplicate" : "error"}`);
  await logActivity(supabase, id ? "tag_updated" : "tag_created", "tags", id || slug);
  revalidatePath("/admin/tags");
  redirect(`/admin/tags?status=${id ? "updated" : "created"}`);
}

export async function deleteTag(form: FormData) {
  const { supabase } = await requirePermission("manage_products");
  const id = text(form, "id");
  if (!UUID.test(id)) redirect("/admin/tags?status=invalid");
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) redirect("/admin/tags?status=error");
  await logActivity(supabase, "tag_deleted", "tags", id);
  revalidatePath("/admin/tags");
  redirect("/admin/tags?status=deleted");
}

/* ------------------------ Collections & curated lists ------------------------ */

export async function saveListing(form: FormData) {
  const { supabase } = await requirePermission("manage_products");
  const kind = kindOf(form);
  const cfg = CONFIG[kind];
  const id = text(form, "id");
  const title = text(form, cfg.titleField);
  const slug = slugify(text(form, "slug") || title);
  const description = text(form, "description");
  const cover = httpsUrl(text(form, "cover"));
  const status = text(form, "status") === "published" ? "published" : "draft";
  const sortOrder = Number.parseInt(text(form, "sortOrder") || "0", 10);

  if (!title || title.length > 160 || !slug || description.length > 600 || cover === undefined ||
      !Number.isInteger(sortOrder) || (id && !UUID.test(id))) {
    redirect(`${cfg.path}?status=invalid${id ? `&edit=${id}` : ""}`);
  }

  let row: Record<string, unknown>;
  if (kind === "collections") {
    const startsAt = dhakaDate(text(form, "startsAt"));
    const endsAt = dhakaDate(text(form, "endsAt"));
    const ruleKind = text(form, "kindType") === "rule" ? "rule" : "manual";
    const ruleSort = ["newest", "price-low", "price-high", "discount-high", "bestselling"].includes(text(form, "ruleSort")) ? text(form, "ruleSort") : "newest";
    const ruleLimit = Math.min(60, Math.max(1, Number.parseInt(text(form, "ruleLimit") || "12", 10) || 12));
    const minDiscount = Math.min(100, Math.max(0, Number.parseInt(text(form, "ruleMinDiscount") || "0", 10) || 0));
    const windowDays = Math.min(3650, Math.max(0, Number.parseInt(text(form, "ruleWindowDays") || "0", 10) || 0));
    if (startsAt === undefined || endsAt === undefined || (startsAt && endsAt && endsAt <= startsAt)) {
      redirect(`${cfg.path}?status=dates${id ? `&edit=${id}` : ""}`);
    }
    row = {
      name: title, slug, description: description || null, cover_image_url: cover, status,
      kind: ruleKind,
      rule: ruleKind === "rule" ? { sort: ruleSort, limit: ruleLimit, min_discount: minDiscount, window_days: windowDays } : {},
      display_position: text(form, "displayPosition") === "homepage" ? "homepage" : "none",
      starts_at: startsAt, ends_at: endsAt, sort_order: sortOrder,
    };
  } else {
    row = {
      title, slug, description: description || null, cover_image_url: cover, status,
      show_on_homepage: text(form, "showOnHomepage") === "on", sort_order: sortOrder,
    };
  }

  const table = kind;
  const { data, error } = id
    ? await supabase.from(table).update(row).eq("id", id).select("id").single()
    : await supabase.from(table).insert(row).select("id").single();
  if (error || !data) redirect(`${cfg.path}?status=${error?.code === "23505" ? "duplicate" : "error"}${id ? `&edit=${id}` : ""}`);
  await logActivity(supabase, id ? `${cfg.label}_updated` : `${cfg.label}_created`, table, data.id as string);
  revalidatePath(cfg.path);
  revalidatePath("/");
  redirect(`${cfg.path}?status=${id ? "updated" : "created"}&edit=${data.id}`);
}

export async function deleteListing(form: FormData) {
  const { supabase } = await requirePermission("manage_products");
  const kind = kindOf(form);
  const cfg = CONFIG[kind];
  const id = text(form, "id");
  if (!UUID.test(id)) redirect(`${cfg.path}?status=invalid`);
  // Only the grouping is removed; products are never deleted (join rows cascade).
  const { error } = await supabase.from(kind).delete().eq("id", id);
  if (error) redirect(`${cfg.path}?status=error`);
  await logActivity(supabase, `${cfg.label}_deleted`, kind, id);
  revalidatePath(cfg.path);
  revalidatePath("/");
  redirect(`${cfg.path}?status=deleted`);
}

export async function addListingProduct(form: FormData) {
  const { supabase } = await requirePermission("manage_products");
  const kind = kindOf(form);
  const cfg = CONFIG[kind];
  const id = text(form, "id");
  const productId = text(form, "productId");
  if (!UUID.test(id) || !UUID.test(productId)) redirect(`${cfg.path}?status=invalid`);
  const { data: last } = await supabase.from(cfg.join).select("position").eq(cfg.fk, id).order("position", { ascending: false }).limit(1);
  const position = ((last?.[0]?.position as number | undefined) ?? 0) + 1;
  const { error } = await supabase.from(cfg.join).insert({ [cfg.fk]: id, product_id: productId, position });
  const status = error ? (error.code === "23505" ? "already" : "error") : "added";
  if (!error) await logActivity(supabase, `${cfg.label}_product_added`, kind, id);
  revalidatePath(cfg.path);
  revalidatePath("/");
  redirect(`${cfg.path}?status=${status}&edit=${id}`);
}

export async function removeListingProduct(form: FormData) {
  const { supabase } = await requirePermission("manage_products");
  const kind = kindOf(form);
  const cfg = CONFIG[kind];
  const id = text(form, "id");
  const productId = text(form, "productId");
  if (!UUID.test(id) || !UUID.test(productId)) redirect(`${cfg.path}?status=invalid`);
  const { error } = await supabase.from(cfg.join).delete().eq(cfg.fk, id).eq("product_id", productId);
  if (!error) await logActivity(supabase, `${cfg.label}_product_removed`, kind, id);
  revalidatePath(cfg.path);
  revalidatePath("/");
  redirect(`${cfg.path}?status=${error ? "error" : "removed"}&edit=${id}`);
}

/** Moves one product up or down by swapping positions with its neighbour. */
export async function moveListingProduct(form: FormData) {
  const { supabase } = await requirePermission("manage_products");
  const kind = kindOf(form);
  const cfg = CONFIG[kind];
  const id = text(form, "id");
  const productId = text(form, "productId");
  const direction = text(form, "direction") === "up" ? "up" : "down";
  if (!UUID.test(id) || !UUID.test(productId)) redirect(`${cfg.path}?status=invalid`);
  const { data } = await supabase.from(cfg.join).select("product_id, position").eq(cfg.fk, id).order("position").order("created_at");
  const rows = (data ?? []) as Array<{ product_id: string; position: number }>;
  const index = rows.findIndex((row) => row.product_id === productId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index >= 0 && swapWith >= 0 && swapWith < rows.length) {
    // Re-number everything so positions are unique and stable, then swap the two.
    const order = rows.map((row) => row.product_id);
    [order[index], order[swapWith]] = [order[swapWith], order[index]];
    await Promise.all(order.map((pid, position) => supabase.from(cfg.join).update({ position: position + 1 }).eq(cfg.fk, id).eq("product_id", pid)));
    revalidatePath(cfg.path);
    revalidatePath("/");
  }
  redirect(`${cfg.path}?edit=${id}`);
}
