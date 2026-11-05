import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getPublishedBookSlugs } from "@/lib/catalog";
import { getPublicSiteOrigin } from "@/lib/supabase/env";

const staticPaths = [
  "",
  "/books",
  "/about",
  "/contact",
  "/blog",
  "/affiliate-disclosure",
  "/privacy",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const origin = getPublicSiteOrigin();
  const books = await getPublishedBookSlugs();

  return [
    ...staticPaths.map((path) => ({ url: `${origin}${path}` })),
    ...books.map((book) => ({
      url: `${origin}/books/${encodeURIComponent(book.slug)}`,
      ...(book.updated_at ? { lastModified: new Date(book.updated_at) } : {}),
    })),
  ];
}
