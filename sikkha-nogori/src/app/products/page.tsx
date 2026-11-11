import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CatalogProductCard } from "@/components/catalog-product-card";
import { getPublishedProductCategories, getPublishedProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "শিক্ষা উপকরণ ও অন্যান্য পণ্য | শিক্ষা নগরী",
  description: "শিক্ষা নগরীর প্রকাশিত শিক্ষা উপকরণ ও অন্যান্য পণ্য দেখুন।",
};

type ProductSearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  page?: string | string[];
  sort?: string | string[];
  instock?: string | string[];
}>;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function categoryDescription(category: string): string {
  if (category === "ইলেকট্রনিক্স") return "ইলেকট্রনিক্স বিভাগের প্রকাশিত পণ্য দেখুন।";
  if (category === "কিডস জোন") return "শিশুদের প্রয়োজনীয় প্রকাশিত পণ্য ও উপকরণ দেখুন।";
  if (category === "সুপার স্টোর") return "শিক্ষা নগরীর সুপার স্টোরের প্রকাশিত পণ্য দেখুন।";
  return category ? `${category} বিভাগের প্রকাশিত পণ্য দেখুন।` : "বই ও কোর্সের বাইরে প্রকাশিত শিক্ষা উপকরণ এবং অন্যান্য পণ্য খুঁজুন। বাইরের বিক্রেতার পণ্য শিক্ষা নগরীর checkout-এ বিক্রি হয় না।";
}

async function ProductResults({ searchParams }: { searchParams: ProductSearchParams }) {
  const params = await searchParams;
  const query = firstValue(params.q).trim().slice(0, 100);
  const category = firstValue(params.category).trim().slice(0, 120);
  if (category === "ই-বুক" || category === "ebooks") redirect(`/books?category=${encodeURIComponent("ই-বুক")}`);
  const sortValue = firstValue(params.sort);
  const sort = ["name-desc", "newest", "price-low", "price-high"].includes(sortValue)
    ? (sortValue as "name-desc" | "newest" | "price-low" | "price-high")
    : "name-asc";
  const inStock = firstValue(params.instock) === "1";
  const pageValue = Number.parseInt(firstValue(params.page), 10);
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 && pageValue <= 100000 ? pageValue : 1;
  const [productPage, categories] = await Promise.all([
    getPublishedProducts({ page, query, category: category || undefined, sort, inStock }),
    getPublishedProductCategories(),
  ]);

  if (productPage === null) {
    return <p className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 leading-7 text-amber-950">পণ্য ক্যাটালগের ডেটাবেস সেটআপ এখনো প্রস্তুত নয়। প্রয়োজনীয় product-management migration যাচাই করুন।</p>;
  }

  const pageCount = Math.max(1, Math.ceil(productPage.total / 24));
  const pageHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (category) search.set("category", category);
    if (sort !== "name-asc") search.set("sort", sort);
    if (inStock) search.set("instock", "1");
    if (nextPage > 1) search.set("page", String(nextPage));
    return search.toString() ? `/products?${search}` : "/products";
  };

  return (
    <>
      <nav aria-label="পণ্য বিভাগ" className="mt-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
        <Link href="/products" aria-current={!category ? "page" : undefined} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${!category ? "bg-emerald-800 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>সব পণ্য</Link>
        {(categories ?? []).map((name) => <Link key={name} href={`/products?category=${encodeURIComponent(name)}`} aria-current={category === name ? "page" : undefined} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${category === name ? "bg-emerald-800 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{name}</Link>)}
      </nav>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">মোট <span className="font-bold text-slate-900">{productPage.total}</span>টি পণ্য{inStock ? " · স্টকে আছে" : ""}</p>
        {(query || category || inStock || sort !== "name-asc") && <Link href={category ? `/products?category=${encodeURIComponent(category)}` : "/products"} className="text-sm font-semibold text-emerald-800 hover:underline">ফিল্টার রিসেট</Link>}
      </div>
      {productPage.products.length > 0 ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {productPage.products.map((product) => <CatalogProductCard key={product.id} product={product} />)}
          </div>
          {pageCount > 1 && <nav aria-label="পণ্য তালিকার পৃষ্ঠা" className="mt-8 flex items-center justify-center gap-3">
            {page > 1 && <Link href={pageHref(page - 1)} className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50">আগের পৃষ্ঠা</Link>}
            <span aria-current="page" className="text-sm text-slate-600">{page} / {pageCount}</span>
            {page < pageCount && <Link href={pageHref(page + 1)} className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50">পরের পৃষ্ঠা</Link>}
          </nav>}
        </>
      ) : (
        <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-2xl" aria-hidden="true">⌕</div>
          <h2 className="mt-4 text-xl font-bold">{category ? `${category} বিভাগে এখনো পণ্য নেই` : "এখনো কোনো পণ্য প্রকাশিত হয়নি"}</h2>
          <p className="mt-2 text-sm text-slate-600">{category ? "এই বিভাগে পণ্য যুক্ত ও প্রকাশ করা হলে এখানে দেখা যাবে।" : "নতুন পণ্য প্রকাশিত হলে এখানে দেখা যাবে।"}</p>
          <Link href="/products" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-900">সব পণ্য দেখুন</Link>
        </section>
      )}
    </>
  );
}

async function ProductContent({ searchParams }: { searchParams: ProductSearchParams }) {
  const params = await searchParams;
  const category = firstValue(params.category).trim().slice(0, 120);
  if (category === "ই-বুক" || category === "ebooks") redirect(`/books?category=${encodeURIComponent("ই-বুক")}`);
  return (
    <>
      <header className="mt-6 rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-700 px-5 py-7 text-white sm:px-8 sm:py-9">
        <p className="text-sm font-semibold text-emerald-100">শিক্ষা নগরী · Shop</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{category || "শিক্ষা উপকরণ ও অন্যান্য পণ্য"}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-50 sm:text-base">{categoryDescription(category)}</p>
      </header>
      <ProductResults searchParams={searchParams} />
    </>
  );
}

export default function ProductsPage({ searchParams }: { searchParams: ProductSearchParams }) {
  return (
    <main className="min-h-screen bg-[#f6f8f7] px-4 py-7 text-slate-900 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav aria-label="পথনির্দেশ" className="text-sm text-slate-500"><Link href="/" className="font-semibold text-emerald-800 hover:underline">হোম</Link><span className="px-2" aria-hidden="true">/</span><span>পণ্য</span></nav>
        <Suspense fallback={<div aria-label="পণ্য লোড হচ্ছে" className="mt-7 h-72 animate-pulse rounded-2xl bg-white" />}>
          <ProductContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
