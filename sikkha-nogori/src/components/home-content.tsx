import { CatalogProductCard } from "@/components/catalog-product-card";
import Image from "next/image";
import Link from "next/link";
import BookCard from "@/components/book-card";
import { bookCategories, getSavings, type Book } from "@/lib/books";
import {
  getPublishedBookCategories,
  getPublishedBooks,
  getPublishedProducts,
  toCatalogBook,
  type CatalogProduct,
} from "@/lib/catalog";
import { getActiveAffiliateLinkMap } from "@/lib/supabase/affiliate-links";
import type { PublicAffiliateLink } from "@/lib/supabase/affiliate-links";
import { createSupabasePublicServerClient } from "@/lib/supabase/server";

const slides = [
  { title: "বই ও প্রয়োজনীয় পণ্য", text: "পড়াশোনা, জ্ঞানচর্চা ও দৈনন্দিন কেনাকাটা—এক জায়গায়", cta: "এখনই ঘুরে দেখুন", href: "/books", tone: "from-emerald-700 to-emerald-950" },
  { title: "নতুন বইয়ের সংগ্রহ", text: "আপনার পছন্দের বিষয় খুঁজে নিন সহজেই", cta: "বই দেখুন", href: "/books?sort=newest", tone: "from-teal-700 to-emerald-950" },
  { title: "শেখার নতুন সুযোগ", text: "বই, কোর্স ও প্রয়োজনীয় শিক্ষাসামগ্রী", cta: "কোর্স দেখুন", href: "/courses", tone: "from-slate-700 to-emerald-950" },
];

type HomeConfig = { show_categories?: boolean; show_new_arrivals?: boolean; show_deals?: boolean; categories_title?: string; new_arrivals_title?: string; deals_title?: string };
type Banner = { title: string; text: string; cta: string; href: string; tone: string; active: boolean };
type HomeCategory = { id: string; name: string; category_group: "books" | "products" | "electronics"; sort_order: number | null };

const categoryIcons: { test: RegExp; icon: string }[] = [
  { test: /book|বই|ebook|ই-বুক/i, icon: "📚" },
  { test: /audio|অডিও|sound/i, icon: "🎧" },
  { test: /stationery|স্টেশনারি|কলম/i, icon: "✏️" },
  { test: /grocery|groceries|food|খাদ্য|মুদি/i, icon: "🛍️" },
  { test: /electronic|ইলেকট্রনিক|computer|কম্পিউটার/i, icon: "💻" },
  { test: /beauty|health|স্বাস্থ্য|সৌন্দর্য/i, icon: "🧴" },
  { test: /admission|ভর্তি|চাকরি|নিয়োগ/i, icon: "🎓" },
  { test: /science|বিজ্ঞান/i, icon: "🔬" },
  { test: /gift|উপহার/i, icon: "🎁" },
  { test: /islam|ইসলাম|কুরআন/i, icon: "☪️" },
  { test: /baby|kids|শিশু|বাচ্চা/i, icon: "🧸" },
  { test: /power|ব্যাটারি/i, icon: "🔋" },
  { test: /medical|মেডিকেল|চিকিৎসা/i, icon: "🩺" },
  { test: /wearable|ঘড়ি|watch/i, icon: "⌚" },
  { test: /phone|mobile|মোবাইল|tab/i, icon: "📱" },
  { test: /automotive|motor|গাড়ি/i, icon: "🚗" },
  { test: /tool|diy|outdoor/i, icon: "🛠️" },
  { test: /kitchen|dining|রান্না/i, icon: "🍽️" },
  { test: /fashion|ফ্যাশন|t-shirt|shirt/i, icon: "👕" },
  { test: /furniture|decor|আসবাব/i, icon: "🛋️" },
  { test: /sport|sports|খেলা/i, icon: "⚽" },
  { test: /travel|ভ্রমণ|bag|ব্যাগ/i, icon: "🎒" },
];

function getCategoryIcon(name: string): string {
  return categoryIcons.find(({ test }) => test.test(name))?.icon ?? "✦";
}

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
  } catch {
    return { config: {} as HomeConfig, slides };
  }
}

async function loadCategoryTiles(): Promise<HomeCategory[]> {
  try {
    const supabase = createSupabasePublicServerClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, category_group, sort_order")
      .eq("is_active", true)
      .is("parent_id", null)
      .in("category_group", ["books", "products", "electronics"])
      .order("sort_order")
      .limit(40);
    if (error || !data || data.length === 0) {
      return bookCategories.map((category, index) => ({
        id: category.slug,
        name: category.title,
        category_group: "books" as const,
        sort_order: index,
      }));
    }
    return data as HomeCategory[];
  } catch {
    return [];
  }
}

async function loadBooks(): Promise<Book[]> {
  try {
    const page = await getPublishedBooks({ page: 1, query: "", sort: "newest", pageSize: 24 });
    return page ? page.products.map(toCatalogBook) : [];
  } catch (error) {
    console.error("Unable to load books for the home page.", error);
    return [];
  }
}

async function loadProducts(): Promise<CatalogProduct[]> {
  try {
    const page = await getPublishedProducts({ page: 1, query: "", sort: "name-asc" });
    return page?.products ?? [];
  } catch (error) {
    console.error("Unable to load products for the home page.", error);
    return [];
  }
}

function SectionHeader({ id, title, subtitle, href, cta = "সব দেখুন" }: { id?: string; title: string; subtitle?: string; href?: string; cta?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50">
          {cta} <span aria-hidden="true">›</span>
        </Link>
      )}
    </div>
  );
}

const railClass = "-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 sm:gap-4";
const railItemClass = "w-[44%] min-w-[9.25rem] max-w-[13.5rem] shrink-0 snap-start sm:w-[28%] lg:w-[19%]";

function BookRow({ id, title, subtitle, href, books, linkMap, boxed = false }: {
  id?: string; title: string; subtitle?: string; href: string; books: Book[];
  linkMap: Record<string, PublicAffiliateLink>; boxed?: boolean;
}) {
  if (books.length === 0) return null;
  return (
    <section id={id} aria-label={title} className={`scroll-mt-24 ${boxed ? "mt-6 rounded-2xl border-2 border-emerald-600 bg-white p-3 sm:p-5" : "mt-8"}`}>
      <SectionHeader title={title} subtitle={subtitle} href={href} />
      <div className={railClass}>
        {books.map((book) => <div key={book.slug} className={railItemClass}><BookCard book={book} buyLink={linkMap[book.slug] ?? null} /></div>)}
      </div>
    </section>
  );
}

function ProductRow({ products }: { products: CatalogProduct[] }) {
  if (!products.length) return null;
  return (
    <section aria-label="Featured Products" className="mt-8">
      <SectionHeader title="Featured Products · বিশেষ পণ্য" href="/products" cta="সব পণ্য" />
      <div className={railClass}>
        {products.slice(0, 12).map((product) => (
          <div key={product.id} className={railItemClass}><CatalogProductCard product={product} /></div>
        ))}
      </div>
    </section>
  );
}

function Thumb({ book }: { book: Book }) {
  if (book.imageUrl) {
    return <Image src={book.imageUrl} alt="" width={96} height={128} unoptimized className="h-24 w-auto max-w-full object-contain" />;
  }
  return (
    <span aria-hidden="true" className={`flex h-24 w-[4.5rem] items-center justify-center rounded-r-md px-1 text-center text-[10px] font-bold leading-3 text-white ${book.coverAccent}`}>
      <span className="line-clamp-4 whitespace-pre-line">{book.cover}</span>
    </span>
  );
}

function CollectionBlock({ title, books }: { title: string; books: Book[] }) {
  if (books.length === 0) return null;
  return (
    <section aria-label={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="line-clamp-1 text-base font-extrabold text-slate-900">{title}</h3>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4">
        {books.slice(0, 4).map((book) => (
          <Link key={book.slug} href={`/books/${book.slug}`} className="group flex min-w-0 flex-col items-center text-center">
            <span className="flex h-24 items-center justify-center transition group-hover:scale-[1.03]"><Thumb book={book} /></span>
            <span className="mt-2 line-clamp-2 text-xs font-semibold leading-4 text-slate-700 group-hover:text-emerald-800">{book.title}</span>
          </Link>
        ))}
      </div>
      <Link href={`/books?category=${encodeURIComponent(title)}`} className="mt-4 inline-flex min-h-10 items-center gap-1 text-sm font-bold text-emerald-800 hover:underline">
        আরও দেখুন <span aria-hidden="true">›</span>
      </Link>
    </section>
  );
}

export default async function HomeContent({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const { source } = await searchParams;
  const activeSource = source === "inhouse" || source === "partner" ? source : "all";
  const [books, products, categories, homeSettings] = await Promise.all([
    loadBooks(), loadProducts(), loadCategoryTiles(), loadHomeConfig(),
  ]);
  const { config } = homeSettings;
  const linkMap = await getActiveAffiliateLinkMap(books.filter((book) => book.commerceMode === "affiliate").map((book) => book.slug));
  const newArrivals = books.slice(0, 12);
  const shownBooks = books
    .filter((book) => activeSource === "inhouse" ? book.commerceMode === "direct" : activeSource === "partner" ? book.commerceMode === "affiliate" : true)
    .slice(0, 12);
  const deals = books
    .map((book) => ({ book, savings: getSavings(book.price, book.listPrice) }))
    .filter((item) => item.savings !== null)
    .sort((a, b) => (b.savings?.percent ?? 0) - (a.savings?.percent ?? 0))
    .slice(0, 12)
    .map((item) => item.book);
  const popularBookCategories = (await getPublishedBookCategories()) ?? [];
  // Topic rail and collection blocks: categories that actually have books, with real covers.
  const topics = popularBookCategories
    .map((category) => ({ category, books: books.filter((book) => book.category === category) }))
    .filter((topic) => topic.books.length > 0);

  return (
    <main className="min-h-screen w-full min-w-0 self-stretch overflow-hidden bg-[#f6f8f7] pb-24 text-slate-900">
      <div className="mx-auto w-full min-w-0 max-w-7xl px-3 pt-3 sm:px-6 sm:pt-5 lg:px-8">
        {/* Hero banners: swipe on mobile. Banner content comes from Banner Management. */}
        <section aria-label="প্রচারমূলক ব্যানার">
          <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {homeSettings.slides.map((slide, index) => (
              <Link key={slide.title} href={slide.href} className={`relative flex min-h-44 w-[92%] shrink-0 snap-center flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${slide.tone} p-5 text-white shadow-sm sm:min-h-56 sm:w-[calc(50%-0.5rem)] sm:p-8 lg:min-h-64`}>
                <span className="absolute -right-6 -top-10 size-40 rounded-full border-[18px] border-white/10" aria-hidden="true" />
                <span className="relative text-xl font-extrabold leading-snug sm:text-3xl">{slide.title}</span>
                <span className="relative mt-2 max-w-md text-sm text-white/90 sm:text-base">{slide.text}</span>
                <span className="relative mt-4 inline-flex min-h-10 w-fit items-center rounded-lg bg-white px-4 text-sm font-bold text-slate-900">{slide.cta} →</span>
                <span className="absolute bottom-3 right-4 text-xs text-white/70">{index + 1} / {homeSettings.slides.length}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Category rail: two rows that scroll sideways on phones, a full grid on desktop. */}
        {config.show_categories !== false && categories.length > 0 && (
          <section id="categories" aria-labelledby="home-categories" className="mt-4 rounded-2xl bg-white p-3 shadow-sm sm:p-5">
            <SectionHeader id="home-categories" title={config.categories_title || "Shop By Category · ক্যাটাগরি"} />
            <div className="-mx-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
              <div className="grid auto-cols-[5.5rem] grid-flow-col grid-rows-2 gap-x-3 gap-y-4 lg:auto-cols-auto lg:grid-flow-row lg:grid-cols-8 lg:grid-rows-none">
                {categories.map((category) => (
                  <Link key={category.id} href={category.category_group === "books" ? `/books?category=${encodeURIComponent(category.name)}` : `/products?category=${encodeURIComponent(category.name)}`} className="group flex flex-col items-center text-center">
                    <span className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-2xl ring-1 ring-emerald-100 transition group-hover:-translate-y-0.5 group-hover:bg-emerald-100 sm:size-16" aria-hidden="true">{getCategoryIcon(category.name)}</span>
                    <span className="mt-1.5 line-clamp-2 min-h-8 text-[11px] font-semibold leading-4 text-slate-700 sm:text-xs">{category.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Topic rail: one real cover per category that has books. */}
        {topics.length > 0 && (
          <section aria-labelledby="home-topics" className="mt-6">
            <SectionHeader id="home-topics" title="বিষয় অনুযায়ী বই" href="/books" cta="সব বই" />
            <div className={railClass}>
              {topics.slice(0, 14).map(({ category, books: topicBooks }) => (
                <Link key={category} href={`/books?category=${encodeURIComponent(category)}`} className="group flex w-[7.5rem] shrink-0 snap-start flex-col items-center rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:border-emerald-300 hover:shadow-md sm:w-36">
                  <span className="flex h-24 items-center justify-center"><Thumb book={topicBooks[0]} /></span>
                  <span className="mt-2 line-clamp-2 min-h-8 text-xs font-bold leading-4 text-slate-800 group-hover:text-emerald-800">{category}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {config.show_deals !== false && <BookRow boxed title={config.deals_title || "Quick Deal · সেরা ছাড়"} subtitle="তালিকামূল্যের তুলনায় কম দামের বই" href="/books?sort=discount-high" books={deals} linkMap={linkMap} />}

        <ProductRow products={products} />

        {config.show_new_arrivals !== false && <BookRow id="new-arrivals" title={config.new_arrivals_title || "New Arrivals · নতুন বই"} subtitle="সদ্য যোগ হওয়া বই" href="/books?sort=newest" books={newArrivals} linkMap={linkMap} />}

        {/* Collection blocks: four real covers per category, like a shop-window. */}
        {topics.length > 0 && (
          <section aria-labelledby="home-collections" className="mt-8">
            <SectionHeader id="home-collections" title="Collections · বইয়ের সংগ্রহ" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topics.slice(0, 6).map(({ category, books: topicBooks }) => (
                <CollectionBlock key={category} title={category} books={topicBooks} />
              ))}
            </div>
          </section>
        )}

        {/* Source filter pills + grid. The filter is URL-driven so it works without client JS. */}
        {books.length > 0 && (
          <section id="latest-books" aria-labelledby="latest-books-title" className="mt-8">
            <SectionHeader id="latest-books-title" title="সদ্য সংযোজিত বইসমূহ" href="/books?sort=newest" />
            <div className="mb-4 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
              {([["all", "সব বই", "/#latest-books"], ["inhouse", "শিক্ষা নগরী স্টক", "/?source=inhouse#latest-books"], ["partner", "পার্টনার", "/?source=partner#latest-books"]] as const).map(([key, label, href]) => (
                <Link key={key} href={href} scroll={false} aria-current={activeSource === key ? "true" : undefined} className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors ${activeSource === key ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"}`}>{label}</Link>
              ))}
            </div>
            {shownBooks.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                {shownBooks.map((book) => <BookCard key={book.slug} book={book} buyLink={linkMap[book.slug] ?? null} />)}
              </div>
            ) : (
              <p className="rounded-xl bg-white p-5 text-center text-sm text-slate-600">এই বিভাগে এখন কোনো বই নেই।</p>
            )}
          </section>
        )}

        {topics.slice(0, 6).map(({ category, books: topicBooks }) => (
          <BookRow key={category} title={category} href={`/books?category=${encodeURIComponent(category)}`} books={topicBooks.slice(0, 10)} linkMap={linkMap} />
        ))}

        {books.length === 0 && products.length === 0 ? (
          <p className="mt-8 rounded-2xl bg-white p-6 text-center text-slate-600">ক্যাটালগে নতুন আইটেম শীঘ্রই যোগ হবে। <Link href="/books" className="font-bold text-emerald-800 underline">সব বই দেখুন</Link></p>
        ) : (
          <div className="mt-8 text-center"><Link href="/books" className="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-8 text-base font-bold text-white hover:bg-emerald-800">সব বই দেখুন</Link></div>
        )}
      </div>
    </main>
  );
}
