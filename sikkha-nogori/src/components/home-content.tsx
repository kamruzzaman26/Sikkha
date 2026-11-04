import Link from "next/link";
import BookCard from "@/components/book-card";
import { getSavings, type Book } from "@/lib/books";
import {
  getPublishedBookCategories,
  getPublishedBooks,
  toCatalogBook,
} from "@/lib/catalog";
import { getActiveAffiliateLinkMap } from "@/lib/supabase/affiliate-links";
import type { PublicAffiliateLink } from "@/lib/supabase/affiliate-links";
import { createSupabasePublicServerClient } from "@/lib/supabase/server";

const slides = [
  {
    title: "পছন্দের বই, সরাসরি রকমারিতে",
    text: "বাছাই করা বই ও আকর্ষণীয় দাম এক জায়গায়",
    cta: "Shop Now",
    href: "/books",
    tone: "from-emerald-700 to-emerald-950",
  },
  {
    title: "নতুন যোগ হওয়া বই",
    text: "প্রতিদিনের পাঠ ও আত্মগঠনের নতুন সংগ্রহ",
    cta: "New Arrivals",
    href: "#new-arrivals",
    tone: "from-teal-700 to-emerald-950",
  },
  {
    title: "বিষয় ধরে খুঁজুন",
    text: "ইসলামি, ক্যারিয়ার, একাডেমিক ও আরও অনেক বিভাগ",
    cta: "Browse Categories",
    href: "#categories",
    tone: "from-slate-700 to-emerald-950",
  },
];

async function loadBooks(): Promise<Book[]> {
  try {
    const page = await getPublishedBooks({
      page: 1,
      query: "",
      sort: "newest",
      pageSize: 48,
    });
    return page ? page.products.map(toCatalogBook) : [];
  } catch (error) {
    console.error("Unable to load books for the home page.", error);
    return [];
  }
}

async function loadCategories(): Promise<string[]> {
  try {
    return (await getPublishedBookCategories()) ?? [];
  } catch (error) {
    console.error("Unable to load categories for the home page.", error);
    return [];
  }
}

function BookRow({
  id,
  title,
  subtitle,
  href,
  books,
  linkMap,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  href: string;
  books: Book[];
  linkMap: Record<string, PublicAffiliateLink>;
}) {
  if (books.length === 0) {
    return null;
  }

  return (
    <section id={id} className="scroll-mt-6 py-6 sm:py-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          )}
        </div>
        <Link
          href={href}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
        >
          View All <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 [scrollbar-width:thin] sm:gap-4">
        {books.map((book) => (
          <div
            key={book.slug}
            className="w-[46%] min-w-[9.5rem] max-w-[14rem] shrink-0 snap-start sm:w-[30%] lg:w-[22%]"
          >
            <BookCard book={book} buyLink={linkMap[book.slug] ?? null} />
          </div>
        ))}
      </div>
    </section>
  );
}

type HomeConfig = { show_categories?: boolean; show_new_arrivals?: boolean; show_deals?: boolean; categories_title?: string; new_arrivals_title?: string; deals_title?: string };
type Banner = { title: string; text: string; cta: string; href: string; tone: string; active: boolean };
async function loadHomeConfig() {
  try {
    const supabase = createSupabasePublicServerClient();
    const [{ data: home }, { data: bannerData }] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", "homepage").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "banners").maybeSingle(),
    ]);
    const config = (home?.value ?? {}) as HomeConfig;
    const custom = ((bannerData?.value as { items?: Banner[] } | null)?.items ?? []).filter((item) => item.active && item.title && item.href);
    return { config, slides: custom.length ? custom : slides };
  } catch { return { config: {} as HomeConfig, slides }; }
}

export default async function HomeContent() {
  const [books, categories, homeSettings] = await Promise.all([loadBooks(), loadCategories(), loadHomeConfig()]);
  const { config } = homeSettings;
  const linkMap = await getActiveAffiliateLinkMap(
    books.filter((book) => book.commerceMode === "affiliate").map((book) => book.slug),
  );

  const newArrivals = books.slice(0, 12);
  const deals = books
    .map((book) => ({ book, savings: getSavings(book.price, book.listPrice) }))
    .filter((item) => item.savings !== null)
    .sort((a, b) => (b.savings?.percent ?? 0) - (a.savings?.percent ?? 0))
    .slice(0, 12)
    .map((item) => item.book);
  const categoryCounts = new Map<string, number>();
  for (const book of books) {
    if (book.category) {
      categoryCounts.set(book.category, (categoryCounts.get(book.category) ?? 0) + 1);
    }
  }
  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7faf8] pb-10 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <form action="/books" method="get" role="search">
          <div className="flex min-h-12 rounded-xl border-2 border-emerald-700 bg-white p-1">
            <label className="sr-only" htmlFor="home-search">
              বই, লেখক বা প্রকাশক খুঁজুন
            </label>
            <input
              id="home-search"
              name="q"
              type="search"
              placeholder="Search books, authors & more (বই, লেখক খুঁজুন)"
              className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="min-h-10 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800"
            >
              Search
            </button>
          </div>
        </form>

        <div
          aria-label="প্রচার"
          className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none]"
        >
          {homeSettings.slides.map((slide) => (
            <Link
              key={slide.title}
              href={slide.href}
              className={`flex min-h-44 w-full shrink-0 snap-center flex-col justify-center rounded-2xl bg-gradient-to-br ${slide.tone} p-6 text-white sm:min-h-56 sm:p-10 lg:w-[49%]`}
            >
              <span className="text-2xl font-extrabold leading-snug sm:text-4xl">
                {slide.title}
              </span>
              <span className="mt-2 text-sm text-emerald-50 sm:text-base">
                {slide.text}
              </span>
              <span className="mt-4 inline-flex w-fit rounded-lg bg-white px-4 py-2 text-sm font-bold text-emerald-900">
                {slide.cta} →
              </span>
            </Link>
          ))}
        </div>

        {config.show_categories !== false && categories.length > 0 && (
          <section id="categories" aria-labelledby="home-categories" className="scroll-mt-6 py-6">
            <h2
              id="home-categories"
              className="text-2xl font-extrabold tracking-tight sm:text-3xl"
            >
              Shop By Category
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {categories.slice(0, 8).map((category) => (
                <Link
                  key={category}
                  href={`/books?category=${encodeURIComponent(category)}`}
                  className="flex min-h-16 items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-3 text-sm font-bold leading-5 text-slate-800 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"
                  >
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
                      <path d="M4 5.5v16" />
                    </svg>
                  </span>
                  {category}
                </Link>
              ))}
            </div>
          </section>
        )}

        {config.show_new_arrivals !== false && <BookRow
          id="new-arrivals"
          title={config.new_arrivals_title || "New Arrivals · নতুন বই"}
          subtitle="সদ্য যোগ হওয়া বই"
          href="/books?sort=newest"
          books={newArrivals}
          linkMap={linkMap}
        />}
        {config.show_deals !== false && <BookRow
          title={config.deals_title || "Best Deals · সেরা ছাড়"}
          subtitle="মুদ্রিত মূল্যের চেয়ে কম দামের বই"
          href="/books?sort=price-low"
          books={deals}
          linkMap={linkMap}
        />}
        {topCategories.map((category) => (
          <BookRow
            key={category}
            title={category}
            href={`/books?category=${encodeURIComponent(category)}`}
            books={books.filter((book) => book.category === category).slice(0, 12)}
            linkMap={linkMap}
          />
        ))}

        {books.length === 0 ? (
          <p className="mt-8 rounded-2xl bg-white p-6 text-center text-slate-600">
            নতুন বই শীঘ্রই যোগ হবে। এর মধ্যে{" "}
            <Link href="/books" className="font-bold text-emerald-800 underline">
              সব বই
            </Link>{" "}
            দেখুন।
          </p>
        ) : (
          <div className="mt-6 text-center">
            <Link
              href="/books"
              className="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-8 text-base font-bold text-white hover:bg-emerald-800"
            >
              সব বই দেখুন · Explore All Books
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
