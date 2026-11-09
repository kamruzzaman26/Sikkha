"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity, requirePermission } from "@/lib/supabase/admin";

const BASE = "/admin/blog";

function value(data: FormData, key: string) {
  const raw = data.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function validSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function finish(status: string): never {
  revalidatePath(BASE);
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  revalidatePath("/sitemap.xml");
  redirect(`${BASE}?status=${status}`);
}

export async function saveBlogPost(formData: FormData) {
  const { supabase } = await requirePermission("manage_blog", "/admin/dashboard");
  const id = value(formData, "id");
  const title = value(formData, "title");
  const slug = value(formData, "slug");
  const excerpt = value(formData, "excerpt");
  const content = String(formData.get("content") ?? "").trim();
  const seoTitle = value(formData, "seoTitle");
  const seoDescription = value(formData, "seoDescription");
  const categoryId = value(formData, "categoryId");
  const status = value(formData, "status");
  const coverUrl = value(formData, "coverUrl");
  const publishAtRaw = value(formData, "publishAt");

  if (
    (id && !/^[0-9a-f-]{36}$/i.test(id)) ||
    title.length < 3 || title.length > 180 ||
    !validSlug(slug) || slug.length > 180 ||
    excerpt.length > 500 || content.length > 50000 ||
    seoTitle.length > 200 || seoDescription.length > 320 ||
    !["draft", "published", "archived"].includes(status) ||
    (categoryId && !/^[0-9a-f-]{36}$/i.test(categoryId)) ||
    (coverUrl && !/^https:\/\/\S+$/.test(coverUrl)) || coverUrl.length > 1000 ||
    (publishAtRaw && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(publishAtRaw))
  ) redirect(`${BASE}?status=invalid`);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Dhaka is UTC+6 all year. An empty date means "now" for a first publish.
  const scheduled = publishAtRaw ? new Date(`${publishAtRaw}:00+06:00`) : null;
  if (scheduled && Number.isNaN(scheduled.getTime())) redirect(`${BASE}?status=invalid`);

  let existingPublishedAt: string | null = null;
  if (id) {
    const { data: current } = await supabase.from("posts").select("published_at").eq("id", id).maybeSingle();
    existingPublishedAt = (current?.published_at as string | null) ?? null;
  }
  // Keep the original publish date on later edits; only set it when first published.
  const publishedAt =
    status === "published"
      ? (scheduled ? scheduled.toISOString() : existingPublishedAt ?? new Date().toISOString())
      : existingPublishedAt;

  const payload = {
    title, slug, excerpt: excerpt || null, content,
    featured_image_path: coverUrl || null,
    seo_title: seoTitle || null,
    seo_description: seoDescription || null,
    category_id: categoryId || null,
    status,
    published_at: publishedAt,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabase.from("posts").update(payload).eq("id", id).select("id").maybeSingle();
    if (error) {
      if (error.code === "23505") redirect(`${BASE}?status=slug-exists`);
      throw new Error("Unable to update the blog post.", { cause: error });
    }
    if (!data) redirect(`${BASE}?status=not-found`);
    await logActivity(supabase, "blog_post_updated", "post", id, { title, status });
    finish("updated");
  }

  const { data, error } = await supabase.from("posts").insert({
    ...payload,
    author_id: user.id,
  }).select("id").single();

  if (error) {
    if (error.code === "23505") redirect(`${BASE}?status=slug-exists`);
    throw new Error("Unable to create the blog post.", { cause: error });
  }
  await logActivity(supabase, "blog_post_created", "post", data.id, { title, status });
  finish("created");
}

export async function archiveBlogPost(formData: FormData) {
  const { supabase } = await requirePermission("manage_blog", "/admin/dashboard");
  const id = value(formData, "id");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect(`${BASE}?status=invalid`);
  const { data, error } = await supabase.from("posts").update({
    status: "archived",
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("id").maybeSingle();
  if (error) throw new Error("Unable to archive the blog post.", { cause: error });
  if (!data) redirect(`${BASE}?status=not-found`);
  await logActivity(supabase, "blog_post_archived", "post", id);
  finish("archived");
}
