import type { MetadataRoute } from "next";
import { getPublicSiteOrigin } from "@/lib/supabase/env";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicSiteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/account",
        "/dashboard",
        "/checkout",
        "/login",
        "/register",
        "/api/",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
