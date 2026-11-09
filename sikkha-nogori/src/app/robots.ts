import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getSiteSettings, resolveSiteOrigin } from "@/lib/site-settings";

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  const { seo } = await getSiteSettings();
  const origin = resolveSiteOrigin(seo);

  // "Allow search indexing" switched off in Admin → SEO: ask crawlers to stay away.
  if (!seo.index) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/dashboard", "/checkout", "/cart", "/login", "/register", "/api/", "/r/"],
    },
    ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}
