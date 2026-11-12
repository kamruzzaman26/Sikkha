import "server-only";

import { createSupabasePublicServerClient } from "@/lib/supabase/server";
import { getPublishedProductsByIds, getRuleProducts, type CatalogProduct } from "@/lib/catalog";

export type Listing = {
  id: string;
  kind: "collection" | "list";
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  seoTitle?: string | null;
  products: CatalogProduct[];
};

type CollectionRow = {
  id: string; name: string; slug: string; description: string | null; cover_image_url: string | null;
  kind: "manual" | "rule"; rule: Record<string, number | string> | null;
};
type ListRow = { id: string; title: string; slug: string; description: string | null; cover_image_url: string | null };

const SLUG = /^[^\s/]{1,160}$/;

async function manualProducts(table: "product_collections" | "curated_list_products", fk: string, id: string, limit: number) {
  const supabase = createSupabasePublicServerClient();
  const { data } = await supabase.from(table).select("product_id, position").eq(fk, id).order("position").limit(200);
  const ids = ((data ?? []) as Array<{ product_id: string }>).map((row) => row.product_id);
  if (ids.length === 0) return [];
  // Row Level Security already hides draft or archived products; the helper also filters and dedupes.
  const page = await getPublishedProductsByIds(ids, 1, ids);
  return page.products.slice(0, limit);
}

async function collectionProducts(row: CollectionRow, limit: number) {
  if (row.kind === "rule") {
    const rule = row.rule ?? {};
    return (await getRuleProducts({
      sort: String(rule.sort ?? "newest"),
      limit: Math.min(limit, Number(rule.limit ?? 12) || 12),
      min_discount: Number(rule.min_discount ?? 0),
      window_days: Number(rule.window_days ?? 0),
    }));
  }
  return manualProducts("product_collections", "collection_id", row.id, limit);
}

const collectionSelect = "id, name, slug, description, cover_image_url, kind, rule";
const listSelect = "id, title, slug, description, cover_image_url";

export async function getCollectionBySlug(slug: string): Promise<Listing | null> {
  if (!SLUG.test(slug)) return null;
  const supabase = createSupabasePublicServerClient();
  // RLS only returns published collections that are inside their start/end window.
  const { data } = await supabase.from("collections").select(collectionSelect).eq("slug", slug).maybeSingle();
  if (!data) return null;
  const row = data as CollectionRow;
  return { id: row.id, kind: "collection", title: row.name, slug: row.slug, description: row.description, coverUrl: row.cover_image_url, products: await collectionProducts(row, 48) };
}

export async function getListBySlug(slug: string): Promise<Listing | null> {
  if (!SLUG.test(slug)) return null;
  const supabase = createSupabasePublicServerClient();
  const { data } = await supabase.from("curated_lists").select(listSelect).eq("slug", slug).maybeSingle();
  if (!data) return null;
  const row = data as ListRow;
  return { id: row.id, kind: "list", title: row.title, slug: row.slug, description: row.description, coverUrl: row.cover_image_url, products: await manualProducts("curated_list_products", "list_id", row.id, 48) };
}

/** Homepage rows: collections shown on the homepage first, then curated lists. Empty ones are skipped. */
export async function getHomepageListings(): Promise<Listing[]> {
  const supabase = createSupabasePublicServerClient();
  const [collections, lists] = await Promise.all([
    supabase.from("collections").select(collectionSelect).eq("display_position", "homepage").order("sort_order").limit(6),
    supabase.from("curated_lists").select(listSelect).eq("show_on_homepage", true).order("sort_order").limit(6),
  ]);
  const built = await Promise.all([
    ...((collections.data ?? []) as CollectionRow[]).map(async (row): Promise<Listing> => ({
      id: row.id, kind: "collection", title: row.name, slug: row.slug, description: row.description, coverUrl: row.cover_image_url, products: await collectionProducts(row, 10),
    })),
    ...((lists.data ?? []) as ListRow[]).map(async (row): Promise<Listing> => ({
      id: row.id, kind: "list", title: row.title, slug: row.slug, description: row.description, coverUrl: row.cover_image_url, products: await manualProducts("curated_list_products", "list_id", row.id, 10),
    })),
  ]);
  return built.filter((listing) => listing.products.length > 0);
}
