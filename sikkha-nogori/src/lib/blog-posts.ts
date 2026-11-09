import "server-only";

import { blogArticles } from "@/lib/blog";
import { plainText, readingMinutes } from "@/lib/blog-content";
import { createSupabasePublicServerClient } from "@/lib/supabase/server";

export type PublicPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  category: string;
  categoryId: string;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string | null;
  updatedAt: string | null;
  minutes: number;
};

type Row = {
  slug: string; title: string; excerpt: string | null; content: string;
  featured_image_path: string | null; category_id: string | null;
  seo_title: string | null; seo_description: string | null;
  published_at: string | null; updated_at: string | null;
};

const columns = "slug,title,excerpt,content,featured_image_path,category_id,seo_title,seo_description,published_at,updated_at";

export function safeImageUrl(value: string | null | undefined): string {
  return value && /^https:\/\/\S+$/.test(value) ? value : "";
}

function toPost(row: Row, categories: Map<string, string>): PublicPost {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt?.trim() || plainText(row.content).slice(0, 160),
    content: row.content,
    coverUrl: safeImageUrl(row.featured_image_path),
    category: row.category_id ? categories.get(row.category_id) ?? "" : "",
    categoryId: row.category_id ?? "",
    seoTitle: row.seo_title?.trim() ?? "",
    seoDescription: row.seo_description?.trim() ?? "",
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    minutes: readingMinutes(row.content),
  };
}

async function loadCategories(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const supabase = createSupabasePublicServerClient();
  const { data } = await supabase.from("categories").select("id,name").in("id", unique);
  return new Map((data ?? []).map((c) => [c.id as string, c.name as string]));
}

/** Old hard-coded starter articles, shown only while no article has been published. */
function starterPosts(): PublicPost[] {
  return blogArticles.map((article) => {
    const content = article.sections
      .map((s) => `## ${s.heading}\n\n${s.paragraphs.join("\n\n")}`)
      .join("\n\n");
    return {
      slug: article.slug, title: article.title, excerpt: article.description, content,
      coverUrl: "", category: article.category, categoryId: "", seoTitle: "", seoDescription: "",
      publishedAt: null, updatedAt: null, minutes: readingMinutes(content),
    };
  });
}

export async function getPublishedPosts(limit = 60): Promise<PublicPost[]> {
  try {
    const supabase = createSupabasePublicServerClient();
    const { data, error } = await supabase
      .from("posts").select(columns).eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false }).limit(limit);
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    if (rows.length === 0) return starterPosts();
    const categories = await loadCategories(rows.map((r) => r.category_id ?? ""));
    return rows.map((row) => toPost(row, categories));
  } catch (error) {
    console.error("Unable to load blog posts.", error);
    return starterPosts();
  }
}

export async function getPublishedPostBySlug(slug: string): Promise<PublicPost | null> {
  try {
    const supabase = createSupabasePublicServerClient();
    const { data, error } = await supabase
      .from("posts").select(columns).eq("status", "published").eq("slug", slug).maybeSingle();
    if (error) throw error;
    if (data) {
      const row = data as Row;
      return toPost(row, await loadCategories([row.category_id ?? ""]));
    }
  } catch (error) {
    console.error("Unable to load the blog post.", error);
  }
  return starterPosts().find((p) => p.slug === slug) ?? null;
}

export async function getPostSitemapEntries(): Promise<{ slug: string; updated: string | null }[]> {
  try {
    const supabase = createSupabasePublicServerClient();
    const { data } = await supabase.from("posts").select("slug,updated_at,published_at").eq("status", "published").limit(5000);
    return (data ?? []).map((r) => ({ slug: r.slug as string, updated: (r.updated_at ?? r.published_at) as string | null }));
  } catch {
    return [];
  }
}

export function formatPostDate(value: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", dateStyle: "long" }).format(new Date(value));
}
