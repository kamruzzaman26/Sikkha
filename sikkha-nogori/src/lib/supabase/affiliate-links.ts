import "server-only";

import { createSupabasePublicServerClient } from "@/lib/supabase/server";

export type PublicAffiliateLink = {
  id: string;
  url: string;
  partner: string | null;
};

export async function getActiveAffiliateLinks(
  productSlug: string,
): Promise<PublicAffiliateLink[] | null> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("affiliate_links")
    .select("id, url, partner, products!inner(slug)")
    .eq("products.slug", productSlug)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    if (
      ["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code ?? "")
    ) {
      console.error(
        "Affiliate-link migration is missing from the configured database.",
        error,
      );
      return null;
    }
    throw new Error("Unable to load affiliate links for this product.", {
      cause: error,
    });
  }

  return data;
}

export async function getActiveAffiliateLinkMap(
  productSlugs: string[],
): Promise<Record<string, PublicAffiliateLink>> {
  if (productSlugs.length === 0) {
    return {};
  }

  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("affiliate_links")
    .select("id, url, partner, products!inner(slug)")
    .in("products.slug", productSlugs)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Unable to load affiliate links for the catalog.", error);
    return {};
  }

  const linkMap: Record<string, PublicAffiliateLink> = {};
  for (const row of data) {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    if (product && !linkMap[product.slug]) {
      linkMap[product.slug] = { id: row.id, url: row.url, partner: row.partner };
    }
  }
  return linkMap;
}
