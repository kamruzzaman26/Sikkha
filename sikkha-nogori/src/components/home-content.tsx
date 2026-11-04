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
type HomeCategory = { id: string; name: string; category_group: "books" | "products"; sort_order: number | null };

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
      .in("category_group", ["books", "products"])
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

function BookRow({ id, title, subtitle, href, books, linkMap }: {
  id?: string; title: string; subtitle?: string; href: string; books: Book[];
  linkMap: Record<string, PublicAffiliateLink>;
}) {
  if (books.length === 0) return null;
  return (
    <section id={id} className="scroll-mt-24 py-6 sm:py-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        </div>
        <Link href={href} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50">সব দেখুন <span aria-hidden="true">→</span></Link>
      </div>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 [scrollbar-width:none] sm:gap-4">
        {books.map((book) => <div key={book.slug} className="w-[46%] min-w-[9.5rem] max-w-[14rem] shrink-0 snap-start sm:w-[30%] lg:w-[22%]"><BookCard book={book} buyLink={linkMap[book.slug] ?? null} /></div>)}
      </div>
    </section>
  );
}

function ProductRow({ products }: { products: CatalogProduct[] }) {
  if (!products.length) return null;
  return (
    <section className="py-6 sm:py-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div><h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Featured Products · প্রয়োজনীয় পণ্য</h2><p className="mt-1 text-sm text-slate-600">বাছাই করা প্রয়োজনীয় পণ্য</p></div>
        <Link href="/products" className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50">সব দেখুন →</Link>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {products.slice(0, 12).map((product) => (
          <Link key={product.id} href={`/products/${product.slug}`} className="w-36 shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-40">
            <div className="flex h-32 items-center justify-center rounded-xl bg-slate-50">
              {product.image_url ? <Image src={product.image_url} alt={product.title} width={140} height={140} unoptimized className="h-full w-full object-contain" /> : <span className="text-4xl" aria-hidden="true">🛍️</span>}
            </div>
            <p className="mt-3 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-800">{product.title}</p>
            <p className="mt-2 text-sm font-extrabold text-emerald-800">{product.price !== null ? `৳${new Intl.NumberFormat("en-BD").format(product.price)}` : "বিস্তারিত দেখুন"}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function HomeContent() {
  const [books, products, categories, homeSettings] = await Promise.all([
    loadBooks(), loadProducts(), loadCategoryTiles(), loadHomeConfig(),
  ]);
  const { config } = homeSettings;
  const linkMap = await getActiveAffiliateLinkMap(books.filter((book) => book.commerceMode === "affiliate").map((book) => book.slug));
  const newArrivals = books.slice(0, 12);
  const deals = books
    .map((book) => ({ book, savings: getSavings(book.price, book.listPrice) }))
    .filter((item) => item.savings !== null)
    .sort((a, b) => (b.savings?.percent ?? 0) - (a.savings?.percent ?? 0))
    .slice(0, 12)
    .map((item) => item.book);
  const popularBookCategories = (await getPublishedBookCategories()) ?? [];

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7faf8] pb-24 text-slate-900">
      <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-5 lg:px-8">
        {/* Search bar: query submits to the existing books search route. */}
        <form action="/books" method="get" role="search">
          <div className="flex min-h-12 rounded-xl border-2 border-emerald-700 bg-white p-1 shadow-sm">
            <label className="sr-only" htmlFor="home-search">বই, লেখক বা পণ্য খুঁজুন</label>
            <span className="flex items-center pl-2 text-slate-400" aria-hidden="true">⌕</span>
            <input id="home-search" name="q" type="search" placeholder="বই, লেখক, পণ্য ও ক্যাটাগরি খুঁজুন..." className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-500" />
            <button type="submit" className="min-h-10 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800">Search</button>
          </div>
        </form>

        {/* Promotional banner slider: swipe horizontally on mobile. */}
        <section aria-label="প্রচারমূলক ব্যানার" className="mt-4">
          <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {homeSettings.slides.map((slide, index) => (
              <Link key={slide.title} href={slide.href} className={`relative flex min-h-40 w-[92%] shrink-0 snap-center flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${slide.tone} p-5 text-white shadow-md sm:min-h-52 sm:w-[70%] sm:p-8 lg:w-[49%]`}>
                <span className="absolute -right-5 -top-8 size-36 rounded-full border-[18px] border-white/10" aria-hidden="true" />
                <span className="relative text-xl font-extrabold leading-snug sm:text-3xl">{slide.title}</span>
                <span className="relative mt-2 max-w-md text-sm text-emerald-50 sm:text-base">{slide.text}</span>
                <span className="relative mt-4 inline-flex w-fit rounded-lg bg-white px-4 py-2 text-sm font-bold text-emerald-900">{slide.cta} →</span>
                <span className="absolute bottom-3 right-4 text-xs text-white/70">{index + 1} / {homeSettings.slides.length}</span>
              </Link>
            ))}
          </div>
          <div className="mt-1 flex justify-center gap-1.5" aria-hidden="true">{homeSettings.slides.map((slide, index) => <span key={slide.title} className={`h-1.5 rounded-full ${index === 0 ? "w-5 bg-emerald-700" : "w-1.5 bg-slate-300"}`} />)}</div>
        </section>

        {/* Store benefits and curated discovery shortcuts. Keep claims limited to features currently available. */}
        <section aria-label="শিক্ষা নগরীর সুবিধা" className="mt-3 grid grid-cols-1 gap-2 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm sm:grid-cols-3 sm:gap-3 sm:p-4">
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50/70 px-3 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl" aria-hidden="true">📚</span>
            <div><p className="text-sm font-extrabold text-slate-900">বইয়ের বিশাল সংগ্রহ</p><p className="text-xs text-slate-600">বিভিন্ন বিষয়ের বই এক জায়গায়</p></div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50/70 px-3 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl" aria-hidden="true">🔎</span>
            <div><p className="text-sm font-extrabold text-slate-900">সহজে খুঁজে নিন</p><p className="text-xs text-slate-600">নাম, লেখক বা বিভাগ দিয়ে সার্চ</p></div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50/70 px-3 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl" aria-hidden="true">🛒</span>
            <div><p className="text-sm font-extrabold text-slate-900">সহজ অর্ডার</p><p className="text-xs text-slate-600">বইয়ের বিস্তারিত দেখে অর্ডার করুন</p></div>
          </div>
        </section>

        <section aria-labelledby="featured-collections" className="mt-5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><h2 id="featured-collections" className="text-lg font-extrabold text-slate-900 sm:text-xl">বিশেষ বইয়ের সংগ্রহ</h2><p className="mt-1 text-sm text-slate-600">আপনার প্রয়োজন অনুযায়ী বই খুঁজুন</p></div>
            <Link href="/books" className="shrink-0 text-sm font-bold text-emerald-800 hover:underline">সব বই →</Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link href="/books?q=আরবি" className="group relative flex min-h-32 items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-[#075b46] to-[#0b8061] p-5 text-white shadow-sm transition hover:shadow-md">
              <span className="relative z-10"><span className="block text-xs font-semibold text-emerald-100">ARABIC BOOKS</span><span className="mt-1 block text-xl font-extrabold">আরবি ও ইসলামি বই</span><span className="mt-2 inline-flex rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold">বই খুঁজুন →</span></span>
              <span className="absolute -right-2 -bottom-7 text-8xl opacity-20 transition group-hover:scale-110" aria-hidden="true">📖</span>
            </Link>
            <Link href="/books?q=বোর্ড" className="group relative flex min-h-32 items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-[#344c72] to-[#526b94] p-5 text-white shadow-sm transition hover:shadow-md">
              <span className="relative z-10"><span className="block text-xs font-semibold text-blue-100">BOARD BOOKS</span><span className="mt-1 block text-xl font-extrabold">বোর্ডের পাঠ্যবই</span><span className="mt-2 inline-flex rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold">বই খুঁজুন →</span></span>
              <span className="absolute -right-2 -bottom-7 text-8xl opacity-20 transition group-hover:scale-110" aria-hidden="true">🎓</span>
            </Link>
          </div>
        </section>

        {/* Category icon grid: root categories come from the active database taxonomy. */}
        {config.show_categories !== false && categories.length > 0 && (
          <section id="categories" aria-labelledby="home-categories" className="mt-4 rounded-2xl bg-white p-3 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between"><h2 id="home-categories" className="text-lg font-extrabold sm:text-xl">{config.categories_title || "Shop By Category · ক্যাটাগরি"}</h2><Link href="/products" className="text-xs font-bold text-emerald-800">সব ক্যাটাগরি →</Link></div>
            <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {categories.map((category) => (
                <Link key={category.id} href={category.category_group === "books" ? `/books?category=${encodeURIComponent(category.name)}` : `/products?category=${encodeURIComponent(category.name)}`} className="group flex min-w-0 flex-col items-center text-center">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 text-2xl shadow-inner transition group-hover:-translate-y-0.5 group-hover:shadow-md sm:size-16 sm:text-3xl" aria-hidden="true">{getCategoryIcon(category.name)}</span>
                  <span className="mt-1.5 line-clamp-2 min-h-8 text-[11px] font-semibold leading-4 text-slate-700 sm:text-xs">{category.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Curated book row: catalog records, not a claimed popularity ranking. */}
        <BookRow title="Explore Books · বইয়ের সংগ্রহ" subtitle="ক্যাটালগে প্রকাশিত বই থেকে বেছে নিন" href="/books" books={books.slice(0, 12)} linkMap={linkMap} />
        <ProductRow products={products} />

        {config.show_new_arrivals !== false && <BookRow id="new-arrivals" title={config.new_arrivals_title || "New Arrivals · নতুন বই"} subtitle="সদ্য যোগ হওয়া বই" href="/books?sort=newest" books={newArrivals} linkMap={linkMap} />}
        {config.show_deals !== false && <BookRow title={config.deals_title || "Best Deals · সেরা ছাড়"} subtitle="তালিকামূল্যের তুলনায় কম দামের বই" href="/books?sort=price-low" books={deals} linkMap={linkMap} />}

        {popularBookCategories.slice(0, 6).map((category) => (
          <BookRow key={category} title={category} href={`/books?category=${encodeURIComponent(category)}`} books={books.filter((book) => book.category === category).slice(0, 10)} linkMap={linkMap} />
        ))}

        {books.length === 0 && products.length === 0 ? (
          <p className="mt-8 rounded-2xl bg-white p-6 text-center text-slate-600">ক্যাটালগে নতুন আইটেম শীঘ্রই যোগ হবে। <Link href="/books" className="font-bold text-emerald-800 underline">বই দেখুন</Link> অথবা <Link href="/products" className="font-bold text-emerald-800 underline">পণ্য দেখুন</Link>।</p>
        ) : (
          <div className="mt-6 text-center"><Link href="/books" className="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-8 text-base font-bold text-white hover:bg-emerald-800">সব বই দেখুন · Explore All Books</Link></div>
        )}
      </div>
    </main>
  );
}
