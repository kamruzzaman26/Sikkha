import Link from "next/link";
import { Suspense } from "react";
import BookCard from "@/components/book-card";
import { getActiveAffiliateLinkMap } from "@/lib/supabase/affiliate-links";
import MobileCatalogFilters from "@/components/mobile-catalog-filters";
import {
  bookCategories,
  books,
} from "@/lib/books";
import {
  getPublishedBookCategories,
  getPublishedBooks,
  toCatalogBook,
} from "@/lib/catalog";

type BookSearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
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
  const categoryParam = firstValue(params.category).slice(0, 120);
  const legacyCategory = bookCategories.find(
    (item) => item.slug === categoryParam,
  );
  const category =
    legacyCategory && !books.some((book) => book.category === categoryParam)
      ? books.find((book) => book.categorySlug === categoryParam)?.category ??
        legacyCategory.title
      : categoryParam;
  const sortValue = firstValue(params.sort);
  const sort = ["name-desc", "newest", "price-low", "price-high"].includes(sortValue)
    ? (sortValue as "name-desc" | "newest" | "price-low" | "price-high")
    : "name-asc";
  const pageValue = Number.parseInt(firstValue(params.page), 10);
  const page =
    Number.isSafeInteger(pageValue) && pageValue > 0 && pageValue <= 100000
      ? pageValue
      : 1;
  const [bookPage, databaseCategories] = await Promise.all([
    getPublishedBooks({ page, query, category: category || undefined, sort }),
    getPublishedBookCategories(),
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
  const currentCategoryLabel =
    categoryOptions.find((item) => item.value === category)?.label ??
    "বইয়ের সংগ্রহ";
  const pageHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (category) search.set("category", category);
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
          <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
            <nav aria-label="সাজানোর দ্রুত অপশন" className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs [scrollbar-width:none]">
              <a href="#book-query" className="whitespace-nowrap rounded-lg border border-slate-200 px-3.5 py-2 font-semibold text-slate-700 hover:bg-slate-50">ফিল্টার</a>
              {([["newest", "নতুন"], ["price-low", "দাম: কম"], ["price-high", "দাম: বেশি"], ["name-asc", "নাম: ক–হ"]] as const).map(([value, label]) => (
                <Link key={value} href={`/books?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(category ? { category } : {}), sort: value }).toString()}`} aria-current={sort === value ? "true" : undefined} className={`whitespace-nowrap rounded-lg border px-3.5 py-2 font-semibold transition ${sort === value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>{label}</Link>
              ))}
            </nav>
            <form action="/books" method="get" className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,0.45fr)_minmax(9rem,0.45fr)_auto]">
              <div className="sm:col-span-1">
                <label htmlFor="book-query" className="sr-only">বই, লেখক বা প্রকাশক খুঁজুন</label>
                <input id="book-query" name="q" type="search" defaultValue={query} placeholder="বই, লেখক বা প্রকাশনীর নাম খুঁজুন..." className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div>
                <label htmlFor="book-category" className="sr-only">বিভাগ নির্বাচন</label>
                <select id="book-category" name="category" defaultValue={category} className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500">
                  <option value="">সব বিভাগ</option>
                  {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="book-sort" className="sr-only">বই সাজান</label>
                <select id="book-sort" name="sort" defaultValue={sort} className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500">
                  <option value="name-asc">নাম: ক থেকে হ</option>
                  <option value="name-desc">নাম: হ থেকে ক</option>
                  <option value="newest">New Released</option>
                  <option value="price-low">দাম: কম থেকে বেশি</option>
                  <option value="price-high">দাম: বেশি থেকে কম</option>
                </select>
              </div>
              <button type="submit" className="min-h-11 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">খুঁজুন</button>
            </form>
            <nav aria-label="দ্রুত বই বিভাগ" className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <Link href="/books" className={`whitespace-nowrap rounded-full px-4 py-2 font-semibold transition ${!category ? "bg-emerald-700 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"}`}>সব বই</Link>
              {categoryOptions.slice(0, 8).map((option) => (
                <Link key={option.value} href={`/books?${new URLSearchParams({ ...(query ? { q: query } : {}), category: option.value }).toString()}`} aria-current={category === option.value ? "page" : undefined} className={`whitespace-nowrap rounded-full px-4 py-2 font-semibold transition ${category === option.value ? "bg-emerald-700 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"}`}>
                  {option.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className="text-sm font-medium text-slate-600">
              দেখাচ্ছে <span className="font-bold text-slate-900">{total}টি</span> {bookPage === null ? "নমুনা " : ""}বই
              {query ? ` · “${query}”` : ""}
            </p>
            {(query || category || sort !== "name-asc") && (
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
