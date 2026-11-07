import Link from "next/link";
import { Suspense } from "react";
import BookCard from "@/components/book-card";
import BookFilterSort from "@/components/book-filter-sort";
import { getActiveAffiliateLinkMap } from "@/lib/supabase/affiliate-links";
import { bookCategories, books, getSavings, type Book } from "@/lib/books";
import { getPublishedBookCategories, getPublishedBooks, toCatalogBook } from "@/lib/catalog";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
const many = (value: string | string[] | undefined) => (Array.isArray(value) ? value : value ? [value] : []).slice(0, 30);
const pageSize = 24;

async function BookResults({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = first(params.q).trim().slice(0, 100);
  const categoryParam = first(params.category).slice(0, 120);
  const categoryAlias = bookCategories.find((item) => item.slug === categoryParam);
  const category = categoryAlias && !books.some((book) => book.category === categoryParam)
    ? books.find((book) => book.categorySlug === categoryParam)?.category ?? categoryAlias.title
    : categoryParam;
  const authorsFilter = many(params.author);
  const publishersFilter = many(params.publisher);
  const languagesFilter = many(params.language);
  const allowedSorts = ["best", "newest", "price-low", "price-high", "discount-high", "discount-low", "name-desc"];
  const requestedSort = first(params.sort);
  const sort = allowedSorts.includes(requestedSort) ? requestedSort : "name-asc";
  const requestedPage = Number.parseInt(first(params.page), 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100000 ? requestedPage : 1;

  // Load a bounded catalog batch so author/publisher/language filters work across pages,
  // not just against the current 24 visible cards. The database helper caps this at 1,000.
  const [bookPage, databaseCategories] = await Promise.all([
    getPublishedBooks({ page: 1, pageSize: 1000, query, category: category || undefined, sort: sort === "name-desc" || sort === "price-low" || sort === "price-high" || sort === "newest" ? sort : "name-asc" }),
    getPublishedBookCategories(),
  ]);
  const databaseMode = bookPage !== null;
  const sourceBooks = databaseMode ? bookPage.products.map(toCatalogBook) : books;
  const normalizedQuery = query.toLocaleLowerCase("bn");
  let filtered = sourceBooks.filter((book) => {
    const matchesText = !normalizedQuery || [book.title, book.author, book.publisher, book.category, book.description].some((value) => value.toLocaleLowerCase("bn").includes(normalizedQuery));
    return matchesText && (!category || book.category === category)
      && (authorsFilter.length === 0 || authorsFilter.includes(book.author))
      && (publishersFilter.length === 0 || publishersFilter.includes(book.publisher))
      && (languagesFilter.length === 0 || languagesFilter.includes(book.language ?? ""));
  });

  if (sort === "best") {
    filtered = filtered.filter((book) => book.collections.includes("bestseller"));
  } else if (sort === "newest" && !databaseMode) {
    filtered.sort((a, b) => Number(b.collections.includes("new")) - Number(a.collections.includes("new")) || a.title.localeCompare(b.title, "bn"));
  } else if (sort === "price-low" || sort === "price-high") {
    filtered.sort((a, b) => {
      const aPrice = a.discountedPrice ?? a.price ?? Number.MAX_SAFE_INTEGER;
      const bPrice = b.discountedPrice ?? b.price ?? Number.MAX_SAFE_INTEGER;
      return sort === "price-low" ? aPrice - bPrice : bPrice - aPrice;
    });
  } else if (sort === "discount-high" || sort === "discount-low") {
    filtered.sort((a, b) => {
      const aDiscount = getSavings(a.price, a.listPrice)?.percent ?? 0;
      const bDiscount = getSavings(b.price, b.listPrice)?.percent ?? 0;
      return sort === "discount-high" ? bDiscount - aDiscount : aDiscount - bDiscount;
    });
  } else if (sort === "name-desc") {
    filtered.sort((a, b) => b.title.localeCompare(a.title, "bn", { sensitivity: "base" }));
  }

  const categoryNames = databaseCategories ?? [...new Set(books.map((book) => book.category))];
  const categoryOptions = [...new Map([
    ...bookCategories.map((item) => {
      const book = books.find((entry) => entry.categorySlug === item.slug);
      const value = book?.category ?? (categoryNames.includes(item.title) ? item.title : item.title);
      return [value, { label: item.title, value }] as const;
    }),
    ...categoryNames.map((value) => [value, { label: value, value }] as const),
  ]).values()];
  const unique = (values: (string | null | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "bn"));
  const authors = unique(sourceBooks.map((book) => book.author));
  const publishers = unique(sourceBooks.map((book) => book.publisher));
  const languages = unique(sourceBooks.map((book) => book.language));
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageBooks = filtered.slice((page - 1) * pageSize, page * pageSize);
  const affiliateLinkMap = await getActiveAffiliateLinkMap(pageBooks.filter((book) => book.commerceMode === "affiliate").map((book) => book.slug));
  const currentLabel = categoryOptions.find((item) => item.value === category)?.label ?? "বইয়ের সংগ্রহ";
  const pageHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (category) search.set("category", category);
    authorsFilter.forEach((value) => search.append("author", value));
    publishersFilter.forEach((value) => search.append("publisher", value));
    languagesFilter.forEach((value) => search.append("language", value));
    if (sort !== "name-asc") search.set("sort", sort);
    if (nextPage > 1) search.set("page", String(nextPage));
    return `/books?${search.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl">
      <nav aria-label="পথনির্দেশ" className="text-sm text-slate-500"><Link href="/" className="font-semibold text-emerald-800 hover:underline">হোম</Link><span className="px-2" aria-hidden="true">/</span><span>{currentLabel}</span></nav>
      <header className="mt-6"><p className="text-sm font-bold text-emerald-700">শিক্ষা নগরী</p><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">বইয়ের সংগ্রহ</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600">নাম, লেখক, প্রকাশক, বিভাগ বা বিবরণ দিয়ে বই খুঁজুন এবং পছন্দমতো সাজান।</p></header>
      {!databaseMode && <p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">ডেটাবেস ক্যাটালগ চালু না থাকায় নিচে কেবল নমুনা বই দেখানো হচ্ছে।</p>}
      <section className="mt-6 space-y-5">
        <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
          <form action="/books" method="get" className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label htmlFor="book-query" className="sr-only">বই, লেখক বা প্রকাশক খুঁজুন</label><input id="book-query" name="q" type="search" defaultValue={query} placeholder="বই, লেখক বা প্রকাশনীর নাম খুঁজুন..." className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
            <button type="submit" className="min-h-11 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800">খুঁজুন</button>
          </form>
          <div className="mt-3"><BookFilterSort categories={categoryOptions} authors={authors} publishers={publishers} languages={languages} selectedCategory={category} selectedAuthors={authorsFilter} selectedPublishers={publishersFilter} selectedLanguages={languagesFilter} query={query} sort={sort} showBestSeller={!databaseMode} /></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p aria-live="polite" className="text-sm font-medium text-slate-600">দেখাচ্ছে <span className="font-bold text-slate-900">{total}টি</span> {databaseMode ? "বই" : "নমুনা বই"}{query ? ` · “${query}”` : ""}</p>{(query || category || authorsFilter.length || publishersFilter.length || languagesFilter.length || sort !== "name-asc") && <Link href="/books" className="text-sm font-semibold text-emerald-800 hover:underline">সব ফিল্টার মুছুন</Link>}</div>
        {pageBooks.length ? <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">{pageBooks.map((book) => <BookCard key={book.slug} book={book} buyLink={affiliateLinkMap[book.slug] ?? null} />)}</div>
          {pageCount > 1 && <nav aria-label="বইয়ের পৃষ্ঠা" className="mt-8 flex items-center justify-center gap-3">{page > 1 && <Link href={pageHref(page - 1)} className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50">আগের পৃষ্ঠা</Link>}<span aria-current="page" className="text-sm text-slate-600">{page} / {pageCount}</span>{page < pageCount && <Link href={pageHref(page + 1)} className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50">পরের পৃষ্ঠা</Link>}</nav>}
        </> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><h2 className="text-xl font-bold">কোনো বই পাওয়া যায়নি</h2><p className="mt-2 text-sm text-slate-600">ফিল্টার বা বানান পরিবর্তন করে আবার চেষ্টা করুন।</p><Link href="/books" className="mt-5 inline-flex rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">সব বই দেখুন</Link></div>}
      </section>
    </div>
  );
}

export default function BooksPage({ searchParams }: { searchParams: SearchParams }) {
  return <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-900 sm:px-6 sm:py-12 lg:px-8"><Suspense fallback={<div className="mx-auto max-w-7xl" aria-label="বই লোড হচ্ছে"><div className="h-8 w-56 animate-pulse rounded bg-emerald-100" /><div className="mt-6 h-28 animate-pulse rounded-2xl bg-white" /><div className="mt-8 h-72 animate-pulse rounded-2xl bg-white" /></div>}><BookResults searchParams={searchParams} /></Suspense></main>;
}
