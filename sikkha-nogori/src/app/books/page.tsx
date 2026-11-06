import Link from "next/link";
import { Suspense } from "react";
import BookCard from "@/components/book-card";
import { getActiveAffiliateLinkMap } from "@/lib/supabase/affiliate-links";
import BooksShopControls from "@/components/books-shop-controls";
import {
  bookCategories,
  books,
} from "@/lib/books";
import {
  getPublishedBookCategories,
  getPublishedBookFacets,
  getPublishedBooks,
  toCatalogBook,
} from "@/lib/catalog";

type BookSearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  author?: string | string[];
  publisher?: string | string[];
  language?: string | string[];
  page?: string | string[];
  sort?: string | string[];
}>;

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
  const categoryParams = allValues(params.category).map((categoryParam) => {
    const legacyCategory = bookCategories.find((item) => item.slug === categoryParam);
    return legacyCategory && !books.some((book) => book.category === categoryParam)
      ? books.find((book) => book.categorySlug === categoryParam)?.category ?? legacyCategory.title
      : categoryParam;
  });
  const filters = {
    categories: categoryParams,
    authors: allValues(params.author),
    publishers: allValues(params.publisher),
    languages: allValues(params.language),
  };
  const category = categoryParams[0] ?? "";
  const sortValue = firstValue(params.sort);
  const sort = ["name-desc", "newest", "price-low", "price-high"].includes(sortValue)
    ? (sortValue as "name-desc" | "newest" | "price-low" | "price-high")
    : "name-asc";
  const pageValue = Number.parseInt(firstValue(params.page), 10);
  const page =
    Number.isSafeInteger(pageValue) && pageValue > 0 && pageValue <= 100000
      ? pageValue
      : 1;
  const [bookPage, databaseCategories, facets] = await Promise.all([
    getPublishedBooks({ page, query, filters, sort }),
    getPublishedBookCategories(),
    getPublishedBookFacets(),
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

          return matchesQuery &&
            (!filters.categories.length || filters.categories.includes(book.category)) &&
            (!filters.authors.length || filters.authors.includes(book.author)) &&
            (!filters.publishers.length || filters.publishers.includes(book.publisher)) &&
            (!filters.languages.length || filters.languages.includes(book.language ?? ""));
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
  const categoryNames = [...new Set([
    ...(databaseCategories ?? []),
    ...facets.categories,
    ...books.map((book) => book.category),
  ])];
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
  const currentCategoryLabel =
    categoryOptions.find((item) => item.value === category)?.label ??
    "বইয়ের সংগ্রহ";
  const pageHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    filters.categories.forEach((value) => search.append("category", value));
    filters.authors.forEach((value) => search.append("author", value));
    filters.publishers.forEach((value) => search.append("publisher", value));
    filters.languages.forEach((value) => search.append("language", value));
    if (sort !== "name-asc") search.set("sort", sort);
    if (nextPage > 1) search.set("page", String(nextPage));
    const suffix = search.toString();
    return suffix ? `/books?${suffix}` : "/books";
  };

  return (
    <div className="mx-auto max-w-7xl">
        <nav aria-label="পথনির্দেশ" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-emerald-800 hover:underline">
            হোম
          </Link>
          <span className="px-2" aria-hidden="true">
            /
          </span>
          <span>{currentCategoryLabel}</span>
        </nav>

        <header className="mt-6">
          <p className="text-sm font-bold text-emerald-700">শিক্ষা নগরী</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            বইয়ের সংগ্রহ
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            নাম, লেখক/ব্র্যান্ড, প্রকাশক, বিভাগ বা বিবরণ দিয়ে খুঁজুন।
          </p>
        </header>

        {bookPage === null && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
          >
            ডেটাবেস ক্যাটালগ চালু না থাকায় নিচে কেবল নমুনা বই দেখানো হচ্ছে।
          </p>
        )}

        <section className="mt-6 space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
            <form action="/books" method="get" className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="book-query" className="sr-only">বই, লেখক বা প্রকাশক খুঁজুন</label>
              <input id="book-query" name="q" type="search" defaultValue={query} placeholder="বই, লেখক বা প্রকাশনীর নাম খুঁজুন..." className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
              <button type="submit" className="min-h-11 rounded-xl bg-emerald-700 px-6 text-sm font-bold text-white transition hover:bg-emerald-800">খুঁজুন</button>
            </form>
            <div className="mt-3">
              <BooksShopControls
                categories={categoryOptions}
                authors={facets.authors}
                publishers={facets.publishers}
                languages={facets.languages}
                filters={filters}
                sort={sort}
                query={query}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className="text-sm font-medium text-slate-600">
              দেখাচ্ছে <span className="font-bold text-slate-900">{total}টি</span> {bookPage === null ? "নমুনা " : ""}বই
              {query ? ` · “${query}”` : ""}
            </p>
            {(query || filters.categories.length > 0 || filters.authors.length > 0 || filters.publishers.length > 0 || filters.languages.length > 0 || sort !== "name-asc") && (
              <Link href="/books" className="text-sm font-semibold text-emerald-800 hover:underline">ফিল্টার মুছুন</Link>
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
              <h2 className="text-xl font-bold">কোনো বই পাওয়া যায়নি</h2>
              <p className="mt-2 text-sm text-slate-600">বানান যাচাই করুন অথবা অন্য বিভাগ বেছে দেখুন।</p>
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
