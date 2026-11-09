import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getPublishedBookSlugs } from "@/lib/catalog";
import { getPostSitemapEntries } from "@/lib/blog-posts";
import { getSiteSettings, resolveSiteOrigin } from "@/lib/site-settings";
import { createSupabasePublicServerClient } from "@/lib/supabase/server";

const staticPaths: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/books", priority: 0.9, changeFrequency: "daily" },
  { path: "/courses", priority: 0.8, changeFrequency: "weekly" },
  { path: "/products", priority: 0.8, changeFrequency: "weekly" },
  { path: "/blog", priority: 0.8, changeFrequency: "daily" },
  { path: "/category/islamic-books", priority: 0.6, changeFrequency: "weekly" },
  { path: "/category/arabic-learning", priority: 0.6, changeFrequency: "weekly" },
  { path: "/category/education", priority: 0.6, changeFrequency: "weekly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
  { path: "/affiliate-disclosure", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

async function otherProducts() {
  try {
    const supabase = createSupabasePublicServerClient();
    const { data } = await supabase
      .from("products")
      .select("slug, product_type, updated_at")
      .eq("is_published", true)
      .is("archived_at", null)
      .neq("product_type", "book")
      .limit(5000);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const { seo } = await getSiteSettings();
  const origin = resolveSiteOrigin(seo);
  if (!origin) return [];
  const [books, products, posts] = await Promise.all([getPublishedBookSlugs(), otherProducts(), getPostSitemapEntries()]);
  const modified = (value: string | null | undefined) => (value ? { lastModified: new Date(value) } : {});

  return [
    ...staticPaths.map(({ path, priority, changeFrequency }) => ({ url: `${origin}${path}`, priority, changeFrequency })),
    ...books.map((book) => ({ url: `${origin}/books/${encodeURIComponent(book.slug)}`, priority: 0.7, changeFrequency: "weekly" as const, ...modified(book.updated_at) })),
    ...products.map((p) => ({
      url: `${origin}/${p.product_type === "course" ? "courses" : "products"}/${encodeURIComponent(p.slug as string)}`,
      priority: 0.7, changeFrequency: "weekly" as const, ...modified(p.updated_at as string | null),
    })),
    ...posts.map((post) => ({ url: `${origin}/blog/${encodeURIComponent(post.slug)}`, priority: 0.6, changeFrequency: "monthly" as const, ...modified(post.updated) })),
  ];
}
