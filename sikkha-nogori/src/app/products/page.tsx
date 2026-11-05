import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CatalogProductCard } from "@/components/catalog-product-card";
import {
  getPublishedProductCategories,
  getPublishedProducts,
  getPublishedProductTypes,
} from "@/lib/catalog";

export const metadata: Metadata = {
  title: "শিক্ষা উপকরণ ও অন্যান্য পণ্য | শিক্ষা নগরী",
  description: "শিক্ষা নগরীর প্রকাশিত শিক্ষা উপকরণ ও অন্যান্য পণ্য দেখুন।",
};

type ProductSearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  type?: string | string[];
  page?: string | string[];
  sort?: string | string[];
}>;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function ProductResults({
  searchParams,
}: {
  searchParams: ProductSearchParams;
}) {
  const params = await searchParams;
  const query = firstValue(params.q).trim().slice(0, 100);
  const category = firstValue(params.category).trim().slice(0, 120);
  const sortValue = firstValue(params.sort);
  const sort = sortValue === "name-desc" ? "name-desc" : "name-asc";
  const pageValue = Number.parseInt(firstValue(params.page), 10);
  const page =
    Number.isSafeInteger(pageValue) && pageValue > 0 && pageValue <= 100000
      ? pageValue
      : 1;
  const [productTypes, categories] = await Promise.all([
    getPublishedProductTypes(),
    getPublishedProductCategories(),
  ]);
  const requestedType = firstValue(params.type);
  const productType = productTypes?.some(
    (type) => type.slug === requestedType,
  )
    ? requestedType
    : undefined;
  const productPage =
    productTypes === null
      ? null
      : await getPublishedProducts({
          page,
          query,
          category: category || undefined,
          productType,
          sort,
        });
  const pageCount = Math.max(
    1,
    Math.ceil((productPage?.total ?? 0) / 24),
  );
  const pageHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (category) search.set("category", category);
    if (productType) search.set("type", productType);
    if (sort !== "name-asc") search.set("sort", sort);
    if (nextPage > 1) search.set("page", String(nextPage));
    const suffix = search.toString();
    return suffix ? `/products?${suffix}` : "/products";
  };

  if (productPage === null || productTypes === null) {
    return (
      <p className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 leading-7 text-amber-950">
        পণ্য ক্যাটালগের ডেটাবেস সেটআপ এখনো প্রস্তুত নয়। প্রয়োজনীয়
        product-management migration অনুমোদন ও প্রয়োগের পর পণ্য এখানে দেখা যাবে।
      </p>
    );
  }

  return (
    <>
      <form
        action="/products"
        method="get"
        className="mt-7 grid gap-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(10rem,0.5fr)_minmax(10rem,0.5fr)_minmax(9rem,0.4fr)_auto] sm:items-end sm:p-5"
      >
        <div>
          <label
            htmlFor="product-query"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            নাম, লেখক/ব্র্যান্ড বা বিবরণ
          </label>
          <input
            id="product-query"
            name="q"
            type="search"
            defaultValue={query}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div>
          <label
            htmlFor="product-type"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            পণ্যের ধরন
          </label>
          <select
            id="product-type"
            name="type"
            defaultValue={productType ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">সব ধরন</option>
            {productTypes.map((type) => (
              <option key={type.slug} value={type.slug}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="product-category"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            বিভাগ
          </label>
          <select
            id="product-category"
            name="category"
            defaultValue={category}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">সব বিভাগ</option>
            {(categories ?? []).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="product-sort"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            সাজান
          </label>
          <select
            id="product-sort"
            name="sort"
            defaultValue={sort}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
          >
            <option value="name-asc">নাম: ক থেকে হ</option>
            <option value="name-desc">নাম: হ থেকে ক</option>
          </select>
        </div>
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
        >
          খুঁজুন
        </button>
      </form>

      {productPage.products.length > 0 ? (
        <>
          <p className="mt-6 text-sm text-slate-600">
            মোট {productPage.total}টি পণ্য
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {productPage.products.map((product) => (
              <CatalogProductCard
                key={product.id}
                product={product}
                productType={productTypes.find(
                  (type) => type.slug === product.product_type,
                )}
              />
            ))}
          </div>
          {pageCount > 1 && (
            <nav
              aria-label="পণ্য তালিকার পৃষ্ঠা"
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
        <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <h2 className="text-xl font-bold">কোনো পণ্য পাওয়া যায়নি</h2>
          <p className="mt-2 text-sm text-slate-600">
            অন্য শব্দ বা বিভাগ দিয়ে খুঁজে দেখুন।
          </p>
          <Link
            href="/products"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
          >
            সব পণ্য দেখুন
          </Link>
        </section>
      )}
    </>
  );
}

export default function ProductsPage({
  searchParams,
}: {
  searchParams: ProductSearchParams;
}) {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-900 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav aria-label="পথনির্দেশ" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-emerald-800 hover:underline">
            হোম
          </Link>
          <span className="px-2" aria-hidden="true">/</span>
          <span>অন্যান্য পণ্য</span>
        </nav>
        <header className="mt-6">
          <p className="text-sm font-bold text-emerald-700">শিক্ষা নগরী</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            শিক্ষা উপকরণ ও অন্যান্য পণ্য
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            বই ও কোর্সের বাইরে প্রকাশিত শিক্ষা উপকরণ এবং অন্যান্য পণ্য খুঁজুন।
            বাইরের বিক্রেতার পণ্য শিক্ষা নগরীর checkout-এ বিক্রি হয় না।
          </p>
        </header>
        <Suspense
          fallback={
            <div
              aria-label="পণ্য লোড হচ্ছে"
              className="mt-7 h-72 animate-pulse rounded-2xl bg-white"
            />
          }
        >
          <ProductResults searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
