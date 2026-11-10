import type { Metadata } from "next";
import Link from "next/link";
import BookCard from "@/components/book-card";
import { CatalogProductCard } from "@/components/catalog-product-card";
import { getActiveAffiliateLinkMap } from "@/lib/supabase/affiliate-links";
import {
  getPublishedBooks,
  getPublishedCourses,
  getPublishedProducts,
  toCatalogBook,
} from "@/lib/catalog";
import { WishlistButton } from "@/components/wishlist-button";

export const metadata: Metadata = {
  title: "Search | শিক্ষা নগরী",
  description: "বই, কোর্স ও শিক্ষা উপকরণ একসঙ্গে খুঁজুন।",
};

type SearchParams = Promise<{ q?: string | string[] }>;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function matchesCourse(course: { title: string; description: string; category: string | null; author: string | null; publisher: string | null }, query: string) {
  const haystack = [course.title, course.description, course.category, course.author, course.publisher]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("bn");
  return haystack.includes(query.toLocaleLowerCase("bn"));
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = firstValue(params.q).normalize("NFKC").trim().slice(0, 100);
  const [bookPage, productPage, courses] = query
    ? await Promise.all([
        getPublishedBooks({ page: 1, query, sort: "name-asc", pageSize: 12 }),
        getPublishedProducts({ page: 1, query, sort: "name-asc" }),
        getPublishedCourses(),
      ])
    : [null, null, []];

  const books = bookPage?.products.map(toCatalogBook) ?? [];
  const products = productPage?.products ?? [];
  const matchingCourses = (courses ?? []).filter((course) => matchesCourse(course, query)).slice(0, 12);
  const affiliateLinks = await getActiveAffiliateLinkMap(
    books.filter((book) => book.commerceMode === "affiliate").map((book) => book.slug),
  );
  const total = (bookPage?.total ?? 0) + (productPage?.total ?? 0) + matchingCourses.length;

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-900 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav aria-label="পথনির্দেশ" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-emerald-800 hover:underline">Home</Link>
          <span className="px-2" aria-hidden="true">/</span>
          <span>Search</span>
        </nav>
        <header className="mt-6">
          <p className="text-sm font-bold text-emerald-700">শিক্ষা নগরী</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Search the catalog</h1>
          <p className="mt-2 text-slate-600">বই, অনলাইন কোর্স ও অন্যান্য শিক্ষা উপকরণ একসঙ্গে খুঁজুন।</p>
          <form action="/search" method="get" role="search" className="mt-5 flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <label htmlFor="catalog-search" className="sr-only">Search all catalog items</label>
            <input id="catalog-search" name="q" type="search" required maxLength={100} defaultValue={query} placeholder="বই, লেখক, কোর্স বা পণ্যের নাম লিখুন" className="min-w-0 flex-1 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100" />
            <button type="submit" className="min-h-11 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800">Search</button>
          </form>
        </header>

        {!query ? (
          <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <h2 className="text-xl font-bold">কী খুঁজছেন?</h2>
            <p className="mt-2 text-slate-600">উপরের সার্চ বক্সে বই, লেখক, কোর্স বা পণ্যের নাম লিখুন।</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3 text-sm font-semibold text-emerald-800">
              <Link href="/books">Books</Link><Link href="/courses">Courses</Link><Link href="/products">Other Products</Link>
            </div>
          </section>
        ) : (
          <>
            <p className="mt-7 text-sm text-slate-600" aria-live="polite">
              “{query}” অনুসন্ধানে {total}টি ফলাফল
            </p>
            {bookPage === null && productPage === null && courses === null ? (
              <p role="status" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">ক্যাটালগের ডেটাবেস এই মুহূর্তে পাওয়া যাচ্ছে না। পরে আবার চেষ্টা করুন।</p>
            ) : total === 0 ? (
              <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
                <h2 className="text-xl font-bold">কোনো ফলাফল পাওয়া যায়নি</h2>
                <p className="mt-2 text-slate-600">বানান যাচাই করুন অথবা অন্য শব্দ দিয়ে খুঁজুন।</p>
              </section>
            ) : (
              <>
                {books.length > 0 && <section className="mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold">Books</h2><Link href={`/books?q=${encodeURIComponent(query)}`} className="text-sm font-bold text-emerald-800 hover:underline">সব বই দেখুন</Link></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{books.map((book) => <BookCard key={book.slug} book={book} buyLink={affiliateLinks[book.slug] ?? null} />)}</div></section>}
                {matchingCourses.length > 0 && <section className="mt-10"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold">Courses</h2><Link href="/courses" className="text-sm font-bold text-emerald-800 hover:underline">সব কোর্স দেখুন</Link></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{matchingCourses.map((course) => <article key={course.id} className="rounded-xl border border-slate-200 bg-white p-5"><Link href={`/courses/${course.slug}`} className="font-bold text-slate-900 hover:text-emerald-800">{course.title}</Link>{course.category && <p className="mt-2 text-sm text-emerald-700">{course.category}</p>}<p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{course.description}</p><div className="mt-4"><WishlistButton slug={course.slug} /></div></article>)}</div></section>}
                {products.length > 0 && <section className="mt-10"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold">Other Products</h2><Link href={`/products?q=${encodeURIComponent(query)}`} className="text-sm font-bold text-emerald-800 hover:underline">সব পণ্য দেখুন</Link></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{products.map((product) => <CatalogProductCard key={product.id} product={product} />)}</div></section>}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
