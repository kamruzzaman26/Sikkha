import Link from "next/link";
import { Suspense } from "react";
import BookCard from "@/components/book-card";
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

        <div className="mt-6 flex flex-col gap-4 lg:mt-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
          <MobileCatalogFilters categories={categoryOptions} category={category} query={query} sort={sort} />
          <aside className="hidden lg:block">
            <div className="space-y-4">
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900">Shop By Categories</h2>
                <ul className="mt-3 space-y-2.5 text-sm">
                  <li><Link href="/books" className={category ? "text-slate-600 hover:text-emerald-700" : "font-semibold text-emerald-700"}>All Books</Link></li>
                  {categoryOptions.map((option) => (
                    <li key={option.value}>
                      <Link href={`/books?${new URLSearchParams({ ...(query ? { q: query } : {}), category: option.value }).toString()}`} className={category === option.value ? "font-semibold text-emerald-700" : "text-slate-600 hover:text-emerald-700"}>
                        <span className="mr-2 inline-block h-3 w-3 rounded-full border border-slate-400 align-middle" aria-hidden="true" />
                        {option.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900">Sort</h2>
                <form action="/books" method="get" className="mt-3 space-y-2.5 text-sm text-slate-600">
                  {query && <input type="hidden" name="q" value={query} />}
                  {category && <input type="hidden" name="category" value={category} />}
                  <label className="flex items-center gap-2"><input type="radio" name="sort" value="name-asc" defaultChecked={sort === "name-asc"} /> Name - A to Z</label>
                  <label className="flex items-center gap-2"><input type="radio" name="sort" value="name-desc" defaultChecked={sort === "name-desc"} /> Name - Z to A</label>
                  <label className="flex items-center gap-2"><input type="radio" name="sort" value="newest" defaultChecked={sort === "newest"} /> New Released</label>
                  <label className="flex items-center gap-2"><input type="radio" name="sort" value="price-low" defaultChecked={sort === "price-low"} /> Price - Low to High</label>
                  <label className="flex items-center gap-2"><input type="radio" name="sort" value="price-high" defaultChecked={sort === "price-high"} /> Price - High to Low</label>
                  <button type="submit" className="mt-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Apply</button>
                </form>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900">Shop by Brand</h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">Brand filters will appear when brand data is available.</p>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900">Availability</h2>
                <label className="mt-3 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" disabled /> In Stock</label>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900">Filters</h2>
                <details className="mt-3 border-t border-slate-100 pt-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">Language</summary>
                  <p className="mt-2 text-xs text-slate-500">Language options will be added with catalog attributes.</p>
                </details>
                <details className="mt-3 border-t border-slate-100 pt-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">Publisher</summary>
                  <p className="mt-2 text-xs text-slate-500">Publisher filters will be available when catalog data is complete.</p>
                </details>
              </section>
            </div>
          </aside>
          <section className="min-w-0">
        <form
          action="/books"
          method="get"
          className="mt-7 grid gap-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(11rem,0.5fr)_minmax(10rem,0.35fr)_auto] sm:items-end sm:p-5"
        >
          <div>
            <label
              htmlFor="book-query"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              নাম, লেখক, প্রকাশক বা বিবরণ
            </label>
            <input
              id="book-query"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="যেমন: কুরআন, আরবি, প্রকাশক"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label
              htmlFor="book-category"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              বিভাগ
            </label>
            <select
              id="book-category"
              name="category"
              defaultValue={category}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">সব বিভাগ</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="book-sort"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              সাজান
            </label>
            <select
              id="book-sort"
              name="sort"
              defaultValue={sort}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="name-asc">নাম: ক থেকে হ</option>
              <option value="name-desc">নাম: হ থেকে ক</option>
              <option value="newest">New Released</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
          >
            খুঁজুন
          </button>
        </form>

        <div className="mb-5 mt-8 flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-slate-600">
            {total}টি {bookPage === null ? "নমুনা " : ""}বই পাওয়া গেছে
            {query ? ` · “${query}”` : ""}
          </p>
          {(query || category || sort !== "name-asc") && (
            <Link
              href="/books"
              className="text-sm font-semibold text-emerald-800 hover:underline"
            >
              ফিল্টার মুছুন
            </Link>
          )}
        </div>

        {matchingBooks.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            {matchingBooks.map((book) => (
              <BookCard key={book.slug} book={book} />
            ))}
            </div>
            {pageCount > 1 && (
              <nav
                aria-label="বইয়ের পৃষ্ঠা"
                className="mt-8 flex items-center justify-center gap-3"
              >
                {page > 1 && (
                  <Link
                    href={pageHref(page - 1)}
                    className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50"
                  >
                    আগের পৃষ্ঠা
                  </Link>
                )}
                <span aria-current="page" className="text-sm text-slate-600">
                  {page} / {pageCount}
                </span>
                {page < pageCount && (
                  <Link
                    href={pageHref(page + 1)}
                    className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50"
                  >
                    পরের পৃষ্ঠা
                  </Link>
                )}
              </nav>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <h2 className="text-xl font-bold">কোনো বই পাওয়া যায়নি</h2>
            <p className="mt-2 text-sm text-slate-600">
              বানান যাচাই করুন অথবা অন্য বিভাগ বেছে দেখুন।
            </p>
            <Link
              href="/books"
              className="mt-5 inline-flex rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
            >
              সব বই দেখুন
            </Link>
          </div>
        )}
          </section>
        </div>
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
