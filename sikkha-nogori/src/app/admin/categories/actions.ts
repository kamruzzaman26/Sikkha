"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isValidSlug,
  parseCategoryMarkdown,
  pickSlug,
} from "@/lib/category-markdown.mjs";
import { logActivity, requirePermission } from "@/lib/supabase/admin";

const groups = ["books", "products", "electronics", "courses"] as const;
type Group = (typeof groups)[number];
const BASE = "/admin/categories";
const FORBIDDEN = `${BASE}?status=forbidden`;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isGroup(value: string): value is Group {
  return groups.some((group) => group === value);
}

function done(status: string, extra = ""): never {
  revalidatePath(BASE);
  redirect(`${BASE}?status=${status}${extra}`);
}

export async function saveCategory(formData: FormData) {
  const { supabase } = await requirePermission("manage_categories", FORBIDDEN);
  const id = text(formData, "id");
  const name = text(formData, "name");
  const nameEn = text(formData, "nameEn");
  const slug = text(formData, "slug");
  const parentId = text(formData, "parentId");
  const sortValue = text(formData, "sortOrder");
  const sortOrder = sortValue === "" ? 0 : Number(sortValue);
  const isActive = text(formData, "isActive") === "true";

  if (
    !isUuid(id) ||
    name === "" ||
    name.length > 120 ||
    nameEn.length > 120 ||
    !isValidSlug(slug) ||
    (parentId !== "" && (!isUuid(parentId) || parentId === id)) ||
    !Number.isInteger(sortOrder) ||
    sortOrder < 0 ||
    sortOrder > 99999
  ) {
    redirect(`${BASE}?status=invalid`);
  }

  const { data, error } = await supabase
    .from("categories")
    .update({
      name,
      name_en: nameEn || null,
      slug,
      parent_id: parentId || null,
      sort_order: sortOrder,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") redirect(`${BASE}?status=slug-exists`);
    if (error.code === "23514") redirect(`${BASE}?status=invalid-parent`);
    throw new Error("Unable to update the category.", { cause: error });
  }
  if (!data) redirect(`${BASE}?status=not-found`);

  await logActivity(supabase, "category_updated", "category", id, {
    name,
    slug,
    is_active: isActive,
  });
  done("updated");
}

export async function deleteCategory(formData: FormData) {
  const { supabase } = await requirePermission("manage_categories", FORBIDDEN);
  const id = text(formData, "id");
  if (!isUuid(id)) redirect(`${BASE}?status=invalid`);

  const [children, products] = await Promise.all([
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", id),
    supabase
      .from("product_categories")
      .select("product_id", { count: "exact", head: true })
      .eq("category_id", id),
  ]);
  if (children.error || products.error) {
    throw new Error("Unable to check the category before deleting.", {
      cause: children.error ?? products.error,
    });
  }
  if ((children.count ?? 0) > 0 || (products.count ?? 0) > 0) {
    redirect(`${BASE}?status=in-use`);
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") redirect(`${BASE}?status=in-use`);
    throw new Error("Unable to delete the category.", { cause: error });
  }

  await logActivity(supabase, "category_deleted", "category", id);
  done("deleted");
}

export async function bulkAddCategories(formData: FormData) {
  const { supabase } = await requirePermission("manage_categories", FORBIDDEN);
  const group = text(formData, "group");
  const baseParentId = text(formData, "parentId");
  const markdown = String(formData.get("markdown") ?? "");

  if (!isGroup(group) || (baseParentId !== "" && !isUuid(baseParentId))) {
    redirect(`${BASE}?status=invalid`);
  }

  const { items, errors } = parseCategoryMarkdown(markdown);
  if (errors.length > 0) {
    redirect(`${BASE}?status=bulk-invalid&detail=${encodeURIComponent(errors[0])}`);
  }

  const { data: existing, error: existingError } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, sort_order, category_group")
    .eq("category_group", group)
    .limit(5000);
  if (existingError) {
    throw new Error("Unable to load existing categories.", {
      cause: existingError,
    });
  }

  if (baseParentId) {
    const parent = (existing ?? []).find((row) => row.id === baseParentId);
    if (!parent) redirect(`${BASE}?status=invalid-parent`);
  }

  const taken = new Set((existing ?? []).map((row) => row.slug));
  const byKey = new Map(
    (existing ?? []).map((row) => [`${row.parent_id ?? ""}|${row.name}`, row.id]),
  );
  const nextSort = new Map<string, number>();
  for (const row of existing ?? []) {
    const key = row.parent_id ?? "";
    nextSort.set(key, Math.max(nextSort.get(key) ?? 0, row.sort_order + 1));
  }

  const idByIndex: (string | undefined)[] = [];
  let added = 0;
  let skipped = 0;
  const maxDepth = Math.max(...items.map((item) => item.depth));

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const rows: {
      index: number;
      name: string;
      slug: string;
      parent_id: string | null;
      sort_order: number;
    }[] = [];

    items.forEach((item, index) => {
      if (item.depth !== depth) return;
      const parentId =
        item.parent === null ? baseParentId || null : idByIndex[item.parent] ?? null;
      if (item.parent !== null && !parentId) return;

      const existingId = byKey.get(`${parentId ?? ""}|${item.name}`);
      if (existingId) {
        idByIndex[index] = existingId;
        skipped += 1;
        return;
      }

      const sibKey = parentId ?? "";
      const sort = nextSort.get(sibKey) ?? 0;
      nextSort.set(sibKey, sort + 1);
      rows.push({
        index,
        name: item.name,
        slug: pickSlug({ preferred: item.slug, name: item.name, group, taken }),
        parent_id: parentId,
        sort_order: sort,
      });
    });

    if (rows.length === 0) continue;

    const { data: inserted, error } = await supabase
      .from("categories")
      .insert(
        rows.map((row) => ({
          name: row.name,
          slug: row.slug,
          category_group: group,
          parent_id: row.parent_id,
          sort_order: row.sort_order,
          source: "manual",
        })),
      )
      .select("id, slug");

    if (error) {
      if (error.code === "23514") redirect(`${BASE}?status=invalid-parent`);
      if (error.code === "23505") redirect(`${BASE}?status=slug-exists`);
      throw new Error("Unable to add categories.", { cause: error });
    }

    const idBySlug = new Map((inserted ?? []).map((row) => [row.slug, row.id]));
    for (const row of rows) {
      idByIndex[row.index] = idBySlug.get(row.slug);
      added += 1;
    }
  }

  await logActivity(supabase, "categories_bulk_added", "category", group, {
    added,
    skipped,
  });
  done("bulk-done", `&added=${added}&skipped=${skipped}`);
}
