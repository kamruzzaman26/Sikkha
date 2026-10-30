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
