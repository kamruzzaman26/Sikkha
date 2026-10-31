import "server-only";

import { createSupabasePublicServerClient } from "@/lib/supabase/server";
import { getCategorySlug, type Book } from "@/lib/books";

export type CatalogProduct = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number | null;
  product_type: string;
  category: string | null;
  author: string | null;
  publisher: string | null;
  image_url: string | null;
  commerce_mode: "affiliate" | "direct" | null;
  created_at: string;
};

function isMissingCatalogSchema(error: { code?: string }): boolean {
  return ["42P01", "42703", "PGRST204", "PGRST205"].includes(
    error.code ?? "",
  );
}

const bookPageSize = 24;
const catalogProductSelection =
  "id, title, slug, description, price, product_type, category, author, publisher, image_url, commerce_mode, archived_at, created_at";

export type PublishedBookPage = {
  products: CatalogProduct[];
  total: number;
};

export type PublishedProductType = {
  slug: string;
  label: string;
};

function normalizeCatalogQuery(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .slice(0, 100)
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getPublishedCourses(): Promise<CatalogProduct[] | null> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      catalogProductSelection,
    )
    .eq("product_type", "course")
    .eq("is_published", true)
    .is("archived_at", null)
    .not("commerce_mode", "is", null)
    .order("title")
    .limit(100);

  if (error) {
    if (isMissingCatalogSchema(error)) {
      console.error(
        "Course catalog migration is missing from the configured database.",
        error,
      );
      return null;
    }
    throw new Error("Unable to load the course catalog.", { cause: error });
  }

  return data;
}

export async function getPublishedCourseBySlug(
  slug: string,
): Promise<CatalogProduct | null | undefined> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      catalogProductSelection,
    )
    .eq("product_type", "course")
    .eq("is_published", true)
    .is("archived_at", null)
    .not("commerce_mode", "is", null)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    if (isMissingCatalogSchema(error)) {
      console.error(
        "Course catalog migration is missing from the configured database.",
        error,
      );
      return null;
    }
    throw new Error("Unable to load the requested course.", { cause: error });
  }

  return data ?? undefined;
}

export async function getPublishedBooks({
  page,
  query,
  category,
  sort,
  pageSize = bookPageSize,
}: {
  page: number;
  query: string;
  category?: string;
  sort: "name-asc" | "name-desc" | "newest" | "price-low" | "price-high";
  pageSize?: number;
}): Promise<PublishedBookPage | null> {
  const supabase = createSupabasePublicServerClient();
  const searchTerm = normalizeCatalogQuery(query);
  const safePageSize = Math.max(1, Math.min(pageSize, 1000));
  let request = supabase
    .from("products")
    .select(catalogProductSelection, { count: "exact" })
    .eq("product_type", "book")
    .eq("is_published", true)
    .is("archived_at", null)
    .not("commerce_mode", "is", null);

  if (searchTerm) {
    const searchFilters = [
      "title",
      "author",
      "publisher",
      "category",
      "description",
    ]
      .map((field) => `${field}.ilike.%${searchTerm}%`)
      .join(",");
    request = request.or(searchFilters);
  }
  if (category) {
    request = request.eq("category", category);
  }

  if (sort === "newest") {
    request = request.order("created_at", { ascending: false });
  } else if (sort === "price-low" || sort === "price-high") {
    request = request.order("price", { ascending: sort === "price-low", nullsFirst: false });
  } else {
    request = request.order("title", { ascending: sort === "name-asc" });
  }

  const { data, count, error } = await request
    .range((page - 1) * safePageSize, page * safePageSize - 1);

  if (error) {
    if (isMissingCatalogSchema(error)) {
      console.error(
        "Product-management migration is missing from the configured database.",
        error,
      );
      return null;
    }
    throw new Error("Unable to load the book catalog.", { cause: error });
  }

  return { products: data, total: count ?? 0 };
}

export async function getPublishedProducts({
  page,
  query,
  category,
  productType,
  sort,
}: {
  page: number;
  query: string;
  category?: string;
  productType?: string;
  sort: "name-asc" | "name-desc";
}): Promise<PublishedBookPage | null> {
  const supabase = createSupabasePublicServerClient();
  const searchTerm = normalizeCatalogQuery(query);
  let request = supabase
    .from("products")
    .select(catalogProductSelection, { count: "exact" })
    .neq("product_type", "book")
    .neq("product_type", "course")
    .eq("is_published", true)
    .is("archived_at", null)
    .not("commerce_mode", "is", null);

  if (productType) {
    request = request.eq("product_type", productType);
  }
  if (searchTerm) {
    const searchFilters = [
      "title",
      "author",
      "publisher",
      "category",
      "description",
    ]
      .map((field) => `${field}.ilike.%${searchTerm}%`)
      .join(",");
    request = request.or(searchFilters);
  }
  if (category) {
    request = request.eq("category", category);
  }

  const { data, count, error } = await request
    .order("title", { ascending: sort === "name-asc" })
    .range((page - 1) * bookPageSize, page * bookPageSize - 1);

  if (error) {
    if (isMissingCatalogSchema(error)) {
      console.error(
        "Product-management migration is missing from the configured database.",
        error,
      );
      return null;
    }
    throw new Error("Unable to load the products catalog.", { cause: error });
  }

  return { products: data, total: count ?? 0 };
}

export async function getPublishedProductBySlug(
  slug: string,
): Promise<CatalogProduct | null | undefined> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(catalogProductSelection)
    .neq("product_type", "book")
    .neq("product_type", "course")
    .eq("is_published", true)
    .is("archived_at", null)
    .not("commerce_mode", "is", null)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    if (isMissingCatalogSchema(error)) {
      console.error(
        "Product-management migration is missing from the configured database.",
        error,
      );
      return null;
    }
    throw new Error("Unable to load the requested product.", { cause: error });
  }

  return data ?? undefined;
}

export async function getPublishedProductTypes(): Promise<
  PublishedProductType[] | null
> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("product_types")
    .select("slug, label")
    .eq("is_active", true)
    .neq("slug", "book")
    .neq("slug", "course")
    .order("label")
    .limit(100);

  if (error) {
    if (isMissingCatalogSchema(error)) {
      console.error(
        "Product-management migration is missing from the configured database.",
        error,
      );
      return null;
    }
    throw new Error("Unable to load public product types.", { cause: error });
  }

  return data;
}

export async function getPublishedProductCategories(): Promise<
  string[] | null
> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("category")
    .neq("product_type", "book")
    .neq("product_type", "course")
    .eq("is_published", true)
    .is("archived_at", null)
    .not("commerce_mode", "is", null)
    .not("category", "is", null)
    .order("category")
    .limit(1000);

  if (error) {
    if (isMissingCatalogSchema(error)) {
      console.error(
        "Product-management migration is missing from the configured database.",
        error,
      );
      return null;
    }
    throw new Error("Unable to load product categories.", { cause: error });
  }

  return [...new Set(data.map(({ category }) => category).filter(Boolean))];
}

export async function getPublishedBookBySlug(
  slug: string,
): Promise<CatalogProduct | null | undefined> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      catalogProductSelection,
    )
    .eq("product_type", "book")
    .eq("is_published", true)
    .is("archived_at", null)
    .not("commerce_mode", "is", null)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    if (isMissingCatalogSchema(error)) {
      console.error(
        "Product-management migration is missing from the configured database.",
        error,
      );
      return null;
    }
    throw new Error("Unable to load the requested book.", { cause: error });
  }

  return data ?? undefined;
}

export async function getPublishedBookCategories(): Promise<string[] | null> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("category")
    .eq("product_type", "book")
    .eq("is_published", true)
    .is("archived_at", null)
    .not("commerce_mode", "is", null)
    .not("category", "is", null)
    .order("category")
    .limit(1000);

  if (error) {
    if (isMissingCatalogSchema(error)) {
      console.error(
        "Product-management migration is missing from the configured database.",
        error,
      );
      return null;
    }
    throw new Error("Unable to load book categories.", { cause: error });
  }

  return [...new Set(data.map(({ category }) => category).filter(Boolean))];
}

export async function getPublishedWishlistProducts(): Promise<
  CatalogProduct[] | null
> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(catalogProductSelection)
    .eq("is_published", true)
    .is("archived_at", null)
    .not("commerce_mode", "is", null)
    .order("title")
    .limit(1000);

  if (error) {
    if (isMissingCatalogSchema(error)) {
      console.error(
        "Product-management migration is missing from the configured database.",
        error,
      );
      return null;
    }
    throw new Error("Unable to load public products for the wishlist.", {
      cause: error,
    });
  }

  return data;
}

export function toCatalogBook(product: CatalogProduct): Book {
  const category = product.category ?? "";

  return {
    slug: product.slug,
    title: product.title,
    author: product.author ?? "",
    publisher: product.publisher ?? "",
    category,
    categorySlug: getCategorySlug(category),
    price: product.price,
    discountedPrice: null,
    description: product.description,
    cover: "",
    coverAccent: "bg-emerald-800",
    collections: [],
    productId: product.id,
    imageUrl: product.image_url,
    commerceMode: product.commerce_mode,
  };
}
