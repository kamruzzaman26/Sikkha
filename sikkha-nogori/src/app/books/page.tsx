import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import BookCard from "@/components/book-card";
import { getActiveAffiliateLinkMap } from "@/lib/supabase/affiliate-links";
import MobileCatalogFilters from "@/components/mobile-catalog-filters";
import {
  bookCategories,
  books,
} from "@/lib/books";
import {
  getBookFacets,
  getPublishedBookCategories,
  getPublishedBooks,
  type BookSort,
  toCatalogBook,
} from "@/lib/catalog";

type BookSearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  page?: string | string[];
  sort?: string | string[];
  instock?: string | string[];
  author?: string | string[];
  publisher?: string | string[];
  language?: string | string[];
  brand?: string | string[];
  tag?: string | string[];
  collection?: string | string[];
  minPrice?: string | string[];
  maxPrice?: string | string[];
  discount?: string | string[];
}>;

function amountValue(value: string | string[] | undefined, max: number): string {
  const number = Number.parseInt(Array.isArray(value) ? (value[0] ?? "") : (value ?? ""), 10);
  return Number.isSafeInteger(number) && number > 0 && number <= max ? String(number) : "";
}

function listValue(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values.map((item) => item.trim().slice(0, 160)).filter(Boolean))].slice(0, 50);
}

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function BookResults({
  searchParams,
}: {
  searchParams: BookSearchParams;
}) {
  const params = await searchParams;
  const query = firstValue(params.q).trim().slice(0, 100);
  const categoryParam = firstValue(params.category).slice(0, 120);
  if (categoryParam === "শিক্ষা কুইজ" || categoryParam === "education-quiz") redirect("/quiz");
  const legacyCategory = bookCategories.find(
    (item) => item.slug === categoryParam,
  );
  const category =
    legacyCategory && !books.some((book) => book.category === categoryParam)
      ? books.find((book) => book.categorySlug === categoryParam)?.category ??
        legacyCategory.title
      : categoryParam;
  const sortValue = firstValue(params.sort);
  const sort: BookSort = ["name-desc", "newest", "best-seller", "price-low", "price-high", "discount-high", "discount-low"].includes(sortValue)
    ? (sortValue as BookSort)
    : "name-asc";
  const inStock = firstValue(params.instock) === "1";
  const authors = listValue(params.author);
  const publishers = listValue(params.publisher);
  const languages = listValue(params.language);
  const brands = listValue(params.brand);
  const tags = listValue(params.tag);
  const collection = firstValue(params.collection).trim().slice(0, 160);
  const minPrice = amountValue(params.minPrice, 10_000_000);
  const maxPrice = amountValue(params.maxPrice, 10_000_000);
  const minDiscount = amountValue(params.discount, 100);
  const filterCount = (category ? 1 : 0) + (inStock ? 1 : 0) + authors.length + publishers.length + languages.length +
    brands.length + tags.length + (collection ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (minDiscount ? 1 : 0);
  const pageValue = Number.parseInt(firstValue(params.page), 10);
  const page =
    Number.isSafeInteger(pageValue) && pageValue > 0 && pageValue <= 100000
      ? pageValue
      : 1;
  const [bookPage, databaseCategories, facets] = await Promise.all([
    getPublishedBooks({ page, query, category: category || undefined, sort, inStock, authors, publishers, languages, brands, tags, collection: collection || undefined, minPrice: minPrice ? Number(minPrice) : undefined, maxPrice: maxPrice ? Number(maxPrice) : undefined, minDiscount: minDiscount ? Number(minDiscount) : undefined }),
    getPublishedBookCategories(),
    getBookFacets(),
  ]);
  const availableBooks =
    bookPage === null ? books : bookPage.products.map(toCatalogBook);
  const normalizedQuery = query.toLocaleLowerCase("bn");
  const localMatches =
    bookPage === null
      ? availableBooks.filter((book) => {
          const matchesQuery =
            !normalizedQuery ||
            book.title.toLocaleLowerCase("bn").includes(normalizedQuery) ||
            book.author.toLocaleLowerCase("bn").includes(normalizedQuery) ||
            book.publisher.toLocaleLowerCase("bn").includes(normalizedQuery) ||
            book.category.toLocaleLowerCase("bn").includes(normalizedQuery) ||
            book.description.toLocaleLowerCase("bn").includes(normalizedQuery);

          return matchesQuery && (!category || book.category === category);
        })
      : availableBooks;
  const matchingBooks =
    bookPage === null
      ? localMatches.sort((left, right) => {
          if (sort === "price-low" || sort === "price-high") {
            const leftPrice = left.discountedPrice ?? left.price ?? Number.MAX_SAFE_INTEGER;
            const rightPrice = right.discountedPrice ?? right.price ?? Number.MAX_SAFE_INTEGER;
            return sort === "price-low" ? leftPrice - rightPrice : rightPrice - leftPrice;
          }
          return sort === "name-desc"
            ? right.title.localeCompare(left.title, "bn", { sensitivity: "base" })
            : left.title.localeCompare(right.title, "bn", { sensitivity: "base" });
        })
      : localMatches;
  const affiliateLinkMap = await getActiveAffiliateLinkMap(
    matchingBooks
      .filter((book) => book.commerceMode === "affiliate")
      .map((book) => book.slug),
  );
  const total = bookPage?.total ?? matchingBooks.length;
  const pageCount = Math.max(1, Math.ceil(total / 24));
  const categoryNames = databaseCategories ?? [
    ...new Set(books.map((book) => book.category)),
  ];
  const knownCategories = bookCategories
    .map((item) => {
      const sampleName = books.find(
        (book) => book.categorySlug === item.slug,
      )?.category;
      const categoryName =
        sampleName ?? (categoryNames.includes(item.title) ? item.title : null);

      return categoryName
        ? { label: item.title, value: categoryName }
        : null;
    })
    .filter((item) => item !== null);
  const knownCategoryValues = new Set(
    knownCategories.map((item) => item.value),
  );
  const categoryOptions = [
    ...knownCategories,
    ...categoryNames
      .filter((name) => !knownCategoryValues.has(name))
      .map((name) => ({ label: name, value: name })),
  ];
  const pageHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (category) search.set("category", category);
    if (sort !== "name-asc") search.set("sort", sort);
    if (inStock) search.set("instock", "1");
    authors.forEach((value) => search.append("author", value));
    publishers.forEach((value) => search.append("publisher", value));
    languages.forEach((value) => search.append("language", value));
    brands.forEach((value) => search.append("brand", value));
    tags.forEach((value) => search.append("tag", value));
    if (collection) search.set("collection", collection);
    if (minPrice) search.set("minPrice", minPrice);
    if (maxPrice) search.set("maxPrice", maxPrice);
    if (minDiscount) search.set("discount", minDiscount);
    if (nextPage > 1) search.set("page", String(nextPage));
    const suffix = search.toString();
    return suffix ? `/books?${suffix}` : "/books";
  };

  return (
    <div className="mx-auto max-w-7xl">
        {bookPage === null && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
          >
            ডেটাবেস ক্যাটালগ চালু না থাকায় নিচে কেবল নমুনা বই দেখানো হচ্ছে।
          </p>
        )}

        <section className="mt-2 space-y-5">
          <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
            <div>
              <MobileCatalogFilters
                categories={categoryOptions}
                state={{ query, category, sort, inStock, authors, publishers, languages, brands, tags, collection, minPrice, maxPrice, minDiscount }}
                facets={facets}
              />
            </div>
            <nav aria-label="Quick book categories" className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <Link href="/books" className={`whitespace-nowrap rounded-full px-4 py-2 font-semibold transition ${!category ? "bg-emerald-700 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"}`}>All Books</Link>
              {categoryOptions.slice(0, 8).map((option) => (
                <Link key={option.value} href={`/books?${new URLSearchParams({ ...(query ? { q: query } : {}), category: option.value }).toString()}`} aria-current={category === option.value ? "page" : undefined} className={`whitespace-nowrap rounded-full px-4 py-2 font-semibold transition ${category === option.value ? "bg-emerald-700 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"}`}>
                  {option.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className="text-sm font-medium text-slate-600">
              Showing <span className="font-bold text-slate-900">{total}</span> {bookPage === null ? "sample " : ""}{total === 1 ? "book" : "books"}
              {query ? ` · “${query}”` : ""}
            </p>
            {(query || filterCount > 0 || sort !== "name-asc") && (
              <Link href="/books" className="text-sm font-semibold text-emerald-800 hover:underline">Clear filters</Link>
            )}
          </div>

          {matchingBooks.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {matchingBooks.map((book) => (
                  <BookCard key={book.slug} book={book} buyLink={affiliateLinkMap[book.slug] ?? null} />
                ))}
              </div>
              {pageCount > 1 && (
                <nav aria-label="বইয়ের পৃষ্ঠা" className="mt-8 flex items-center justify-center gap-3">
                  {page > 1 && <Link href={pageHref(page - 1)} className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50">আগের পৃষ্ঠা</Link>}
                  <span aria-current="page" className="text-sm text-slate-600">{page} / {pageCount}</span>
                  {page < pageCount && <Link href={pageHref(page + 1)} className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50">পরের পৃষ্ঠা</Link>}
                </nav>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
              <h2 className="text-xl font-bold">{category ? `${category} বিভাগে এখনো কোনো প্রকাশিত বই নেই` : "এখনো কোনো বই প্রকাশিত হয়নি"}</h2>
              <p className="mt-2 text-sm text-slate-600">{category ? "এই বিভাগে বই প্রকাশিত হলে এখানে দেখা যাবে।" : "বই যোগ ও প্রকাশিত হলে এখানে দেখা যাবে।"}</p>
              <Link href="/books" className="mt-5 inline-flex rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">সব বই দেখুন</Link>
            </div>
          )}
        </section>
    </div>
  );
}

export default function BooksPage({
  searchParams,
}: {
  searchParams: BookSearchParams;
}) {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-900 sm:px-6 sm:py-12 lg:px-8">
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl" aria-label="বই লোড হচ্ছে">
            <div className="h-8 w-56 animate-pulse rounded bg-emerald-100" />
            <div className="mt-6 h-28 animate-pulse rounded-2xl bg-white" />
            <div className="mt-8 h-72 animate-pulse rounded-2xl bg-white" />
          </div>
        }
      >
        <BookResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
