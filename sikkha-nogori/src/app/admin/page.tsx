import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminBookImport } from "@/components/admin-book-import";
import { AdminIcon } from "@/components/admin-icons";
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
  title: "Affiliate & Catalog Management | Sikkha Nogori",
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
  activated: "Affiliate link activated successfully.",
  created: "Affiliate link created successfully.",
  deactivated: "Affiliate link deactivated successfully.",
  invalid:
    "Please verify the HTTPS URL, approved partner domain, and selected product.",
  "link-not-found": "The link was not found or is no longer editable.",
  "partner-domain-unconfigured":
    "No approved hostname is configured for this partner. Add a verified hostname in the database.",
  "product-created": "Product added to the catalog.",
  "product-exists": "A product with this URL slug already exists.",
  "product-invalid": "Please verify the product details.",
  "product-not-found": "The selected product was not found.",
  "product-not-affiliate":
    "Mark this product as an affiliate product before creating an active affiliate link.",
  "product-archived": "Product archived. Historical orders remain unchanged.",
  "product-restored": "Product restored from archive. Publish it separately if it should appear in the public catalog.",
  "product-updated": "Catalog product updated successfully.",
  "product-type-created": "New product type added.",
  "product-type-exists": "A product type with this slug already exists.",
  "product-type-invalid": "Please verify the product type and display name.",
  "deactivate-links-first":
    "Deactivate this product’s active affiliate links before changing its sales mode.",
  forbidden: "You do not have permission to perform this action.",
  updated: "Affiliate link updated successfully.",
};

type ProductFormValue = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  price?: number;
  list_price?: number | null;
  edition?: string | null;
  isbn?: string | null;
  page_count?: number | null;
  language?: string | null;
  country?: string | null;
  weight_kg?: number | string | null;
  product_type?: string;
  category?: string | null;
  author?: string | null;
  publisher?: string | null;
  image_url?: string | null;
  commerce_mode?: "affiliate" | "direct" | null;
  is_published?: boolean;
  archived_at?: string | null;
};

type CategoryOption = { id: string; label: string; group: string };

function ProductForm({
  product,
  idPrefix,
  productTypes,
  categoryOptions = [],
  selectedCategoryIds = [],
  primaryCategoryId = "",
}: {
  product?: ProductFormValue;
  idPrefix: string;
  productTypes: Array<{ slug: string; label: string }>;
  categoryOptions?: CategoryOption[];
  selectedCategoryIds?: string[];
  primaryCategoryId?: string;
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
            Name
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
            URL slug (lowercase letters and hyphens)
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
            Type
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
            Category
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
            Sales Type
          </label>
          <select
            id={`${idPrefix}-commerce-mode`}
            name="commerceMode"
            required
            defaultValue={product?.commerce_mode ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Select Sales Type
            </option>
            <option value="affiliate">Third-party affiliate product</option>
            <option value="direct">Sikkha Nogori direct-sale product</option>
          </select>
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-price`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Price (৳)
          </label>
          <input
            id={`${idPrefix}-price`}
            name="price"
            type="number"
            min="0"
            max="9999999999.99"
            step="0.01"
            defaultValue={product?.price ?? ""}
            className={inputClass}
          />
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Price is required for direct-sale products and optional for affiliate products. If provided,
            it will be displayed on the site. Keep it aligned with the seller’s current price
            and update it regularly.
          </p>
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-list-price`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            List Price (৳, optional)
          </label>
          <input
            id={`${idPrefix}-list-price`}
            name="listPrice"
            type="number"
            min="0"
            max="9999999999.99"
            step="0.01"
            defaultValue={product?.list_price ?? ""}
            className={inputClass}
          />
          <p className="mt-1 text-xs leading-5 text-slate-500">
            If provided, the crossed-out price and discount will be shown. It cannot be lower than the selling price.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label
            htmlFor={`${idPrefix}-edition`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Edition (optional)
          </label>
          <input
            id={`${idPrefix}-edition`}
            name="edition"
            maxLength={80}
            defaultValue={product?.edition ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-isbn`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            ISBN (optional)
          </label>
          <input
            id={`${idPrefix}-isbn`}
            name="isbn"
            maxLength={30}
            defaultValue={product?.isbn ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-pageCount`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Page Count (optional)
          </label>
          <input
            id={`${idPrefix}-pageCount`}
            name="pageCount"
            type="number" min="1" max="20000" step="1"
            defaultValue={product?.page_count ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-language`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Language (optional)
          </label>
          <input
            id={`${idPrefix}-language`}
            name="language"
            maxLength={60}
            defaultValue={product?.language ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-country`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Country (optional)
          </label>
          <input
            id={`${idPrefix}-country`}
            name="country"
            maxLength={60}
            defaultValue={product?.country ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-weightKg`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Weight (kg, optional)
          </label>
          <input
            id={`${idPrefix}-weightKg`}
            name="weightKg"
            type="number" min="0" max="1000" step="0.001"
            defaultValue={product?.weight_kg ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-author`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Author or Brand
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
            Publisher or Brand
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
          Cover / Image HTTPS URL (optional)
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

      {categoryOptions.length > 0 && (
        <fieldset className="rounded-xl border border-slate-200 p-4">
          <input type="hidden" name="categoriesSubmitted" value="1" />
          <legend className="px-1 text-sm font-semibold text-slate-700">
            Categories (select multiple)
          </legend>
          <details className="mt-1" open={selectedCategoryIds.length === 0}>
            <summary className="cursor-pointer text-sm font-semibold text-emerald-800">
              {selectedCategoryIds.length} selected — Open list
            </summary>
            <div className="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-lg border border-slate-100 p-2">
              {categoryOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex min-h-9 items-start gap-2 text-sm leading-6"
                >
                  <input
                    type="checkbox"
                    name="categoryIds"
                    value={option.id}
                    defaultChecked={selectedCategoryIds.includes(option.id)}
                    className="mt-1.5 size-4"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </details>
          <label
            htmlFor={`${idPrefix}-primary-category`}
            className="mb-1 mt-3 block text-sm font-semibold text-slate-700"
          >
            Primary Category
          </label>
          <select
            id={`${idPrefix}-primary-category`}
            name="primaryCategoryId"
            defaultValue={primaryCategoryId}
            className={inputClass}
          >
            <option value="">— First selected category —</option>
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </fieldset>
      )}

      <div>
        <label
          htmlFor={`${idPrefix}-description`}
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Description
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
        Publish in public catalog
      </label>

      <button
        type="submit"
        className="w-fit rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
      >
        {product ? "Update Product" : "Add Product"}
      </button>
    </form>
  );
}

async function AdminContent({
  searchParams,
}: Pick<PageProps<"/admin">, "searchParams">) {
  await connection();
  const { supabase, role } = await requireAdmin("admin");
  const [
    productsResult,
    linksResult,
    productTypesResult,
    categoriesResult,
    productCategoriesResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, title, slug, description, price, list_price, edition, isbn, page_count, language, country, weight_kg, product_type, category, author, publisher, image_url, commerce_mode, is_published, archived_at",
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
    supabase
      .from("categories")
      .select("id, name, parent_id, category_group, sort_order, is_active")
      .order("category_group")
      .order("sort_order")
      .limit(2000),
    supabase
      .from("product_categories")
      .select("product_id, category_id, is_primary")
      .limit(10000),
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

  if (categoriesResult.error || productCategoriesResult.error) {
    console.error(
      "Unable to load categories for the product form.",
      categoriesResult.error ?? productCategoriesResult.error,
    );
  }
  const categoryRows = categoriesResult.data ?? [];
  const categoryById = new Map(categoryRows.map((row) => [row.id, row]));
  const groupLabelsForForm: Record<string, string> = {
    books: "Books",
    products: "Products",
    electronics: "Electronics",
  };
  const categoryOptions: CategoryOption[] = categoryRows
    .filter((row) => row.is_active)
    .map((row) => {
      const names = [row.name];
      let cursor = row.parent_id ? categoryById.get(row.parent_id) : undefined;
      while (cursor) {
        names.unshift(cursor.name);
        cursor = cursor.parent_id ? categoryById.get(cursor.parent_id) : undefined;
      }
      return {
        id: row.id,
        group: row.category_group,
        label: `${groupLabelsForForm[row.category_group] ?? row.category_group} › ${names.join(" › ")}`,
      };
    });
  const selectedByProduct = new Map<string, string[]>();
  const primaryByProduct = new Map<string, string>();
  for (const link of productCategoriesResult.data ?? []) {
    selectedByProduct.set(link.product_id, [
      ...(selectedByProduct.get(link.product_id) ?? []),
      link.category_id,
    ]);
    if (link.is_primary) {
      primaryByProduct.set(link.product_id, link.category_id);
    }
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
      title: is_active ? label : `${label} · Inactive`,
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
    <main lang="en" className="min-h-screen bg-[#f3f7f5] px-4 py-6 text-slate-900 sm:px-7 sm:py-8 xl:px-10">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="font-semibold text-emerald-700">
            ← Sikkha Nogori
          </Link>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Sign out
            </button>
          </form>
        </div>

        <header className="mt-7 rounded-[28px] bg-gradient-to-br from-[#0b5949] via-[#0a493e] to-[#082f29] px-6 py-7 text-white shadow-[0_18px_45px_-28px_rgba(5,48,39,0.75)] sm:px-8 sm:py-9">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-emerald-200">
            SIKKHA NOGORI · ADMINISTRATION
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Affiliate & Catalog Management
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-emerald-50/80 sm:text-base">
            Manage product types, sales channels, categories, and cover images. Third-party
            seller products are not available for direct checkout.
          </p>
        </header>

        {role === "admin" && (
          <section aria-label="Quick actions" className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { href: "/admin/payments", label: "Payment Methods", icon: "payments" as const, note: "Configure payment options" },
              { href: "/admin/orders", label: "Manage Orders", icon: "orders" as const, note: "Review and process orders" },
              { href: "/admin/affiliates", label: "Affiliate Accounts", icon: "affiliates" as const, note: "Manage partner accounts" },
              { href: "/admin/users", label: "Manage Users", icon: "customers" as const, note: "View customer accounts" },
            ].map((action) => (
              <Link key={action.href} href={action.href} className="group flex min-h-[92px] items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(15,55,42,0.45)] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 transition group-hover:bg-[#0a5748] group-hover:text-white"><AdminIcon name={action.icon} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-slate-900">{action.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{action.note}</span>
                </span>
                <span className="ml-auto text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-700">→</span>
              </Link>
            ))}
          </section>
        )}

        {role === "admin" && (
          <section aria-label="Catalog overview" className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(15,55,42,0.45)]">
              <p className="text-sm text-slate-600">Total Products</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">{products.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(15,55,42,0.45)]">
              <p className="text-sm text-slate-600">Published Products</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">{products.filter((product) => product.is_published && !product.archived_at).length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(15,55,42,0.45)]">
              <p className="text-sm text-slate-600">Draft Products</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">{products.filter((product) => !product.is_published && !product.archived_at).length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(15,55,42,0.45)]">
              <p className="text-sm text-slate-600">Active Affiliate Links</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">{links.filter((link) => link.is_active).length}</p>
            </div>
          </section>
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
          className="mt-7 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_-18px_rgba(15,55,42,0.22)] sm:p-7"
        >
          <h2 className="text-xl font-bold">Product Catalog</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Published and categorized products appear in the public catalog. Affiliate product prices are not treated as verified current prices. For direct-sale products,
            enter a verified selling price.
          </p>

          {role === "admin" && (
            <details className="mt-5 rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer font-bold text-emerald-900">
                Add a Product to Catalog
              </summary>
              <div className="mt-4">
                <ProductForm
                  idPrefix="new-product"
                  productTypes={productTypes}
                  categoryOptions={categoryOptions}
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
                Search name, slug, category, author, publisher, or description
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
                Product Type
              </label>
              <select
                id="admin-product-type"
                name="productTypeFilter"
                defaultValue={productTypeFilter}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
              >
                <option value="all">All Types</option>
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
                Archive Status
              </label>
              <select
                id="admin-product-archive"
                name="archivedFilter"
                defaultValue={archivedFilter}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
              >
                <option value="all">All Products</option>
                <option value="active">Not Archived</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="admin-product-publication"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Publication Status
              </label>
              <select
                id="admin-product-publication"
                name="publicationFilter"
                defaultValue={publicationFilter}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <button
              type="submit"
              className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              Apply Filters
            </button>
            {hasProductFilters && (
              <Link
                href="/admin#product-catalog"
                className="min-h-11 content-center text-sm font-semibold text-emerald-800 underline underline-offset-2 sm:col-span-full"
              >
                Clear Filters
              </Link>
            )}
          </form>

          <p aria-live="polite" className="mt-4 text-sm text-slate-600">
            Showing {filteredProducts.length} products · {products.length} total
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {productGroups.map(({ slug, title, entries }) => (
              <section key={slug} aria-label={`${title} catalog`}>
                <h3 className="font-bold">
                  {title} · {entries.length}
                </h3>
                {entries.length === 0 ? (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-600">
                    {hasProductFilters
                      ? `No ${title} match the selected filters.`
                      : `No ${title} have been added yet.`}
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
                              ? "Archived"
                              : product.is_published
                                ? "Published"
                                : "Draft"}
                            {product.commerce_mode
                              ? ` · ${
                                  product.commerce_mode === "affiliate"
                                    ? "affiliate"
                                    : "Direct sale"
                                }`
                              : " · Sales type required"}
                          </span>
                        </div>
                        <article
                          aria-label={`${product.title} product preview`}
                          className="mt-3 flex max-w-sm gap-3 rounded-xl border border-slate-200 bg-white p-3"
                        >
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={`${product.title} cover image`}
                              width={72}
                              height={96}
                              unoptimized
                              className="h-24 w-[4.5rem] shrink-0 rounded-lg bg-slate-100 object-cover"
                            />
                          ) : (
                            <div
                              role="img"
                              aria-label={`${product.title} image unavailable`}
                              className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center rounded-lg bg-emerald-50 px-1 text-center text-xs text-emerald-900"
                            >
                              No image
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
                                Edit
                              </summary>
                              <div className="mt-4">
                                <ProductForm
                                  product={product}
                                  idPrefix={`product-${product.id}`}
                                  productTypes={productTypes}
                                  categoryOptions={categoryOptions}
                                  selectedCategoryIds={
                                    selectedByProduct.get(product.id) ?? []
                                  }
                                  primaryCategoryId={
                                    primaryByProduct.get(product.id) ?? ""
                                  }
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
                                  ? "Restore from Archive"
                                  : "Archive Product"}
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
          <section className="mt-7 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_-18px_rgba(15,55,42,0.22)] sm:p-7">
            <h2 className="text-xl font-bold">Add Product Type</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              New types become available in product forms. Types already in use
              cannot be deleted.
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
                  Type Name
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
                Add Type
              </button>
            </form>
          </section>
        )}

        <section className="mt-7 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_-18px_rgba(15,55,42,0.22)] sm:p-7">
          <h2 className="text-xl font-bold">Create Affiliate Link</h2>
          {affiliateProducts.length === 0 ? (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 leading-6 text-amber-900">
              First, save a product with the Affiliate sales mode.
            </p>
          ) : (
            <form action={saveAffiliateLink} className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="new-product"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Product
                  </label>
                  <select
                    id="new-product"
                    name="productId"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                  >
                    <option value="" disabled>
                      Select a product
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
                    Affiliate Partner
                  </label>
                  <select
                    id="new-partner"
                    name="partner"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                  >
                    <option value="" disabled>
                      Select a partner
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
                  Approved Affiliate URL (HTTPS)
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
                Create Link
              </button>
            </form>
          )}
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Saved Affiliate Links</h2>
              <p className="mt-1 text-sm text-slate-600">
                {links.length} links total
              </p>
            </div>
          </div>

          {links.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-slate-600">
              No affiliate links have been created yet.
            </p>
          ) : (
            <ul className="mt-4 grid gap-4">
              {links.map((link) => {
                const partnerName = getPartnerName(link.partner);

                return (
                  <li
                    key={link.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(15,55,42,0.45)] sm:p-6"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold">
                          {link.products?.[0]?.title ?? "Product not found"}
                        </h3>
                        <p className="mt-1 break-all text-sm text-slate-600">
                          {partnerName ?? "Select a partner"} · {link.url}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-bold ${
                          link.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {link.is_active ? "Active" : "Inactive"}
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
                            Products
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
                                  ? "Course"
                                  : "Book"}
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
                            Affiliate Partner
                          </label>
                          <select
                            id={`partner-${link.id}`}
                            name="partner"
                            required
                            defaultValue={link.partner ?? ""}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                          >
                            <option value="" disabled>
                              Select a partner
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
                          Save Changes
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
                        {link.is_active ? "Deactivate" : "Activate"}
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
        <main lang="en" className="min-h-screen bg-[#f3f7f5] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
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
