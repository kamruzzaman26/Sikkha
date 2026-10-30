import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminBookImport } from "@/components/admin-book-import";
import {
  logoutAdmin,
  addProductType,
  saveAffiliateLink,
  saveProduct,
  setAffiliateLinkStatus,
  setProductArchiveStatus,
} from "./actions";
import { requireAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "অ্যাফিলিয়েট লিংক ব্যবস্থাপনা | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

const partnerNames = {
  rokomari: "Rokomari",
  "10_minute_school": "10 Minute School",
} as const;

function getPartnerName(partner: string | null): string | undefined {
  if (partner === "rokomari") {
    return partnerNames.rokomari;
  }
  if (partner === "10_minute_school") {
    return partnerNames["10_minute_school"];
  }

  return undefined;
}

const statusMessages: Record<string, string> = {
  activated: "অ্যাফিলিয়েট লিংক সক্রিয় করা হয়েছে।",
  created: "অ্যাফিলিয়েট লিংক যোগ করা হয়েছে।",
  deactivated: "অ্যাফিলিয়েট লিংক নিষ্ক্রিয় করা হয়েছে।",
  invalid:
    "তথ্য যাচাই করুন: HTTPS লিংক, অনুমোদিত পার্টনার hostname এবং পণ্য নির্বাচন আবশ্যক।",
  "link-not-found": "লিংকটি পাওয়া যায়নি বা আর সম্পাদনাযোগ্য নয়।",
  "partner-domain-unconfigured":
    "এই পার্টনারের অনুমোদিত hostname এখনো সেট করা হয়নি। ডেটাবেসে যাচাইকৃত hostname যোগ করুন।",
  "product-created": "ক্যাটালগে পণ্য যোগ করা হয়েছে।",
  "product-exists": "এই URL slug-সহ একটি পণ্য আগে থেকেই আছে।",
  "product-invalid": "পণ্যের তথ্য যাচাই করুন।",
  "product-not-found": "নির্বাচিত পণ্যটি পাওয়া যায়নি।",
  "product-not-affiliate":
    "সক্রিয় affiliate link-এর জন্য পণ্যটিকে আগে অ্যাফিলিয়েট পণ্য হিসেবে চিহ্নিত করুন।",
  "product-archived": "পণ্যটি আর্কাইভ করা হয়েছে; ঐতিহাসিক অর্ডার অক্ষত আছে।",
  "product-restored": "পণ্যটি আর্কাইভ থেকে ফিরিয়ে আনা হয়েছে; প্রকাশ করতে চাইলে আলাদা করে প্রকাশ করুন।",
  "product-updated": "ক্যাটালগের পণ্য হালনাগাদ করা হয়েছে।",
  "product-type-created": "নতুন পণ্যের ধরন যোগ করা হয়েছে।",
  "product-type-exists": "এই slug-এর পণ্যের ধরন আগে থেকেই আছে।",
  "product-type-invalid": "পণ্যের ধরন ও বাংলা নাম যাচাই করুন।",
  "deactivate-links-first":
    "বিক্রির ধরন বদলানোর আগে পণ্যটির সক্রিয় affiliate link নিষ্ক্রিয় করুন।",
  forbidden: "এই কাজের জন্য আপনার প্রশাসনিক অনুমতি নেই।",
  updated: "অ্যাফিলিয়েট লিংক হালনাগাদ করা হয়েছে।",
};

type ProductFormValue = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  price?: number;
  product_type?: string;
  category?: string | null;
  author?: string | null;
  publisher?: string | null;
  image_url?: string | null;
  commerce_mode?: "affiliate" | "direct" | null;
  is_published?: boolean;
  archived_at?: string | null;
};

function ProductForm({
  product,
  idPrefix,
  productTypes,
}: {
  product?: ProductFormValue;
  idPrefix: string;
  productTypes: Array<{ slug: string; label: string }>;
}) {
  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5";

  return (
    <form action={saveProduct} className="grid gap-4">
      {product?.id && <input type="hidden" name="id" value={product.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-title`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            নাম
          </label>
          <input
            id={`${idPrefix}-title`}
            name="title"
            required
            maxLength={200}
            defaultValue={product?.title ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-slug`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            URL slug (ইংরেজি ছোট অক্ষর ও হাইফেন)
          </label>
          <input
            id={`${idPrefix}-slug`}
            name="slug"
            required
            maxLength={160}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            defaultValue={product?.slug ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-type`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            ধরন
          </label>
          <select
            id={`${idPrefix}-type`}
            name="productType"
            required
            defaultValue={product?.product_type ?? "book"}
            className={inputClass}
          >
            {productTypes.map((type) => (
              <option key={type.slug} value={type.slug}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-category`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            বিভাগ
          </label>
          <input
            id={`${idPrefix}-category`}
            name="category"
            maxLength={120}
            defaultValue={product?.category ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-commerce-mode`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            বিক্রির ধরন
          </label>
          <select
            id={`${idPrefix}-commerce-mode`}
            name="commerceMode"
            required
            defaultValue={product?.commerce_mode ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              বিক্রির ধরন নির্বাচন করুন
            </option>
            <option value="affiliate">বাইরের বিক্রেতার affiliate পণ্য</option>
            <option value="direct">শিক্ষা নগরীর নিজস্ব বিক্রির পণ্য</option>
          </select>
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-price`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            নিজস্ব বিক্রির মূল্য (৳)
          </label>
          <input
            id={`${idPrefix}-price`}
            name="price"
            type="number"
            min="0"
            max="9999999999.99"
            step="0.01"
            defaultValue={
              product?.commerce_mode === "direct" ? product.price ?? "" : ""
            }
            className={inputClass}
          />
          <p className="mt-1 text-xs leading-5 text-slate-500">
            affiliate পণ্যের জন্য মূল্য দেবেন না; বিক্রেতার বর্তমান মূল্য তার
            সাইটে যাচাই করতে হবে।
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-author`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            লেখক বা ব্র্যান্ড
          </label>
          <input
            id={`${idPrefix}-author`}
            name="author"
            maxLength={160}
            defaultValue={product?.author ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-publisher`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            প্রকাশক বা ব্র্যান্ড
          </label>
          <input
            id={`${idPrefix}-publisher`}
            name="publisher"
            maxLength={160}
            defaultValue={product?.publisher ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-image-url`}
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          প্রচ্ছদ/ছবির HTTPS URL (ঐচ্ছিক)
        </label>
        <input
          id={`${idPrefix}-image-url`}
          name="imageUrl"
          type="url"
          inputMode="url"
          maxLength={2048}
          defaultValue={product?.image_url ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-description`}
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          বিবরণ
        </label>
        <textarea
          id={`${idPrefix}-description`}
          name="description"
          maxLength={5000}
          rows={3}
          defaultValue={product?.description ?? ""}
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          name="isPublished"
          value="true"
          defaultChecked={product?.is_published ?? false}
          className="size-4 rounded border-slate-300 text-emerald-700"
        />
        পাবলিক ক্যাটালগে প্রকাশ করুন
      </label>

      <button
        type="submit"
        className="w-fit rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
      >
        {product ? "পণ্য হালনাগাদ করুন" : "পণ্য যোগ করুন"}
      </button>
    </form>
  );
}

async function AdminContent({
  searchParams,
}: Pick<PageProps<"/admin">, "searchParams">) {
  await connection();
  const { supabase, role } = await requireAdmin("admin");
  const [productsResult, linksResult, productTypesResult] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, title, slug, description, price, product_type, category, author, publisher, image_url, commerce_mode, is_published, archived_at",
      )
      .order("title"),
    supabase
      .from("affiliate_links")
      .select(
        "id, product_id, url, partner, is_active, created_at, products(title, slug)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("product_types")
      .select("slug, label, is_active")
      .order("label"),
  ]);

  if (productsResult.error) {
    throw new Error("Unable to load products for affiliate links.", {
      cause: productsResult.error,
    });
  }
  if (linksResult.error) {
    throw new Error("Unable to load affiliate links.", {
      cause: linksResult.error,
    });
  }
  if (productTypesResult.error) {
    throw new Error("Unable to load product types.", {
      cause: productTypesResult.error,
    });
  }

  const params = await searchParams;
  const statusValue = Array.isArray(params.status)
    ? params.status[0]
    : params.status;
  const statusMessage =
    statusValue && Object.hasOwn(statusMessages, statusValue)
      ? statusMessages[statusValue]
      : undefined;
  const products = productsResult.data;
  const links = linksResult.data;
  const productQueryValue = Array.isArray(params.productQuery)
    ? params.productQuery[0]
    : params.productQuery;
  const productQueryInput = productQueryValue?.slice(0, 200) ?? "";
  const productQuery = productQueryInput.trim().toLocaleLowerCase("bn");
  const productTypeValue = Array.isArray(params.productTypeFilter)
    ? params.productTypeFilter[0]
    : params.productTypeFilter;
  const productTypeFilter =
    productTypesResult.data.some((type) => type.slug === productTypeValue)
      ? productTypeValue
      : "all";
  const publicationValue = Array.isArray(params.publicationFilter)
    ? params.publicationFilter[0]
    : params.publicationFilter;
  const publicationFilter =
    publicationValue === "published" || publicationValue === "draft"
      ? publicationValue
      : "all";
  const archivedValue = Array.isArray(params.archivedFilter)
    ? params.archivedFilter[0]
    : params.archivedFilter;
  const archivedFilter =
    archivedValue === "archived" || archivedValue === "active"
      ? archivedValue
      : "all";
  const filteredProducts = products.filter((product) => {
    const matchesType =
      productTypeFilter === "all" ||
      product.product_type === productTypeFilter;
    const matchesPublication =
      publicationFilter === "all" ||
      product.is_published === (publicationFilter === "published");
    const matchesArchive =
      archivedFilter === "all" ||
      Boolean(product.archived_at) === (archivedFilter === "archived");
    const searchableFields = [
      product.title,
      product.slug,
      product.description,
      product.category,
      product.author,
      product.publisher,
    ];
    const matchesQuery =
      !productQuery ||
      searchableFields.some((value) =>
        value?.toLocaleLowerCase("bn").includes(productQuery),
      );

    return matchesType && matchesPublication && matchesArchive && matchesQuery;
  });
  const hasProductFilters =
    productQuery !== "" ||
    productTypeFilter !== "all" ||
    publicationFilter !== "all" ||
    archivedFilter !== "all";
  const productTypes = productTypesResult.data
    .filter((type) => type.is_active)
    .map(({ slug, label }) => ({ slug, label }));
  const productGroups = productTypesResult.data
    .map(({ slug, label, is_active }) => ({
      slug,
      title: is_active ? label : `${label} · নিষ্ক্রিয়`,
      entries: filteredProducts.filter(
        (product) => product.product_type === slug,
      ),
    }))
    .filter(
      ({ slug, entries }) =>
        entries.length > 0 || productTypeFilter === slug,
    );
  const affiliateProducts = products.filter(
    (product) =>
      product.commerce_mode === "affiliate" && !product.archived_at,
  );

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="font-semibold text-emerald-700">
            ← শিক্ষা নগরী
          </Link>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              লগআউট
            </button>
          </form>
        </div>

        <header className="mt-8">
          <p className="text-sm font-bold text-emerald-700">
            শিক্ষা নগরী · প্রশাসন
          </p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            অ্যাফিলিয়েট লিংক ব্যবস্থাপনা
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            পণ্যের ধরন, বিক্রির মাধ্যম, বিভাগ ও প্রচ্ছদ পরিচালনা করুন। বাইরের
            বিক্রেতার পণ্য checkout-এ অর্ডারযোগ্য হবে না।
          </p>
        </header>

        {role === "admin" && (
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin/payments"
              className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 py-2.5 font-semibold text-emerald-800 transition hover:bg-emerald-50"
            >
              পেমেন্ট মেথড পরিচালনা
            </Link>
            <Link
              href="/admin/orders"
              className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 py-2.5 font-semibold text-emerald-800 transition hover:bg-emerald-50"
            >
              অর্ডার পরিচালনা
            </Link>
            <Link
              href="/admin/affiliates"
              className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 py-2.5 font-semibold text-emerald-800 transition hover:bg-emerald-50"
            >
              অ্যাফিলিয়েট অ্যাকাউন্ট
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 py-2.5 font-semibold text-emerald-800 transition hover:bg-emerald-50"
            >
              ব্যবহারকারী পরিচালনা
            </Link>
          </div>
        )}

        {statusMessage && (
          <p
            role="status"
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-medium text-emerald-900"
          >
            {statusMessage}
          </p>
        )}

        {role === "admin" && <AdminBookImport />}

        {role === "admin" && (
        <section
          id="product-catalog"
          className="mt-8 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7"
        >
          <h2 className="text-xl font-bold">পণ্য ক্যাটালগ</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            প্রকাশিত ও শ্রেণিবদ্ধ পণ্য public catalog-এ দেখানো হয়। Affiliate
            পণ্যের বর্তমান মূল্য প্রকাশ করা হয় না; সরাসরি বিক্রির পণ্যের জন্য
            যাচাইকৃত নিজস্ব মূল্য দিন।
          </p>

          {role === "admin" && (
            <details className="mt-5 rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer font-bold text-emerald-900">
                ক্যাটালগে পণ্য যোগ করুন
              </summary>
              <div className="mt-4">
                <ProductForm
                  idPrefix="new-product"
                  productTypes={productTypes}
                />
              </div>
            </details>
          )}

          <form
            action="/admin"
            method="get"
            role="search"
            className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_9rem_auto] sm:items-end"
          >
            <div>
              <label
                htmlFor="admin-product-query"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                নাম, slug, বিভাগ, লেখক/প্রকাশক বা বিবরণ
              </label>
              <input
                id="admin-product-query"
                name="productQuery"
                type="search"
                defaultValue={productQueryInput}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
              />
            </div>
            <div>
              <label
                htmlFor="admin-product-type"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                পণ্যের ধরন
              </label>
              <select
                id="admin-product-type"
                name="productTypeFilter"
                defaultValue={productTypeFilter}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
              >
                <option value="all">সব ধরন</option>
                {productTypes.map((type) => (
                  <option key={type.slug} value={type.slug}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="admin-product-archive"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                আর্কাইভ অবস্থা
              </label>
              <select
                id="admin-product-archive"
                name="archivedFilter"
                defaultValue={archivedFilter}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
              >
                <option value="all">সব পণ্য</option>
                <option value="active">আর্কাইভে নেই</option>
                <option value="archived">আর্কাইভ</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="admin-product-publication"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                প্রকাশনার অবস্থা
              </label>
              <select
                id="admin-product-publication"
                name="publicationFilter"
                defaultValue={publicationFilter}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
              >
                <option value="all">সব অবস্থা</option>
                <option value="published">প্রকাশিত</option>
                <option value="draft">অপ্রকাশিত</option>
              </select>
            </div>
            <button
              type="submit"
              className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              খুঁজুন
            </button>
            {hasProductFilters && (
              <Link
                href="/admin#product-catalog"
                className="min-h-11 content-center text-sm font-semibold text-emerald-800 underline underline-offset-2 sm:col-span-full"
              >
                ফিল্টার মুছুন
              </Link>
            )}
          </form>

          <p aria-live="polite" className="mt-4 text-sm text-slate-600">
            {filteredProducts.length}টি পণ্য দেখানো হচ্ছে · মোট {products.length}টি
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {productGroups.map(({ slug, title, entries }) => (
              <section key={slug} aria-label={`${title} ক্যাটালগ`}>
                <h3 className="font-bold">
                  {title} · {entries.length}
                </h3>
                {entries.length === 0 ? (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-600">
                    {hasProductFilters
                      ? `এই ফিল্টারে কোনো ${title} পাওয়া যায়নি।`
                      : `এখনো কোনো ${title} যোগ করা হয়নি।`}
                  </p>
                ) : (
                  <ul className="mt-3 grid gap-3">
                    {entries.map((product) => (
                      <li
                        key={product.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="mb-3 flex flex-wrap justify-between gap-2">
                          <p className="font-semibold">
                            {product.title}{" "}
                            <span className="font-normal text-slate-500">
                              · {product.slug}
                            </span>
                          </p>
                          <span className="text-xs font-bold text-slate-600">
                            {product.archived_at
                              ? "আর্কাইভ"
                              : product.is_published
                                ? "প্রকাশিত"
                                : "খসড়া"}
                            {product.commerce_mode
                              ? ` · ${
                                  product.commerce_mode === "affiliate"
                                    ? "affiliate"
                                    : "নিজস্ব বিক্রি"
                                }`
                              : " · বিক্রির ধরন নির্বাচন প্রয়োজন"}
                          </span>
                        </div>
                        <article
                          aria-label={`${product.title} পণ্যের কার্ড প্রিভিউ`}
                          className="mt-3 flex max-w-sm gap-3 rounded-xl border border-slate-200 bg-white p-3"
                        >
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={`${product.title} পণ্যের প্রচ্ছদ`}
                              width={72}
                              height={96}
                              unoptimized
                              className="h-24 w-[4.5rem] shrink-0 rounded-lg bg-slate-100 object-cover"
                            />
                          ) : (
                            <div
                              role="img"
                              aria-label={`${product.title} পণ্যের ছবি নেই`}
                              className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center rounded-lg bg-emerald-50 px-1 text-center text-xs text-emerald-900"
                            >
                              ছবি নেই
                            </div>
                          )}
                          <div className="min-w-0">
                            {product.category && (
                              <p className="text-xs font-semibold text-emerald-700">
                                {product.category}
                              </p>
                            )}
                            <p className="mt-1 line-clamp-2 font-bold">
                              {product.title}
                            </p>
                            {(product.author || product.publisher) && (
                              <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                                {[product.author, product.publisher]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                          </div>
                        </article>
                        {role === "admin" && (
                          <>
                            <details>
                              <summary className="cursor-pointer text-sm font-semibold text-emerald-800">
                                সম্পাদনা
                              </summary>
                              <div className="mt-4">
                                <ProductForm
                                  product={product}
                                  idPrefix={`product-${product.id}`}
                                  productTypes={productTypes}
                                />
                              </div>
                            </details>
                            <form
                              action={setProductArchiveStatus}
                              className="mt-3"
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={product.id}
                              />
                              <input
                                type="hidden"
                                name="archive"
                                value={product.archived_at ? "false" : "true"}
                              />
                              <button
                                type="submit"
                                className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                {product.archived_at
                                  ? "আর্কাইভ থেকে ফিরিয়ে আনুন"
                                  : "আর্কাইভ করুন"}
                              </button>
                            </form>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </section>
        )}

        {role === "admin" && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold">পণ্যের ধরন বাড়ান</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              নতুন ধরন যোগ করলে তা পণ্য ফর্মে নির্বাচন করা যাবে। ব্যবহৃত ধরন
              মুছে ফেলা হয় না।
            </p>
            <form
              action={addProductType}
              className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
            >
              <div>
                <label
                  htmlFor="new-product-type-label"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  ধরনটির নাম
                </label>
                <input
                  id="new-product-type-label"
                  name="label"
                  required
                  maxLength={120}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>
              <div>
                <label
                  htmlFor="new-product-type-slug"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  URL slug
                </label>
                <input
                  id="new-product-type-slug"
                  name="slug"
                  required
                  maxLength={80}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>
              <button
                type="submit"
                className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
              >
                ধরন যোগ করুন
              </button>
            </form>
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-bold">নতুন অ্যাফিলিয়েট লিংক যোগ</h2>
          {affiliateProducts.length === 0 ? (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 leading-6 text-amber-900">
              প্রথমে কোনো পণ্যকে affiliate বিক্রির ধরন দিয়ে সংরক্ষণ করতে হবে।
            </p>
          ) : (
            <form action={saveAffiliateLink} className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="new-product"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    পণ্য
                  </label>
                  <select
                    id="new-product"
                    name="productId"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                  >
                    <option value="" disabled>
                      একটি পণ্য নির্বাচন করুন
                    </option>
                    {affiliateProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title} · {product.slug}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="new-partner"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    অ্যাফিলিয়েট পার্টনার
                  </label>
                  <select
                    id="new-partner"
                    name="partner"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                  >
                    <option value="" disabled>
                      পার্টনার নির্বাচন করুন
                    </option>
                    {Object.entries(partnerNames).map(([value, name]) => (
                      <option key={value} value={value}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="new-url"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  অনুমোদিত Affiliate URL (HTTPS)
                </label>
                <input
                  id="new-url"
                  name="url"
                  type="url"
                  inputMode="url"
                  required
                  maxLength={2048}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>

              <button
                type="submit"
                className="w-fit rounded-lg bg-emerald-700 px-5 py-2.5 font-bold text-white transition hover:bg-emerald-800"
              >
                লিংক যোগ করুন
              </button>
            </form>
          )}
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">সংরক্ষিত অ্যাফিলিয়েট লিংক</h2>
              <p className="mt-1 text-sm text-slate-600">
                মোট {links.length}টি লিংক
              </p>
            </div>
          </div>

          {links.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-slate-600">
              এখনো কোনো অ্যাফিলিয়েট লিংক যোগ করা হয়নি।
            </p>
          ) : (
            <ul className="mt-4 grid gap-4">
              {links.map((link) => {
                const partnerName = getPartnerName(link.partner);

                return (
                  <li
                    key={link.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold">
                          {link.products?.[0]?.title ?? "পণ্য পাওয়া যায়নি"}
                        </h3>
                        <p className="mt-1 break-all text-sm text-slate-600">
                          {partnerName ?? "পার্টনার নির্বাচন করুন"} · {link.url}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-bold ${
                          link.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {link.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                      </span>
                    </div>

                    <form
                      action={saveAffiliateLink}
                      className="grid gap-4 border-t border-slate-100 pt-4"
                    >
                      <input type="hidden" name="id" value={link.id} />
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`product-${link.id}`}
                            className="mb-2 block text-sm font-semibold text-slate-700"
                          >
                            পণ্য
                          </label>
                          <select
                            id={`product-${link.id}`}
                            name="productId"
                            required
                            defaultValue={link.product_id}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                          >
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.product_type === "course"
                                  ? "কোর্স"
                                  : "বই"}
                                : {product.title} · {product.slug}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor={`partner-${link.id}`}
                            className="mb-2 block text-sm font-semibold text-slate-700"
                          >
                            অ্যাফিলিয়েট পার্টনার
                          </label>
                          <select
                            id={`partner-${link.id}`}
                            name="partner"
                            required
                            defaultValue={link.partner ?? ""}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                          >
                            <option value="" disabled>
                              পার্টনার নির্বাচন করুন
                            </option>
                            {Object.entries(partnerNames).map(
                              ([value, name]) => (
                                <option key={value} value={value}>
                                  {name}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor={`url-${link.id}`}
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Affiliate URL (HTTPS)
                        </label>
                        <input
                          id={`url-${link.id}`}
                          name="url"
                          type="url"
                          inputMode="url"
                          required
                          maxLength={2048}
                          defaultValue={link.url}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
                        >
                          পরিবর্তন সংরক্ষণ
                        </button>
                      </div>
                    </form>

                    <form
                      action={setAffiliateLinkStatus}
                      className="mt-3"
                    >
                      <input type="hidden" name="id" value={link.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={link.is_active ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        {link.is_active ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

export default function AdminPage({
  searchParams,
}: PageProps<"/admin">) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-5xl animate-pulse rounded-2xl bg-white p-8">
            <div className="h-8 w-64 rounded bg-slate-100" />
            <div className="mt-8 h-40 rounded-xl bg-slate-100" />
            <div className="mt-6 h-56 rounded-xl bg-slate-100" />
          </div>
        </main>
      }
    >
      <AdminContent searchParams={searchParams} />
    </Suspense>
  );
}
