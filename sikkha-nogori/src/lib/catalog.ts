import "server-only";

import { createSupabasePublicServerClient } from "@/lib/supabase/server";
import { getCategorySlug, type Book } from "@/lib/books";
import { collectCategoryIds, rootCategoryCounts } from "@/lib/category-tree.mjs";

export type CatalogProduct = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number | null;
  list_price: number | null;
  edition: string | null;
  isbn: string | null;
  page_count: number | null;
  language: string | null;
  country: string | null;
  weight_kg: number | string | null;
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
  "id, title, slug, description, price, list_price, edition, isbn, page_count, language, country, weight_kg, product_type, category, author, publisher, image_url, commerce_mode, archived_at, created_at";

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

const emptyUuid = "00000000-0000-0000-0000-000000000000";

async function getBookCategoryProductIds(
  supabase: ReturnType<typeof createSupabasePublicServerClient>,
  category: string,
): Promise<string[] | null> {
  const { data: rows, error } = await supabase
    .from("categories")
    .select("id, parent_id, name")
    .eq("category_group", "books")
    .eq("is_active", true)
    .limit(1000);
  if (error || !rows) {
    return null;
  }

  const categoryIds = collectCategoryIds(rows, category);
  if (categoryIds.length === 0) {
    return null;
  }

  const { data: links, error: linkError } = await supabase
    .from("product_categories")
    .select("product_id")
    .in("category_id", categoryIds)
    .limit(1000);
  if (linkError || !links) {
    return null;
  }

  return [...new Set(links.map((link) => link.product_id as string))];
}

export type PublishedBookFilters = {
  categories?: string[];
  authors?: string[];
  publishers?: string[];
  languages?: string[];
};

export async function getPublishedBooks({
  page,
  query,
  category,
  filters,
  sort,
  pageSize = bookPageSize,
}: {
  page: number;
  query: string;
  category?: string;
  filters?: PublishedBookFilters;
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
  const selectedCategories = filters?.categories?.length
    ? filters.categories
    : category
      ? [category]
      : [];
  if (selectedCategories.length > 0) {
    const categoryIds = await Promise.all(
      selectedCategories.map((name) => getBookCategoryProductIds(supabase, name)),
    );
    if (categoryIds.some((ids) => ids === null)) {
      request = request.in("category", selectedCategories);
    } else {
      const { data: legacyRows } = await supabase
        .from("products")
        .select("id")
        .in("category", selectedCategories)
        .limit(1000);
      const ids = [
        ...new Set([
          ...categoryIds.flatMap((ids) => ids ?? []),
          ...(legacyRows ?? []).map((row) => row.id as string),
        ]),
      ];
      request = request.in("id", ids.length > 0 ? ids : [emptyUuid]);
    }
  }
  if (filters?.authors?.length) {
    request = request.in("author", filters.authors);
  }
  if (filters?.publishers?.length) {
    request = request.in("publisher", filters.publishers);
  }
  if (filters?.languages?.length) {
    request = request.in("language", filters.languages);
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

async function getProductCategoryProductIds(
  supabase: ReturnType<typeof createSupabasePublicServerClient>,
  category: string,
): Promise<string[] | null> {
  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .select("id, parent_id, name")
    .in("category_group", ["products", "electronics"])
    .eq("is_active", true)
    .limit(1000);

  if (categoryError || !categories) return null;
  const categoryIds = collectCategoryIds(categories, category);
  const linkedIds: string[] = [];

  if (categoryIds.length > 0) {
    const { data: links, error: linksError } = await supabase
      .from("product_categories")
      .select("product_id")
      .in("category_id", categoryIds)
      .limit(5000);
    if (linksError || !links) return null;
    linkedIds.push(...links.map((link) => link.product_id as string));
  }

  const { data: legacyRows, error: legacyError } = await supabase
    .from("products")
    .select("id")
    .eq("category", category)
    .limit(1000);
  if (legacyError || !legacyRows) return null;

  return [...new Set([
    ...linkedIds,
    ...legacyRows.map((row) => row.id as string),
  ])];
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
    const categoryProductIds = await getProductCategoryProductIds(supabase, category);
    request = categoryProductIds === null
      ? request.eq("category", category)
      : request.in("id", categoryProductIds.length > 0 ? categoryProductIds : [emptyUuid]);
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

async function getTaxonomyBookCategoryNames(
  supabase: ReturnType<typeof createSupabasePublicServerClient>,
): Promise<string[]> {
  const [categoriesResult, linksResult, productsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, parent_id, name, sort_order")
      .eq("category_group", "books")
      .eq("is_active", true)
      .limit(1000),
    supabase.from("product_categories").select("category_id, product_id").limit(5000),
    supabase
      .from("products")
      .select("id")
      .eq("product_type", "book")
      .eq("is_published", true)
      .is("archived_at", null)
      .not("commerce_mode", "is", null)
      .limit(5000),
  ]);

  if (
    categoriesResult.error ||
    linksResult.error ||
    productsResult.error ||
    !categoriesResult.data ||
    !linksResult.data ||
    !productsResult.data
  ) {
    return [];
  }

  const publishedIds = new Set(productsResult.data.map((row) => row.id as string));
  const links = linksResult.data.filter((link) => publishedIds.has(link.product_id));
  return rootCategoryCounts(categoriesResult.data, links).map(({ name }) => name);
}

export type PublishedBookFacets = {
  categories: string[];
  authors: string[];
  publishers: string[];
  languages: string[];
};

export async function getPublishedBookFacets(): Promise<PublishedBookFacets> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("category, author, publisher, language")
    .eq("product_type", "book")
    .eq("is_published", true)
    .is("archived_at", null)
    .not("commerce_mode", "is", null)
    .limit(5000);

  if (error || !data) {
    console.error("Unable to load book filter options.", error);
    return { categories: [], authors: [], publishers: [], languages: [] };
  }

  const unique = (values: (string | null)[]) =>
    [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))]
      .sort((left, right) => left.localeCompare(right, "bn", { sensitivity: "base" }));

  return {
    categories: unique(data.map((item) => item.category)),
    authors: unique(data.map((item) => item.author)),
    publishers: unique(data.map((item) => item.publisher)),
    languages: unique(data.map((item) => item.language)),
  };
}

export async function getPublishedBookCategories(): Promise<string[] | null> {
  const supabase = createSupabasePublicServerClient();
  const taxonomyNames = await getTaxonomyBookCategoryNames(supabase);
  if (taxonomyNames.length > 0) {
    return taxonomyNames;
  }

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
    listPrice: product.list_price ?? null,
    edition: product.edition,
    isbn: product.isbn,
    pageCount: product.page_count,
    language: product.language,
    country: product.country,
    weightKg:
      product.weight_kg === null || product.weight_kg === undefined
        ? null
        : Number(product.weight_kg),
    description: product.description,
    cover: "",
    coverAccent: "bg-emerald-800",
    collections: [],
    productId: product.id,
    imageUrl: product.image_url,
    commerceMode: product.commerce_mode,
  };
}

export async function getPublishedBookSlugs(): Promise<
  { slug: string; updated_at: string | null }[]
> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("product_type", "book")
    .eq("is_published", true)
    .is("archived_at", null)
    .not("commerce_mode", "is", null)
    .limit(5000);

  if (error) {
    console.error("Unable to load book slugs for the sitemap.", error);
    return [];
  }

  return data ?? [];
}
